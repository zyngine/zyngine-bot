const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { RoleRequest } = require('../../schemas');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pending')
    .setDescription('View pending role requests')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const requests = await RoleRequest.find({ guildId: interaction.guild.id, status: 'pending' }).sort({ createdAt: -1 }).limit(15);

    if (requests.length === 0) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.SUCCESS).setTitle('✅ No Pending Requests').setDescription('All role requests have been processed!').setTimestamp()] });
    }

    const embed = new EmbedBuilder().setColor(COLORS.PRIMARY).setTitle('📋 Pending Role Requests').setDescription(`${requests.length} pending requests`).setFooter({ text: 'Use /approve or /deny to process' }).setTimestamp();

    for (const request of requests) {
      const requestId = request._id.toString().slice(-6).toUpperCase();
      embed.addFields({ name: `#${requestId}`, value: `**User:** <@${request.userId}>\n**Role:** ${request.roleName}\n**Requested:** <t:${Math.floor(request.createdAt.getTime() / 1000)}:R>`, inline: true });
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
