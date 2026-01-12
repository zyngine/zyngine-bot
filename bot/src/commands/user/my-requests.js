const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { RoleRequest } = require('../../schemas');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-requests')
    .setDescription('View your role requests')
    .addStringOption(option => option.setName('status').setDescription('Filter by status').setRequired(false)
      .addChoices({ name: 'All', value: 'all' }, { name: 'Pending', value: 'pending' }, { name: 'Approved', value: 'approved' }, { name: 'Denied', value: 'denied' })),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const statusFilter = interaction.options.getString('status') || 'all';
    const query = { guildId: interaction.guild.id, odId: interaction.user.id };
    if (statusFilter !== 'all') query.status = statusFilter;

    const requests = await RoleRequest.find(query).sort({ createdAt: -1 }).limit(10);
    if (requests.length === 0) return interaction.editReply({ embeds: [errorEmbed('No Requests', 'You have no role requests matching this filter.')] });

    const embed = new EmbedBuilder().setColor(COLORS.PRIMARY).setTitle('📋 Your Role Requests').setTimestamp();
    for (const request of requests) {
      const statusEmoji = { pending: '⏳', approved: '✅', denied: '❌', cancelled: '🚫' }[request.status] || '❓';
      embed.addFields({ name: `${request.roleName} • #${request._id.toString().slice(-6).toUpperCase()}`, value: `**Status:** ${statusEmoji} ${request.status}\n**Requested:** <t:${Math.floor(request.createdAt.getTime() / 1000)}:R>` });
    }
    return interaction.editReply({ embeds: [embed] });
  }
};
