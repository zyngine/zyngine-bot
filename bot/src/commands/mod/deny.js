const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { RoleRequest, Guild, ActivityLog } = require('../../schemas');
const { successEmbed, errorEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Deny a role request')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName('request-id').setDescription('The request ID').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for denial').setRequired(false)),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const requestIdInput = interaction.options.getString('request-id').toUpperCase();
    const reason = interaction.options.getString('reason');
    const requests = await RoleRequest.find({ guildId: interaction.guild.id, status: 'pending' });
    const request = requests.find(r => r._id.toString().slice(-6).toUpperCase() === requestIdInput || r._id.toString() === requestIdInput);

    if (!request) return interaction.editReply({ embeds: [errorEmbed('Not Found', `No pending request with ID \`${requestIdInput}\`.`)] });

    request.status = 'denied';
    request.resolvedBy = interaction.user.id;
    request.resolvedByUsername = interaction.user.tag;
    request.resolvedAt = new Date();
    request.resolutionReason = reason;
    await request.save();

    await ActivityLog.create({ guildId: interaction.guild.id, action: 'role_denied', targetUserId: request.userId, targetUsername: request.username, performedBy: interaction.user.id, performedByUsername: interaction.user.tag, roleId: request.roleId, roleName: request.roleName });

    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildConfig?.notifications?.denialDMEnabled) {
      const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
      if (member) await member.send({ embeds: [errorEmbed('Role Request Denied', `Your request for **${request.roleName}** has been denied.${reason ? `\n\n**Reason:** ${reason}` : ''}`)] }).catch(() => {});
    }

    return interaction.editReply({ content: `❌ Denied request \`#${requestIdInput}\``, embeds: [roleRequestEmbed(request, 'denied')] });
  }
};
