const { Guild, ActivityLog } = require('../schemas');
const { successEmbed, errorEmbed } = require('./embeds');

async function handleButtonRole(interaction, roleId) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { member, guild } = interaction;
    const role = guild.roles.cache.get(roleId);

    if (!role) return interaction.editReply({ embeds: [errorEmbed('Role Not Found', 'This role no longer exists.')] });

    const botMember = guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({ embeds: [errorEmbed('Permission Error', 'I cannot manage this role.')] });
    }

    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
      await member.roles.remove(role, 'Button role removal');
      await ActivityLog.create({ guildId: guild.id, action: 'buttonrole_removed', targetUserId: member.id, targetUsername: member.user.tag, roleId, roleName: role.name });
      return interaction.editReply({ embeds: [successEmbed('Role Removed', `The **${role.name}** role has been removed.`)] });
    } else {
      await member.roles.add(role, 'Button role assignment');
      await ActivityLog.create({ guildId: guild.id, action: 'buttonrole_given', targetUserId: member.id, targetUsername: member.user.tag, roleId, roleName: role.name });
      return interaction.editReply({ embeds: [successEmbed('Role Added', `You now have the **${role.name}** role!`)] });
    }
  } catch (error) {
    console.error('Error handling button role:', error);
    return interaction.editReply({ embeds: [errorEmbed('Error', 'An error occurred.')] });
  }
}

module.exports = { handleButtonRole };
