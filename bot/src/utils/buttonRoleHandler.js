const { Guild, ActivityLog } = require('../../../shared/schemas');
const { successEmbed, errorEmbed } = require('./embeds');

async function handleButtonRole(interaction, roleId) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const { member, guild } = interaction;
    const role = guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.editReply({
        embeds: [errorEmbed('Role Not Found', 'This role no longer exists.')]
      });
    }

    // Check if bot can manage this role
    const botMember = guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [errorEmbed('Permission Error', 'I cannot manage this role as it is higher than my highest role.')]
      });
    }

    // Toggle the role
    const hasRole = member.roles.cache.has(roleId);
    
    if (hasRole) {
      await member.roles.remove(role, 'Button role removal');
      
      await ActivityLog.create({
        guildId: guild.id,
        action: 'buttonrole_removed',
        targetUserId: member.id,
        targetUsername: member.user.tag,
        roleId: roleId,
        roleName: role.name
      });

      return interaction.editReply({
        embeds: [successEmbed('Role Removed', `The **${role.name}** role has been removed.`)]
      });
    } else {
      await member.roles.add(role, 'Button role assignment');
      
      await ActivityLog.create({
        guildId: guild.id,
        action: 'buttonrole_given',
        targetUserId: member.id,
        targetUsername: member.user.tag,
        roleId: roleId,
        roleName: role.name
      });

      return interaction.editReply({
        embeds: [successEmbed('Role Added', `You now have the **${role.name}** role!`)]
      });
    }

  } catch (error) {
    console.error('Error handling button role:', error);
    return interaction.editReply({
      embeds: [errorEmbed('Error', 'An error occurred while managing your role.')]
    });
  }
}

async function handleReactionRole(reaction, user, added) {
  try {
    if (user.bot) return;

    const { message, emoji } = reaction;
    const guild = message.guild;

    const guildConfig = await Guild.findOne({ guildId: guild.id });
    if (!guildConfig) return;

    const reactionRoleConfig = guildConfig.reactionRoles?.find(
      rr => rr.messageId === message.id
    );

    if (!reactionRoleConfig) return;

    const emojiKey = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji.name;
    const roleConfig = reactionRoleConfig.roles.find(
      r => r.emoji === emojiKey || r.emoji === emoji.name
    );

    if (!roleConfig) return;

    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(roleConfig.roleId);

    if (!role) return;

    // Check bot permissions
    const botMember = guild.members.me;
    if (role.position >= botMember.roles.highest.position) return;

    if (added) {
      // Handle different modes
      if (reactionRoleConfig.mode === 'unique') {
        // Remove other roles from this message first
        for (const rc of reactionRoleConfig.roles) {
          if (rc.roleId !== roleConfig.roleId && member.roles.cache.has(rc.roleId)) {
            await member.roles.remove(rc.roleId, 'Reaction role (unique mode)');
          }
        }
      }

      if (reactionRoleConfig.mode === 'verify') {
        // In verify mode, remove the reaction after adding role
        await reaction.users.remove(user.id);
      }

      await member.roles.add(role, 'Reaction role');

      await ActivityLog.create({
        guildId: guild.id,
        action: 'reactionrole_given',
        targetUserId: user.id,
        targetUsername: user.tag,
        roleId: role.id,
        roleName: role.name
      });

    } else {
      // Role removal (only in normal mode)
      if (reactionRoleConfig.mode !== 'verify') {
        await member.roles.remove(role, 'Reaction role removal');

        await ActivityLog.create({
          guildId: guild.id,
          action: 'reactionrole_removed',
          targetUserId: user.id,
          targetUsername: user.tag,
          roleId: role.id,
          roleName: role.name
        });
      }
    }

  } catch (error) {
    console.error('Error handling reaction role:', error);
  }
}

module.exports = {
  handleButtonRole,
  handleReactionRole
};
