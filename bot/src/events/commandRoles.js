const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../schemas');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Check if message starts with $
    if (!message.content.startsWith('$')) return;

    // Parse command
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    try {
      // Get guild config
      const guildConfig = await Guild.findOne({ guildId: message.guild.id });
      if (!guildConfig?.commandRoles?.length) return;

      // Find matching command role
      const commandRole = guildConfig.commandRoles.find(
        cr => cr.command.toLowerCase() === commandName && cr.enabled
      );
      if (!commandRole) return;

      // Get target user (mentioned user or self)
      let targetUser = message.mentions.members.first();
      const isSelfAssign = !targetUser;

      if (isSelfAssign) {
        targetUser = message.member;
      }

      // Permission checks
      const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageRoles);
      const hasAllowedRole = commandRole.allowedRoles?.length === 0 ||
        commandRole.allowedRoles?.some(roleId => message.member.roles.cache.has(roleId));

      // Check if user can use this command
      if (commandRole.staffOnly && !isStaff) {
        return message.reply({
          embeds: [createEmbed('error', 'This command is staff-only.')],
          allowedMentions: { repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }

      if (!hasAllowedRole && !isStaff) {
        return message.reply({
          embeds: [createEmbed('error', 'You do not have permission to use this command.')],
          allowedMentions: { repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }

      // Check if self-assign is allowed
      if (isSelfAssign && !commandRole.selfAssign && !isStaff) {
        return message.reply({
          embeds: [createEmbed('error', 'You cannot assign this role to yourself. Mention a user.')],
          allowedMentions: { repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }

      // Get the role
      const role = message.guild.roles.cache.get(commandRole.roleId);
      if (!role) {
        return message.reply({
          embeds: [createEmbed('error', 'The configured role no longer exists.')],
          allowedMentions: { repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }

      // Check if bot can manage this role
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({
          embeds: [createEmbed('error', 'I cannot manage this role (it\'s higher than my highest role).')],
          allowedMentions: { repliedUser: false }
        }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }

      // Toggle or add role
      const hasRole = targetUser.roles.cache.has(role.id);

      if (hasRole && commandRole.removeOnReuse) {
        // Remove role (toggle off)
        await targetUser.roles.remove(role, `Command role removed by ${message.author.tag}`);

        await message.reply({
          embeds: [createEmbed('success', `Removed **${role.name}** from ${targetUser}.`)],
          allowedMentions: { repliedUser: false }
        });
      } else if (hasRole) {
        // Already has role
        await message.reply({
          embeds: [createEmbed('info', `${targetUser} already has the **${role.name}** role.`)],
          allowedMentions: { repliedUser: false }
        });
      } else {
        // Add role
        await targetUser.roles.add(role, `Command role given by ${message.author.tag}`);

        await message.reply({
          embeds: [createEmbed('success', `Gave **${role.name}** to ${targetUser}.`)],
          allowedMentions: { repliedUser: false }
        });
      }

      // Delete command message after a delay
      setTimeout(() => message.delete().catch(() => {}), 1000);

    } catch (error) {
      console.error('Error handling command role:', error);
    }
  }
};

function createEmbed(type, description) {
  const colors = {
    success: '#43B581',
    error: '#F04747',
    info: '#5865F2'
  };

  const emojis = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  return new EmbedBuilder()
    .setColor(colors[type] || colors.info)
    .setDescription(`${emojis[type] || ''} ${description}`)
    .setTimestamp();
}
