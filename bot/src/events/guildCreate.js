const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../schemas');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    try {
      console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);

      const existingConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!existingConfig) {
        await Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.iconURL(),
          ownerId: guild.ownerId,
          autoRoles: [],
          roleTiers: [
            { name: 'Basic', level: 1, color: '#43B581', roles: [], approverRoles: [], requirements: {} },
            { name: 'Elevated', level: 2, color: '#FAA61A', roles: [], approverRoles: [], requirements: {} },
            { name: 'Premium', level: 3, color: '#F04747', roles: [], approverRoles: [], requirements: {} }
          ],
          notifications: { approvalDMEnabled: true, denialDMEnabled: true },
          requestCooldown: 3600
        });
      }

      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('👋 Thanks for adding Zyngine Bot!')
        .setDescription('The ultimate role management solution for your Discord server.')
        .addFields(
          { name: '🚀 Quick Start', value: '• `/setup-autorole` - Configure auto-roles\n• `/setup-tier` - Create role tiers\n• `/request-role` - Request roles\n• `/role give` - Assign roles', inline: false },
          { name: '📚 Commands', value: 'Use `/help` to see all commands', inline: true }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Zyngine Bot v1.0' })
        .setTimestamp();

      const targetChannel = guild.systemChannel || 
        guild.channels.cache.find(ch => ch.name === 'general' && ch.isTextBased()) ||
        guild.channels.cache.find(ch => ch.isTextBased());

      if (targetChannel) {
        await targetChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
      }
    } catch (error) {
      console.error('Error in guildCreate event:', error);
    }
  },
};
