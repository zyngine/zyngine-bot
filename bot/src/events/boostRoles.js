const { Events, EmbedBuilder } = require('discord.js');
const { Guild } = require('../schemas');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Check if member started boosting
    const wasBoosting = oldMember.premiumSince !== null;
    const isBoosting = newMember.premiumSince !== null;

    // Only trigger when someone starts boosting (not when they stop)
    if (wasBoosting || !isBoosting) return;

    try {
      // Get guild config
      const guildConfig = await Guild.findOne({ guildId: newMember.guild.id });
      if (!guildConfig?.boostRoles?.enabled) return;

      const { roles, message } = guildConfig.boostRoles;

      // Give boost roles
      const addedRoles = [];
      for (const roleId of roles || []) {
        try {
          const role = newMember.guild.roles.cache.get(roleId);
          if (role && !newMember.roles.cache.has(roleId)) {
            await newMember.roles.add(role, 'Server boost reward');
            addedRoles.push(role.name);
          }
        } catch (err) {
          console.error(`Failed to add boost role ${roleId}:`, err);
        }
      }

      // Send thank you message if enabled
      if (message?.enabled && message?.channelId && addedRoles.length > 0) {
        try {
          const channel = newMember.guild.channels.cache.get(message.channelId);
          if (channel) {
            const content = (message.content || 'Thank you {user} for boosting the server! 🎉')
              .replace(/{user}/g, `<@${newMember.id}>`)
              .replace(/{username}/g, newMember.user.username)
              .replace(/{server}/g, newMember.guild.name)
              .replace(/{roles}/g, addedRoles.join(', '));

            const embed = new EmbedBuilder()
              .setColor('#F47FFF') // Boost pink color
              .setTitle('New Server Boost! 🚀')
              .setDescription(content)
              .setThumbnail(newMember.user.displayAvatarURL({ size: 256 }))
              .addFields(
                { name: 'Booster', value: `<@${newMember.id}>`, inline: true },
                { name: 'Roles Given', value: addedRoles.join(', ') || 'None', inline: true },
                { name: 'Total Boosts', value: `${newMember.guild.premiumSubscriptionCount}`, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: 'Thank you for supporting the server!' });

            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          console.error('Failed to send boost message:', err);
        }
      }

      console.log(`Boost roles given to ${newMember.user.tag}: ${addedRoles.join(', ')}`);
    } catch (error) {
      console.error('Error handling boost role:', error);
    }
  }
};
