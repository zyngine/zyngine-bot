const { EmbedBuilder } = require('discord.js');
const { Guild, ActivityLog, UserStats } = require('../schemas');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const guildConfig = await Guild.findOne({ guildId: member.guild.id });
      
      if (!guildConfig || !guildConfig.autoRoles || guildConfig.autoRoles.length === 0) {
        return;
      }

      const shouldIgnoreBots = guildConfig.autoRoles.some(ar => ar.ignoreBots);
      if (member.user.bot && shouldIgnoreBots) {
        return;
      }

      const assignedRoles = [];

      for (const autoRole of guildConfig.autoRoles) {
        if (!autoRole.enabled) continue;

        if (autoRole.minAccountAge > 0) {
          const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
          if (accountAge < autoRole.minAccountAge) {
            continue;
          }
        }

        const assignRole = async () => {
          try {
            const role = member.guild.roles.cache.get(autoRole.roleId);
            if (!role) return;

            const botMember = member.guild.members.me;
            if (!botMember.permissions.has('ManageRoles')) return;
            if (role.position >= botMember.roles.highest.position) return;

            await member.roles.add(role, 'Auto-role on join');
            assignedRoles.push(role.name);

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

      await UserStats.findOneAndUpdate(
        { guildId: member.guild.id, odId: member.id },
        { 
          $setOnInsert: { guildId: member.guild.id, odId: member.id, messageCount: 0 },
          $set: { joinedAt: member.joinedAt || new Date() }
        },
        { upsert: true }
      );

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
            .addFields({ name: 'Roles Assigned', value: assignedRoles.map(r => `\`${r}\``).join(', '), inline: true })
            .setFooter({ text: 'Powered by Zyngine Bot' })
            .setTimestamp();

          await member.send({ embeds: [welcomeEmbed] });
        } catch (error) {
          console.log(`Could not send welcome DM to ${member.user.tag}`);
        }
      }
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};
