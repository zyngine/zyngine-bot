const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { RoleRequest, Guild, ActivityLog } = require('../../schemas');
const { successEmbed, errorEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a role request')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o.setName('request-id').setDescription('The request ID').setRequired(true)),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const requestIdInput = interaction.options.getString('request-id').toUpperCase();
    const requests = await RoleRequest.find({ guildId: interaction.guild.id, status: 'pending' });
    const request = requests.find(r => r._id.toString().slice(-6).toUpperCase() === requestIdInput || r._id.toString() === requestIdInput);

    if (!request) return interaction.editReply({ embeds: [errorEmbed('Not Found', `No pending request with ID \`${requestIdInput}\`.`)] });

    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
    const role = interaction.guild.roles.cache.get(request.roleId);
    if (!member) return interaction.editReply({ embeds: [errorEmbed('Member Left', 'The member has left the server.')] });
    if (!role) return interaction.editReply({ embeds: [errorEmbed('Role Gone', 'The role no longer exists.')] });

    await member.roles.add(role, `Approved by ${interaction.user.tag}`);
    request.status = 'approved';
    request.resolvedBy = interaction.user.id;
    request.resolvedByUsername = interaction.user.tag;
    request.resolvedAt = new Date();
    await request.save();

    await ActivityLog.create({ guildId: interaction.guild.id, action: 'role_approved', targetUserId: request.userId, targetUsername: request.username, performedBy: interaction.user.id, performedByUsername: interaction.user.tag, roleId: request.roleId, roleName: request.roleName });

    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildConfig?.notifications?.approvalDMEnabled) {
      await member.send({ embeds: [successEmbed('Role Request Approved!', `Your request for **${role.name}** has been approved!`)] }).catch(() => {});
    }

    return interaction.editReply({ content: `✅ Approved request \`#${requestIdInput}\``, embeds: [roleRequestEmbed(request, 'approved')] });
  }
};
