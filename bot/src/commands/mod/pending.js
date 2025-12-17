const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { RoleRequest } = require('../../../../shared/schemas');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pending')
    .setDescription('View pending role requests')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number')
        .setRequired(false)
        .setMinValue(1)
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply();

    const page = interaction.options.getInteger('page') || 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;

    const [requests, totalCount] = await Promise.all([
      RoleRequest.find({
        guildId: interaction.guild.id,
        status: 'pending'
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage),
      RoleRequest.countDocuments({
        guildId: interaction.guild.id,
        status: 'pending'
      })
    ]);

    if (requests.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.SUCCESS)
          .setTitle('✅ No Pending Requests')
          .setDescription('All role requests have been processed!')
          .setFooter({ text: 'Zyngine Bot' })
          .setTimestamp()
        ]
      });
    }

    const totalPages = Math.ceil(totalCount / perPage);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('📋 Pending Role Requests')
      .setDescription(`Showing ${requests.length} of ${totalCount} pending requests`)
      .setFooter({ text: `Page ${page}/${totalPages} • Use /approve or /deny to process` })
      .setTimestamp();

    for (const request of requests) {
      const requestId = request._id.toString().slice(-6).toUpperCase();
      const role = interaction.guild.roles.cache.get(request.roleId);
      const roleName = role ? role.name : request.roleName || 'Unknown Role';
      
      let value = `**User:** <@${request.userId}>\n**Role:** ${roleName}\n**Requested:** <t:${Math.floor(request.createdAt.getTime() / 1000)}:R>`;
      
      if (request.reason) {
        value += `\n**Reason:** ${request.reason.substring(0, 100)}${request.reason.length > 100 ? '...' : ''}`;
      }

      if (!request.requirementsMet) {
        value += `\n⚠️ Requirements not met`;
      }

      embed.addFields({
        name: `#${requestId}`,
        value,
        inline: true
      });
    }

    const components = [];
    
    if (totalPages > 1) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`pending_page:${page - 1}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId(`pending_page:${page + 1}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages)
        );
      components.push(row);
    }

    return interaction.editReply({ embeds: [embed], components });
  }
};
