const { Events, EmbedBuilder } = require('discord.js');
const { LevelingConfig, UserLevel } = require('../schemas');

// XP cooldown tracking (in memory)
const xpCooldowns = new Map();

// Calculate level from XP
function getLevelFromXp(xp) {
  let level = 0;
  let requiredXp = 100;
  let totalXp = 0;

  while (totalXp + requiredXp <= xp) {
    totalXp += requiredXp;
    level++;
    requiredXp = Math.floor(100 * Math.pow(1.5, level));
  }

  return level;
}

// Calculate XP needed for a level
function getXpForLevel(level) {
  let totalXp = 0;
  for (let i = 0; i < level; i++) {
    totalXp += Math.floor(100 * Math.pow(1.5, i));
  }
  return totalXp;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    try {
      // Get leveling config
      const config = await LevelingConfig.findOne({ guildId: message.guild.id });
      if (!config?.enabled) return;

      // Check if channel is ignored
      if (config.ignoredChannels?.includes(message.channel.id)) return;

      // Check if user has an ignored role
      const memberRoles = message.member.roles.cache.map(r => r.id);
      if (config.ignoredRoles?.some(r => memberRoles.includes(r))) return;

      // Check cooldown
      const cooldownKey = `${message.guild.id}-${message.author.id}`;
      const lastXp = xpCooldowns.get(cooldownKey);
      const now = Date.now();

      if (lastXp && now - lastXp < (config.xpCooldown || 60) * 1000) {
        return; // Still on cooldown
      }

      // Calculate XP with multipliers
      let xpGain = config.xpPerMessage || 15;

      // Apply multipliers
      for (const mult of config.xpMultipliers || []) {
        if (mult.type === 'role' && memberRoles.includes(mult.targetId)) {
          xpGain = Math.floor(xpGain * mult.multiplier);
          break; // Only apply first matching role multiplier
        }
        if (mult.type === 'channel' && message.channel.id === mult.targetId) {
          xpGain = Math.floor(xpGain * mult.multiplier);
        }
      }

      // Update user XP
      const userLevel = await UserLevel.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        {
          $inc: { xp: xpGain, messageCount: 1 },
          $set: { username: message.author.username },
          $setOnInsert: { guildId: message.guild.id, userId: message.author.id }
        },
        { upsert: true, new: true }
      );

      // Set cooldown
      xpCooldowns.set(cooldownKey, now);

      // Check for level up
      const oldLevel = getLevelFromXp(userLevel.xp - xpGain);
      const newLevel = getLevelFromXp(userLevel.xp);

      if (newLevel > oldLevel) {
        // Level up!
        const levelUpChannel = config.levelUpChannelId
          ? message.guild.channels.cache.get(config.levelUpChannelId)
          : message.channel;

        if (levelUpChannel) {
          const levelUpMessage = (config.levelUpMessage || 'Congratulations {user}! You reached level {level}!')
            .replace(/{user}/g, `<@${message.author.id}>`)
            .replace(/{level}/g, newLevel)
            .replace(/{server}/g, message.guild.name);

          const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎉 Level Up!')
            .setDescription(levelUpMessage)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
              { name: 'New Level', value: `${newLevel}`, inline: true },
              { name: 'Total XP', value: `${userLevel.xp.toLocaleString()}`, inline: true }
            )
            .setTimestamp();

          await levelUpChannel.send({ embeds: [embed] });
        }

        // Check for role rewards
        for (const reward of config.roleRewards || []) {
          if (reward.level === newLevel && reward.roleId) {
            try {
              const role = message.guild.roles.cache.get(reward.roleId);
              if (role && !message.member.roles.cache.has(reward.roleId)) {
                await message.member.roles.add(role);
              }
            } catch (err) {
              console.error('Failed to add level role:', err);
            }
          }

          // Remove roles from lower levels if configured
          if (reward.removeOnHigherLevel && reward.level < newLevel && reward.roleId) {
            try {
              const role = message.guild.roles.cache.get(reward.roleId);
              if (role && message.member.roles.cache.has(reward.roleId)) {
                await message.member.roles.remove(role);
              }
            } catch (err) {
              console.error('Failed to remove level role:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Leveling error:', error);
    }
  }
};
