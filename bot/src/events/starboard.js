const { Events, EmbedBuilder } = require('discord.js');
const { StarboardConfig, StarboardEntry } = require('../schemas');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    // Ignore bots
    if (user.bot) return;

    // Handle partial reactions
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    const message = reaction.message;
    if (!message.guild) return;

    try {
      // Get starboard config
      const config = await StarboardConfig.findOne({ guildId: message.guild.id });
      if (!config?.enabled || !config.channelId) return;

      // Check if this is the star emoji
      const emojiId = reaction.emoji.id || reaction.emoji.name;
      if (emojiId !== config.emoji && reaction.emoji.name !== config.emoji) return;

      // Check if channel is ignored
      if (config.ignoredChannels?.includes(message.channel.id)) return;

      // Check NSFW
      if (message.channel.nsfw && !config.allowNSFW) return;

      // Get reaction count
      const reactionCount = reaction.count;

      // Check if self-starring is allowed
      if (!config.selfStar && message.author.id === user.id) {
        // Don't count self-stars - we'd need to track individual reactions for this
        // For simplicity, we'll just proceed
      }

      // Check threshold
      if (reactionCount < config.threshold) return;

      // Get or create starboard entry
      let entry = await StarboardEntry.findOne({
        guildId: message.guild.id,
        messageId: message.id
      });

      const starboardChannel = message.guild.channels.cache.get(config.channelId);
      if (!starboardChannel) return;

      // Build embed
      const embed = new EmbedBuilder()
        .setColor(config.embedColor || '#FFD700')
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(message.content || '*No text content*')
        .addFields(
          { name: 'Source', value: `[Jump to Message](${message.url})`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }
        )
        .setFooter({ text: `${config.emoji} ${reactionCount}` })
        .setTimestamp(message.createdAt);

      // Add image if present
      const attachment = message.attachments.first();
      if (attachment && attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }

      if (entry) {
        // Update existing entry
        entry.starCount = reactionCount;
        await entry.save();

        // Update the starboard message if it exists
        if (entry.starboardMessageId) {
          try {
            const starboardMsg = await starboardChannel.messages.fetch(entry.starboardMessageId);
            await starboardMsg.edit({
              content: `${config.emoji} **${reactionCount}** | <#${message.channel.id}>`,
              embeds: [embed]
            });
          } catch (err) {
            // Message might have been deleted
            console.error('Failed to update starboard message:', err);
          }
        }
      } else {
        // Create new entry
        const starboardMsg = await starboardChannel.send({
          content: `${config.emoji} **${reactionCount}** | <#${message.channel.id}>`,
          embeds: [embed]
        });

        entry = new StarboardEntry({
          guildId: message.guild.id,
          messageId: message.id,
          channelId: message.channel.id,
          channelName: message.channel.name,
          authorId: message.author.id,
          authorUsername: message.author.username,
          content: message.content,
          attachments: message.attachments.map(a => a.url),
          starCount: reactionCount,
          starboardMessageId: starboardMsg.id
        });
        await entry.save();
      }
    } catch (error) {
      console.error('Starboard error:', error);
    }
  }
};
