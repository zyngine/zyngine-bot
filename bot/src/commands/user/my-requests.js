const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { RoleRequest } = require('../../../../shared/schemas');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-requests')
    .setDescription('View your role requests')
    .addStringOption(option =>
      option
        .setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Pending', value: 'pending' },
          { name: 'Approved', value: 'approved' },
          { name: 'Denied', value: 'denied' },
          { name: 'Cancelled', value: 'cancelled' }
        )
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const statusFilter = interaction.options.getString('status') || 'all';
    
    const query = {
      guildId: interaction.guild.id,
      userId: interaction.user.id
    };

    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const requests = await RoleRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(10);

    if (requests.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed('No Requests', 'You have no role requests matching this filter.')]
      });
    }

    const statusEmoji = {
      pending: '⏳',
      approved: '✅',
      denied: '❌',
      cancelled: '🚫',
      expired: '⏰'
    };

    const statusColors = {
      pending: COLORS.PENDING,
      approved: COLORS.SUCCESS,
      denied: COLORS.ERROR,
      cancelled: COLORS.WARNING,
      expired: COLORS.WARNING
    };

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('📋 Your Role Requests')
      .setDescription(`Showing your ${statusFilter === 'all' ? 'recent' : statusFilter} requests`)
      .setFooter({ text: 'Zyngine Bot' })
      .setTimestamp();

    for (const request of requests) {
      const role = interaction.guild.roles.cache.get(request.roleId);
      const roleName = role ? role.name : request.roleName || 'Unknown Role';
      
      let value = `**Status:** ${statusEmoji[request.status]} ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`;
      value += `\n**Requested:** <t:${Math.floor(request.createdAt.getTime() / 1000)}:R>`;
      
      if (request.resolvedAt) {
        value += `\n**Resolved:** <t:${Math.floor(request.resolvedAt.getTime() / 1000)}:R>`;
        if (request.resolvedByUsername) {
          value += ` by ${request.resolvedByUsername}`;
        }
      }

      if (request.reason) {
        value += `\n**Reason:** ${request.reason.substring(0, 100)}${request.reason.length > 100 ? '...' : ''}`;
      }

      embed.addFields({
        name: `${roleName} • \`#${request._id.toString().slice(-6).toUpperCase()}\``,
        value,
        inline: false
      });
    }

    // Add summary
    const allRequests = await RoleRequest.find({
      guildId: interaction.guild.id,
      userId: interaction.user.id
    });

    const summary = {
      total: allRequests.length,
      pending: allRequests.filter(r => r.status === 'pending').length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      denied: allRequests.filter(r => r.status === 'denied').length
    };

    embed.addFields({
      name: '📊 Summary',
      value: `Total: ${summary.total} | Pending: ${summary.pending} | Approved: ${summary.approved} | Denied: ${summary.denied}`,
      inline: false
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
