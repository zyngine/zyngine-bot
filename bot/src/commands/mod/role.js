const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild, ActivityLog, TempRole } = require('../../../../shared/schemas');
const { successEmbed, errorEmbed, COLORS } = require('../../utils/embeds');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    
    // /role give
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give a role to a user')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to give the role to').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to give').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for giving the role').setRequired(false)
        )
    )
    
    // /role remove
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to remove the role from').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to remove').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for removing the role').setRequired(false)
        )
    )
    
    // /role temp
    .addSubcommand(subcommand =>
      subcommand
        .setName('temp')
        .setDescription('Give a temporary role that expires')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to give the role to').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to give').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration').setDescription('Duration (e.g., 1h, 1d, 1w)').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for giving the role').setRequired(false)
        )
    )
    
    // /role give-multiple
    .addSubcommand(subcommand =>
      subcommand
        .setName('give-multiple')
        .setDescription('Give a role to multiple users')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to give').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('users').setDescription('User mentions or IDs (space separated)').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for giving the role').setRequired(false)
        )
    )
    
    // /role remove-multiple
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-multiple')
        .setDescription('Remove a role from multiple users')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to remove').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('users').setDescription('User mentions or IDs (space separated)').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('Reason for removing the role').setRequired(false)
        )
    )
    
    // /role swap
    .addSubcommand(subcommand =>
      subcommand
        .setName('swap')
        .setDescription('Swap one role for another on a user')
        .addUserOption(option =>
          option.setName('user').setDescription('The user').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('old-role').setDescription('The role to remove').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('new-role').setDescription('The role to add').setRequired(true)
        )
    )
    
    // /role list
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all roles a user has')
        .addUserOption(option =>
          option.setName('user').setDescription('The user to check').setRequired(true)
        )
    )
    
    // /role info
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get information about a role')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to get info about').setRequired(true)
        )
    )
    
    // /role members
    .addSubcommand(subcommand =>
      subcommand
        .setName('members')
        .setDescription('List all members with a role')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to check').setRequired(true)
        )
    ),

  cooldown: 3,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Permission check helper
    const canManageRole = (role) => {
      const botMember = interaction.guild.members.me;
      const memberHighest = interaction.member.roles.highest;
      
      if (role.position >= botMember.roles.highest.position) {
        return { allowed: false, reason: 'This role is higher than or equal to my highest role.' };
      }
      if (role.position >= memberHighest.position && interaction.guild.ownerId !== interaction.user.id) {
        return { allowed: false, reason: 'This role is higher than or equal to your highest role.' };
      }
      if (role.managed) {
        return { allowed: false, reason: 'This role is managed by an integration.' };
      }
      return { allowed: true };
    };

    switch (subcommand) {
      case 'give': {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const check = canManageRole(role);
        if (!check.allowed) {
          return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
        }

        if (member.roles.cache.has(role.id)) {
          return interaction.editReply({ embeds: [errorEmbed('Already Has Role', `${user} already has the ${role} role.`)] });
        }

        await member.roles.add(role, `${interaction.user.tag}: ${reason}`);

        await ActivityLog.create({
          guildId: interaction.guild.id,
          action: 'role_given',
          targetUserId: user.id,
          targetUsername: user.tag,
          performedBy: interaction.user.id,
          performedByUsername: interaction.user.tag,
          roleId: role.id,
          roleName: role.name,
          details: { reason }
        });

        return interaction.editReply({
          embeds: [successEmbed('Role Given', `Successfully gave ${role} to ${user}.\n**Reason:** ${reason}`)]
        });
      }

      case 'remove': {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const check = canManageRole(role);
        if (!check.allowed) {
          return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
        }

        if (!member.roles.cache.has(role.id)) {
          return interaction.editReply({ embeds: [errorEmbed('Does Not Have Role', `${user} does not have the ${role} role.`)] });
        }

        await member.roles.remove(role, `${interaction.user.tag}: ${reason}`);

        await ActivityLog.create({
          guildId: interaction.guild.id,
          action: 'role_removed',
          targetUserId: user.id,
          targetUsername: user.tag,
          performedBy: interaction.user.id,
          performedByUsername: interaction.user.tag,
          roleId: role.id,
          roleName: role.name,
          details: { reason }
        });

        return interaction.editReply({
          embeds: [successEmbed('Role Removed', `Successfully removed ${role} from ${user}.\n**Reason:** ${reason}`)]
        });
      }

      case 'temp': {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Temporary role';
        
        const duration = ms(durationStr);
        if (!duration || duration < 60000 || duration > 30 * 24 * 60 * 60 * 1000) {
          return interaction.editReply({
            embeds: [errorEmbed('Invalid Duration', 'Please provide a valid duration between 1 minute and 30 days (e.g., 1h, 1d, 1w).')]
          });
        }

        const check = canManageRole(role);
        if (!check.allowed) {
          return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
        }

        await member.roles.add(role, `Temp role by ${interaction.user.tag}: ${reason}`);

        const expiresAt = new Date(Date.now() + duration);
        
        await TempRole.create({
          guildId: interaction.guild.id,
          userId: user.id,
          roleId: role.id,
          roleName: role.name,
          givenBy: interaction.user.id,
          givenByUsername: interaction.user.tag,
          expiresAt
        });

        await ActivityLog.create({
          guildId: interaction.guild.id,
          action: 'role_temp_given',
          targetUserId: user.id,
          targetUsername: user.tag,
          performedBy: interaction.user.id,
          performedByUsername: interaction.user.tag,
          roleId: role.id,
          roleName: role.name,
          details: { reason, duration: durationStr, expiresAt }
        });

        return interaction.editReply({
          embeds: [successEmbed(
            'Temporary Role Given',
            `Successfully gave ${role} to ${user}.\n**Duration:** ${durationStr}\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>\n**Reason:** ${reason}`
          )]
        });
      }

      case 'give-multiple':
      case 'remove-multiple': {
        await interaction.deferReply();
        
        const role = interaction.options.getRole('role');
        const usersStr = interaction.options.getString('users');
        const reason = interaction.options.getString('reason') || 'Bulk role management';
        const isGive = subcommand === 'give-multiple';
        
        const check = canManageRole(role);
        if (!check.allowed) {
          return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
        }

        // Parse user IDs from mentions or raw IDs
        const userIds = usersStr.match(/\d{17,19}/g) || [];
        if (userIds.length === 0) {
          return interaction.editReply({ embeds: [errorEmbed('No Users', 'Could not find any valid user mentions or IDs.')] });
        }

        let success = 0;
        let failed = 0;

        for (const userId of userIds) {
          try {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
              failed++;
              continue;
            }

            if (isGive) {
              if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role, `Bulk add by ${interaction.user.tag}`);
                success++;
              }
            } else {
              if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role, `Bulk remove by ${interaction.user.tag}`);
                success++;
              }
            }
          } catch (e) {
            failed++;
          }
        }

        await ActivityLog.create({
          guildId: interaction.guild.id,
          action: isGive ? 'role_given' : 'role_removed',
          performedBy: interaction.user.id,
          performedByUsername: interaction.user.tag,
          roleId: role.id,
          roleName: role.name,
          details: { bulk: true, success, failed, reason }
        });

        return interaction.editReply({
          embeds: [successEmbed(
            isGive ? 'Roles Given' : 'Roles Removed',
            `**Role:** ${role}\n**Successful:** ${success}\n**Failed:** ${failed}\n**Reason:** ${reason}`
          )]
        });
      }

      case 'swap': {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const oldRole = interaction.options.getRole('old-role');
        const newRole = interaction.options.getRole('new-role');
        
        for (const role of [oldRole, newRole]) {
          const check = canManageRole(role);
          if (!check.allowed) {
            return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', `${role.name}: ${check.reason}`)] });
          }
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
          return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
        }

        await member.roles.remove(oldRole, `Role swap by ${interaction.user.tag}`);
        await member.roles.add(newRole, `Role swap by ${interaction.user.tag}`);

        await ActivityLog.create({
          guildId: interaction.guild.id,
          action: 'role_given',
          targetUserId: user.id,
          targetUsername: user.tag,
          performedBy: interaction.user.id,
          performedByUsername: interaction.user.tag,
          roleId: newRole.id,
          roleName: newRole.name,
          details: { swap: true, oldRoleId: oldRole.id, oldRoleName: oldRole.name }
        });

        return interaction.editReply({
          embeds: [successEmbed('Roles Swapped', `Successfully swapped ${oldRole} → ${newRole} for ${user}.`)]
        });
      }

      case 'list': {
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
          return interaction.reply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')], ephemeral: true });
        }

        const roles = member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString());

        const embed = new EmbedBuilder()
          .setColor(member.displayHexColor || COLORS.PRIMARY)
          .setTitle(`Roles for ${member.user.tag}`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setDescription(roles.length > 0 ? roles.join(' ') : 'No roles')
          .addFields({ name: 'Total Roles', value: roles.length.toString(), inline: true })
          .setFooter({ text: 'Zyngine Bot' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      case 'info': {
        const role = interaction.options.getRole('role');
        const membersWithRole = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;

        const embed = new EmbedBuilder()
          .setColor(role.hexColor || COLORS.PRIMARY)
          .setTitle(`Role Info: ${role.name}`)
          .addFields(
            { name: 'ID', value: `\`${role.id}\``, inline: true },
            { name: 'Color', value: role.hexColor || 'Default', inline: true },
            { name: 'Position', value: role.position.toString(), inline: true },
            { name: 'Members', value: membersWithRole.toString(), inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
            { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
            { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
            { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setFooter({ text: 'Zyngine Bot' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      case 'members': {
        await interaction.deferReply();
        
        const role = interaction.options.getRole('role');
        const members = interaction.guild.members.cache
          .filter(m => m.roles.cache.has(role.id))
          .map(m => m.user.tag)
          .sort();

        if (members.length === 0) {
          return interaction.editReply({ embeds: [errorEmbed('No Members', 'No members have this role.')] });
        }

        const embed = new EmbedBuilder()
          .setColor(role.hexColor || COLORS.PRIMARY)
          .setTitle(`Members with ${role.name}`)
          .setDescription(members.length <= 50 
            ? members.map(m => `\`${m}\``).join(', ')
            : members.slice(0, 50).map(m => `\`${m}\``).join(', ') + `\n\n... and ${members.length - 50} more`
          )
          .addFields({ name: 'Total', value: members.length.toString(), inline: true })
          .setFooter({ text: 'Zyngine Bot' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }
    }
  }
};
