const { EmbedBuilder } = require('discord.js');
const { Guild, ActivityLog, UserStats } = require('../../../shared/schemas');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      // Get guild config
      const guildConfig = await Guild.findOne({ guildId: member.guild.id });
      
      if (!guildConfig || !guildConfig.autoRoles || guildConfig.autoRoles.length === 0) {
        return;
      }

      // Check if member is a bot and if we should ignore bots
      const shouldIgnoreBots = guildConfig.autoRoles.some(ar => ar.ignoreBots);
      if (member.user.bot && shouldIgnoreBots) {
        return;
      }

      const assignedRoles = [];
      const failedRoles = [];

      for (const autoRole of guildConfig.autoRoles) {
        if (!autoRole.enabled) continue;

        // Check minimum account age
        if (autoRole.minAccountAge > 0) {
          const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
          if (accountAge < autoRole.minAccountAge) {
            failedRoles.push({
              role: autoRole.roleName || autoRole.roleId,
              reason: `Account age (${Math.floor(accountAge)} days) is less than required (${autoRole.minAccountAge} days)`
            });
            continue;
          }
        }

        // Apply delay if configured
        const assignRole = async () => {
          try {
            const role = member.guild.roles.cache.get(autoRole.roleId);
            
            if (!role) {
              console.warn(`Auto-role ${autoRole.roleId} not found in guild ${member.guild.id}`);
              return;
            }

            // Check bot permissions
            const botMember = member.guild.members.me;
            if (!botMember.permissions.has('ManageRoles')) {
              console.warn(`Missing ManageRoles permission in guild ${member.guild.id}`);
              return;
            }

            if (role.position >= botMember.roles.highest.position) {
              console.warn(`Cannot assign role ${role.name} - higher than bot's highest role`);
              return;
            }

            await member.roles.add(role, 'Auto-role on join');
            assignedRoles.push(role.name);

            // Log the action
            await ActivityLog.create({
              guildId: member.guild.id,
              action: 'autorole_given',
              targetUserId: member.id,
              targetUsername: member.user.tag,
              performedBy: 'system',
              roleId: role.id,
              roleName: role.name,
              details: { trigger: 'member_join' }
            });

          } catch (error) {
            console.error(`Failed to assign auto-role:`, error);
          }
        };

        if (autoRole.delay > 0) {
          setTimeout(assignRole, autoRole.delay * 1000);
        } else {
          await assignRole();
        }
      }

      // Create or update user stats
      await UserStats.findOneAndUpdate(
        { guildId: member.guild.id, odId: member.id },
        { 
          $setOnInsert: { 
            guildId: member.guild.id, 
            odId: member.id,
            messageCount: 0 
          },
          $set: { joinedAt: member.joinedAt || new Date() }
        },
        { upsert: true }
      );

      // Send welcome DM if enabled
      if (guildConfig.welcomeMessage?.enabled && assignedRoles.length > 0) {
        try {
          const message = guildConfig.welcomeMessage.message
            .replace(/{server}/g, member.guild.name)
            .replace(/{user}/g, member.user.username)
            .replace(/{roles}/g, assignedRoles.join(', '))
            .replace(/{memberCount}/g, member.guild.memberCount.toString());

          const welcomeEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(message)
            .setThumbnail(member.guild.iconURL({ dynamic: true }))
            .addFields({
              name: 'Roles Assigned',
              value: assignedRoles.map(r => `\`${r}\``).join(', '),
              inline: true
            })
            .setFooter({ text: 'Powered by Zyngine Bot' })
            .setTimestamp();

          await member.send({ embeds: [welcomeEmbed] });
        } catch (error) {
          // User might have DMs disabled
          console.log(`Could not send welcome DM to ${member.user.tag}`);
        }
      }

      // Send to welcome channel if configured
      if (guildConfig.welcomeMessage?.channelId && assignedRoles.length > 0) {
        try {
          const channel = member.guild.channels.cache.get(guildConfig.welcomeMessage.channelId);
          if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor('#43B581')
              .setTitle('👋 New Member Joined!')
              .setDescription(`Welcome ${member}! They have been assigned the following roles:`)
              .addFields({
                name: 'Auto-Assigned Roles',
                value: assignedRoles.map(r => `\`${r}\``).join(', '),
                inline: false
              })
              .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp();

            await channel.send({ embeds: [embed] });
          }
        } catch (error) {
          console.error('Failed to send welcome message to channel:', error);
        }
      }

    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
