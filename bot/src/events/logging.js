const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { LoggingConfig } = require('../schemas');

// Cache for logging configs to reduce DB queries
const configCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getLoggingConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }

  const config = await LoggingConfig.findOne({ guildId }).lean();
  configCache.set(guildId, { config, timestamp: Date.now() });
  return config;
}

function isIgnored(config, channelId, userId, roleIds = []) {
  if (config.ignoredChannels?.includes(channelId)) return true;
  if (config.ignoredUsers?.includes(userId)) return true;
  if (config.ignoredRoles?.some(r => roleIds.includes(r))) return true;
  return false;
}

async function sendLog(guild, config, channelType, embed) {
  const channelId = config.channels?.[channelType];
  if (!channelId) return;

  try {
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`Failed to send log to ${channelType}:`, error);
  }
}

function createEmbed(config, color = null) {
  const embed = new EmbedBuilder()
    .setColor(color || config.embedColor || '#00D4AA')
    .setTimestamp();
  return embed;
}

// Helper to get audit log entry
async function getAuditLogEntry(guild, type, targetId, timeout = 5000) {
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: type
    });
    const entry = fetchedLogs.entries.first();
    if (entry && entry.target?.id === targetId && Date.now() - entry.createdTimestamp < timeout) {
      return entry;
    }
  } catch (error) {
    // Ignore audit log errors
  }
  return null;
}

module.exports = [
  // Message Delete
  {
    name: Events.MessageDelete,
    async execute(message) {
      if (!message.guild || message.author?.bot) return;

      const config = await getLoggingConfig(message.guild.id);
      if (!config?.enabled || !config.events?.messageDelete) return;

      const memberRoles = message.member?.roles?.cache?.map(r => r.id) || [];
      if (isIgnored(config, message.channel.id, message.author?.id, memberRoles)) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setAuthor({
          name: message.author?.tag || 'Unknown User',
          iconURL: config.showAvatars ? message.author?.displayAvatarURL() : null
        })
        .setTitle('Message Deleted')
        .addFields(
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Author', value: message.author ? `<@${message.author.id}>` : 'Unknown', inline: true }
        );

      if (message.content) {
        embed.addFields({ name: 'Content', value: message.content.slice(0, 1024) });
      }

      if (message.attachments.size > 0) {
        embed.addFields({
          name: 'Attachments',
          value: message.attachments.map(a => a.url).join('\n').slice(0, 1024)
        });
      }

      // Check audit log for who deleted
      const auditEntry = await getAuditLogEntry(message.guild, AuditLogEvent.MessageDelete, message.author?.id);
      if (auditEntry && auditEntry.executor?.id !== message.author?.id) {
        embed.addFields({ name: 'Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(message.guild, config, 'messages', embed);
    }
  },

  // Message Update
  {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const config = await getLoggingConfig(newMessage.guild.id);
      if (!config?.enabled || !config.events?.messageEdit) return;

      const memberRoles = newMessage.member?.roles?.cache?.map(r => r.id) || [];
      if (isIgnored(config, newMessage.channel.id, newMessage.author?.id, memberRoles)) return;

      const embed = createEmbed(config, '#FFD93D')
        .setAuthor({
          name: newMessage.author?.tag || 'Unknown User',
          iconURL: config.showAvatars ? newMessage.author?.displayAvatarURL() : null
        })
        .setTitle('Message Edited')
        .addFields(
          { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
          { name: 'Author', value: `<@${newMessage.author.id}>`, inline: true },
          { name: 'Jump to Message', value: `[Click Here](${newMessage.url})`, inline: true }
        );

      if (oldMessage.content) {
        embed.addFields({ name: 'Before', value: oldMessage.content.slice(0, 1024) });
      }
      if (newMessage.content) {
        embed.addFields({ name: 'After', value: newMessage.content.slice(0, 1024) });
      }

      await sendLog(newMessage.guild, config, 'messages', embed);
    }
  },

  // Bulk Message Delete
  {
    name: Events.MessageBulkDelete,
    async execute(messages, channel) {
      if (!channel.guild) return;

      const config = await getLoggingConfig(channel.guild.id);
      if (!config?.enabled || !config.events?.messageBulkDelete) return;
      if (isIgnored(config, channel.id, null, [])) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setTitle('Bulk Messages Deleted')
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Messages', value: `${messages.size} messages`, inline: true }
        );

      // Check audit log for who purged
      const auditEntry = await getAuditLogEntry(channel.guild, AuditLogEvent.MessageBulkDelete, channel.id);
      if (auditEntry) {
        embed.addFields({ name: 'Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(channel.guild, config, 'messages', embed);
    }
  },

  // Member Join
  {
    name: Events.GuildMemberAdd,
    async execute(member) {
      const config = await getLoggingConfig(member.guild.id);
      if (!config?.enabled || !config.events?.memberJoin) return;

      const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

      const embed = createEmbed(config, '#4ECDC4')
        .setAuthor({
          name: member.user.tag,
          iconURL: config.showAvatars ? member.user.displayAvatarURL() : null
        })
        .setTitle('Member Joined')
        .setThumbnail(config.showAvatars ? member.user.displayAvatarURL({ size: 256 }) : null)
        .addFields(
          { name: 'User', value: `<@${member.id}>`, inline: true },
          { name: 'Account Age', value: `${accountAge} days`, inline: true },
          { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: `ID: ${member.id}` });

      await sendLog(member.guild, config, 'members', embed);
    }
  },

  // Member Leave
  {
    name: Events.GuildMemberRemove,
    async execute(member) {
      const config = await getLoggingConfig(member.guild.id);
      if (!config?.enabled || !config.events?.memberLeave) return;

      const roles = member.roles?.cache?.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None';
      const joinedAt = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown';

      const embed = createEmbed(config, '#FF6B6B')
        .setAuthor({
          name: member.user.tag,
          iconURL: config.showAvatars ? member.user.displayAvatarURL() : null
        })
        .setTitle('Member Left')
        .setThumbnail(config.showAvatars ? member.user.displayAvatarURL({ size: 256 }) : null)
        .addFields(
          { name: 'User', value: `<@${member.id}>`, inline: true },
          { name: 'Joined', value: joinedAt, inline: true },
          { name: 'Roles', value: roles.slice(0, 1024) }
        )
        .setFooter({ text: `ID: ${member.id}` });

      await sendLog(member.guild, config, 'members', embed);
    }
  },

  // Member Ban
  {
    name: Events.GuildBanAdd,
    async execute(ban) {
      const config = await getLoggingConfig(ban.guild.id);
      if (!config?.enabled || !config.events?.memberBan) return;

      const embed = createEmbed(config, '#FF0000')
        .setAuthor({
          name: ban.user.tag,
          iconURL: config.showAvatars ? ban.user.displayAvatarURL() : null
        })
        .setTitle('Member Banned')
        .setThumbnail(config.showAvatars ? ban.user.displayAvatarURL({ size: 256 }) : null)
        .addFields(
          { name: 'User', value: `<@${ban.user.id}>`, inline: true }
        )
        .setFooter({ text: `ID: ${ban.user.id}` });

      if (ban.reason) {
        embed.addFields({ name: 'Reason', value: ban.reason });
      }

      // Check audit log for who banned
      const auditEntry = await getAuditLogEntry(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      if (auditEntry) {
        embed.addFields({ name: 'Banned By', value: `<@${auditEntry.executor.id}>`, inline: true });
        if (auditEntry.reason) {
          embed.spliceFields(embed.data.fields.findIndex(f => f.name === 'Reason'), 1, { name: 'Reason', value: auditEntry.reason });
        }
      }

      await sendLog(ban.guild, config, 'moderation', embed);
    }
  },

  // Member Unban
  {
    name: Events.GuildBanRemove,
    async execute(ban) {
      const config = await getLoggingConfig(ban.guild.id);
      if (!config?.enabled || !config.events?.memberUnban) return;

      const embed = createEmbed(config, '#4ECDC4')
        .setAuthor({
          name: ban.user.tag,
          iconURL: config.showAvatars ? ban.user.displayAvatarURL() : null
        })
        .setTitle('Member Unbanned')
        .addFields(
          { name: 'User', value: `<@${ban.user.id}>`, inline: true }
        )
        .setFooter({ text: `ID: ${ban.user.id}` });

      // Check audit log for who unbanned
      const auditEntry = await getAuditLogEntry(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
      if (auditEntry) {
        embed.addFields({ name: 'Unbanned By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(ban.guild, config, 'moderation', embed);
    }
  },

  // Member Update (nickname, roles, timeout)
  {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
      const config = await getLoggingConfig(newMember.guild.id);
      if (!config?.enabled) return;

      // Nickname change
      if (oldMember.nickname !== newMember.nickname && config.events?.memberNicknameChange) {
        const embed = createEmbed(config, '#FFD93D')
          .setAuthor({
            name: newMember.user.tag,
            iconURL: config.showAvatars ? newMember.user.displayAvatarURL() : null
          })
          .setTitle('Nickname Changed')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
            { name: 'Before', value: oldMember.nickname || 'None', inline: true },
            { name: 'After', value: newMember.nickname || 'None', inline: true }
          )
          .setFooter({ text: `ID: ${newMember.id}` });

        await sendLog(newMember.guild, config, 'members', embed);
      }

      // Role changes
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size > 0 && config.events?.memberRoleAdd) {
        const embed = createEmbed(config, '#4ECDC4')
          .setAuthor({
            name: newMember.user.tag,
            iconURL: config.showAvatars ? newMember.user.displayAvatarURL() : null
          })
          .setTitle('Role Added')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
            { name: 'Role(s)', value: addedRoles.map(r => r.name).join(', '), inline: true }
          )
          .setFooter({ text: `ID: ${newMember.id}` });

        const auditEntry = await getAuditLogEntry(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        if (auditEntry) {
          embed.addFields({ name: 'Added By', value: `<@${auditEntry.executor.id}>`, inline: true });
        }

        await sendLog(newMember.guild, config, 'roles', embed);
      }

      if (removedRoles.size > 0 && config.events?.memberRoleRemove) {
        const embed = createEmbed(config, '#FF6B6B')
          .setAuthor({
            name: newMember.user.tag,
            iconURL: config.showAvatars ? newMember.user.displayAvatarURL() : null
          })
          .setTitle('Role Removed')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true },
            { name: 'Role(s)', value: removedRoles.map(r => r.name).join(', '), inline: true }
          )
          .setFooter({ text: `ID: ${newMember.id}` });

        const auditEntry = await getAuditLogEntry(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
        if (auditEntry) {
          embed.addFields({ name: 'Removed By', value: `<@${auditEntry.executor.id}>`, inline: true });
        }

        await sendLog(newMember.guild, config, 'roles', embed);
      }

      // Timeout
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil && config.events?.memberTimeout) {
        const isTimeout = newMember.communicationDisabledUntil && newMember.communicationDisabledUntil > new Date();

        const embed = createEmbed(config, isTimeout ? '#FF6B6B' : '#4ECDC4')
          .setAuthor({
            name: newMember.user.tag,
            iconURL: config.showAvatars ? newMember.user.displayAvatarURL() : null
          })
          .setTitle(isTimeout ? 'Member Timed Out' : 'Timeout Removed')
          .addFields(
            { name: 'User', value: `<@${newMember.id}>`, inline: true }
          )
          .setFooter({ text: `ID: ${newMember.id}` });

        if (isTimeout) {
          embed.addFields({
            name: 'Until',
            value: `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`,
            inline: true
          });
        }

        const auditEntry = await getAuditLogEntry(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        if (auditEntry) {
          embed.addFields({ name: isTimeout ? 'Timed Out By' : 'Removed By', value: `<@${auditEntry.executor.id}>`, inline: true });
          if (auditEntry.reason) {
            embed.addFields({ name: 'Reason', value: auditEntry.reason });
          }
        }

        await sendLog(newMember.guild, config, 'moderation', embed);
      }
    }
  },

  // Voice State Update
  {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      const config = await getLoggingConfig(guild.id);
      if (!config?.enabled) return;

      const member = newState.member || oldState.member;
      if (!member) return;

      // Voice Join
      if (!oldState.channelId && newState.channelId && config.events?.voiceJoin) {
        const embed = createEmbed(config, '#4ECDC4')
          .setAuthor({
            name: member.user.tag,
            iconURL: config.showAvatars ? member.user.displayAvatarURL() : null
          })
          .setTitle('Voice Channel Joined')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: `<#${newState.channelId}>`, inline: true }
          )
          .setFooter({ text: `ID: ${member.id}` });

        await sendLog(guild, config, 'voice', embed);
      }

      // Voice Leave
      if (oldState.channelId && !newState.channelId && config.events?.voiceLeave) {
        const embed = createEmbed(config, '#FF6B6B')
          .setAuthor({
            name: member.user.tag,
            iconURL: config.showAvatars ? member.user.displayAvatarURL() : null
          })
          .setTitle('Voice Channel Left')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true }
          )
          .setFooter({ text: `ID: ${member.id}` });

        await sendLog(guild, config, 'voice', embed);
      }

      // Voice Move
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId && config.events?.voiceMove) {
        const embed = createEmbed(config, '#FFD93D')
          .setAuthor({
            name: member.user.tag,
            iconURL: config.showAvatars ? member.user.displayAvatarURL() : null
          })
          .setTitle('Voice Channel Moved')
          .addFields(
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
            { name: 'To', value: `<#${newState.channelId}>`, inline: true }
          )
          .setFooter({ text: `ID: ${member.id}` });

        await sendLog(guild, config, 'voice', embed);
      }
    }
  },

  // Channel Create
  {
    name: Events.ChannelCreate,
    async execute(channel) {
      if (!channel.guild) return;

      const config = await getLoggingConfig(channel.guild.id);
      if (!config?.enabled || !config.events?.channelCreate) return;

      const embed = createEmbed(config, '#4ECDC4')
        .setTitle('Channel Created')
        .addFields(
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Type', value: channel.type.toString(), inline: true }
        )
        .setFooter({ text: `ID: ${channel.id}` });

      const auditEntry = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
      if (auditEntry) {
        embed.addFields({ name: 'Created By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(channel.guild, config, 'channels', embed);
    }
  },

  // Channel Delete
  {
    name: Events.ChannelDelete,
    async execute(channel) {
      if (!channel.guild) return;

      const config = await getLoggingConfig(channel.guild.id);
      if (!config?.enabled || !config.events?.channelDelete) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setTitle('Channel Deleted')
        .addFields(
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Type', value: channel.type.toString(), inline: true }
        )
        .setFooter({ text: `ID: ${channel.id}` });

      const auditEntry = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
      if (auditEntry) {
        embed.addFields({ name: 'Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(channel.guild, config, 'channels', embed);
    }
  },

  // Channel Update
  {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
      if (!newChannel.guild) return;

      const config = await getLoggingConfig(newChannel.guild.id);
      if (!config?.enabled || !config.events?.channelUpdate) return;

      const changes = [];
      if (oldChannel.name !== newChannel.name) {
        changes.push({ name: 'Name', old: oldChannel.name, new: newChannel.name });
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push({ name: 'Topic', old: oldChannel.topic || 'None', new: newChannel.topic || 'None' });
      }
      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push({ name: 'NSFW', old: oldChannel.nsfw ? 'Yes' : 'No', new: newChannel.nsfw ? 'Yes' : 'No' });
      }
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push({ name: 'Slowmode', old: `${oldChannel.rateLimitPerUser}s`, new: `${newChannel.rateLimitPerUser}s` });
      }

      if (changes.length === 0) return;

      const embed = createEmbed(config, '#FFD93D')
        .setTitle('Channel Updated')
        .addFields(
          { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
        )
        .setFooter({ text: `ID: ${newChannel.id}` });

      for (const change of changes) {
        embed.addFields(
          { name: `${change.name} (Before)`, value: String(change.old).slice(0, 1024), inline: true },
          { name: `${change.name} (After)`, value: String(change.new).slice(0, 1024), inline: true }
        );
      }

      const auditEntry = await getAuditLogEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
      if (auditEntry) {
        embed.addFields({ name: 'Updated By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(newChannel.guild, config, 'channels', embed);
    }
  },

  // Role Create
  {
    name: Events.GuildRoleCreate,
    async execute(role) {
      const config = await getLoggingConfig(role.guild.id);
      if (!config?.enabled || !config.events?.roleCreate) return;

      const embed = createEmbed(config, '#4ECDC4')
        .setTitle('Role Created')
        .addFields(
          { name: 'Role', value: `<@&${role.id}>`, inline: true },
          { name: 'Name', value: role.name, inline: true },
          { name: 'Color', value: role.hexColor, inline: true }
        )
        .setFooter({ text: `ID: ${role.id}` });

      const auditEntry = await getAuditLogEntry(role.guild, AuditLogEvent.RoleCreate, role.id);
      if (auditEntry) {
        embed.addFields({ name: 'Created By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(role.guild, config, 'roles', embed);
    }
  },

  // Role Delete
  {
    name: Events.GuildRoleDelete,
    async execute(role) {
      const config = await getLoggingConfig(role.guild.id);
      if (!config?.enabled || !config.events?.roleDelete) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setTitle('Role Deleted')
        .addFields(
          { name: 'Name', value: role.name, inline: true },
          { name: 'Color', value: role.hexColor, inline: true }
        )
        .setFooter({ text: `ID: ${role.id}` });

      const auditEntry = await getAuditLogEntry(role.guild, AuditLogEvent.RoleDelete, role.id);
      if (auditEntry) {
        embed.addFields({ name: 'Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(role.guild, config, 'roles', embed);
    }
  },

  // Role Update
  {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
      const config = await getLoggingConfig(newRole.guild.id);
      if (!config?.enabled || !config.events?.roleUpdate) return;

      const changes = [];
      if (oldRole.name !== newRole.name) {
        changes.push({ name: 'Name', old: oldRole.name, new: newRole.name });
      }
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push({ name: 'Color', old: oldRole.hexColor, new: newRole.hexColor });
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push({ name: 'Hoisted', old: oldRole.hoist ? 'Yes' : 'No', new: newRole.hoist ? 'Yes' : 'No' });
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({ name: 'Mentionable', old: oldRole.mentionable ? 'Yes' : 'No', new: newRole.mentionable ? 'Yes' : 'No' });
      }

      if (changes.length === 0) return;

      const embed = createEmbed(config, '#FFD93D')
        .setTitle('Role Updated')
        .addFields(
          { name: 'Role', value: `<@&${newRole.id}>`, inline: true }
        )
        .setFooter({ text: `ID: ${newRole.id}` });

      for (const change of changes) {
        embed.addFields(
          { name: `${change.name} (Before)`, value: change.old, inline: true },
          { name: `${change.name} (After)`, value: change.new, inline: true }
        );
      }

      const auditEntry = await getAuditLogEntry(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
      if (auditEntry) {
        embed.addFields({ name: 'Updated By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(newRole.guild, config, 'roles', embed);
    }
  },

  // Server Update
  {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild) {
      const config = await getLoggingConfig(newGuild.id);
      if (!config?.enabled || !config.events?.serverUpdate) return;

      const changes = [];
      if (oldGuild.name !== newGuild.name) {
        changes.push({ name: 'Name', old: oldGuild.name, new: newGuild.name });
      }
      if (oldGuild.iconURL() !== newGuild.iconURL()) {
        changes.push({ name: 'Icon', old: 'Changed', new: 'Changed' });
      }
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push({ name: 'Verification Level', old: oldGuild.verificationLevel.toString(), new: newGuild.verificationLevel.toString() });
      }

      if (changes.length === 0) return;

      const embed = createEmbed(config, '#FFD93D')
        .setTitle('Server Updated')
        .setThumbnail(newGuild.iconURL({ size: 256 }))
        .setFooter({ text: `ID: ${newGuild.id}` });

      for (const change of changes) {
        embed.addFields(
          { name: `${change.name} (Before)`, value: change.old, inline: true },
          { name: `${change.name} (After)`, value: change.new, inline: true }
        );
      }

      const auditEntry = await getAuditLogEntry(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
      if (auditEntry) {
        embed.addFields({ name: 'Updated By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(newGuild, config, 'server', embed);
    }
  },

  // Emoji Create
  {
    name: Events.GuildEmojiCreate,
    async execute(emoji) {
      const config = await getLoggingConfig(emoji.guild.id);
      if (!config?.enabled || !config.events?.emojiCreate) return;

      const embed = createEmbed(config, '#4ECDC4')
        .setTitle('Emoji Created')
        .setThumbnail(emoji.url)
        .addFields(
          { name: 'Emoji', value: `${emoji}`, inline: true },
          { name: 'Name', value: emoji.name, inline: true }
        )
        .setFooter({ text: `ID: ${emoji.id}` });

      const auditEntry = await getAuditLogEntry(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
      if (auditEntry) {
        embed.addFields({ name: 'Created By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(emoji.guild, config, 'server', embed);
    }
  },

  // Emoji Delete
  {
    name: Events.GuildEmojiDelete,
    async execute(emoji) {
      const config = await getLoggingConfig(emoji.guild.id);
      if (!config?.enabled || !config.events?.emojiDelete) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setTitle('Emoji Deleted')
        .addFields(
          { name: 'Name', value: emoji.name, inline: true }
        )
        .setFooter({ text: `ID: ${emoji.id}` });

      const auditEntry = await getAuditLogEntry(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
      if (auditEntry) {
        embed.addFields({ name: 'Deleted By', value: `<@${auditEntry.executor.id}>`, inline: true });
      }

      await sendLog(emoji.guild, config, 'server', embed);
    }
  },

  // Invite Create
  {
    name: Events.InviteCreate,
    async execute(invite) {
      if (!invite.guild) return;

      const config = await getLoggingConfig(invite.guild.id);
      if (!config?.enabled || !config.events?.inviteCreate) return;

      const embed = createEmbed(config, '#4ECDC4')
        .setTitle('Invite Created')
        .addFields(
          { name: 'Code', value: invite.code, inline: true },
          { name: 'Channel', value: `<#${invite.channel.id}>`, inline: true },
          { name: 'Max Uses', value: invite.maxUses ? invite.maxUses.toString() : 'Unlimited', inline: true }
        );

      if (invite.inviter) {
        embed.addFields({ name: 'Created By', value: `<@${invite.inviter.id}>`, inline: true });
      }

      if (invite.expiresAt) {
        embed.addFields({ name: 'Expires', value: `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>`, inline: true });
      }

      await sendLog(invite.guild, config, 'invites', embed);
    }
  },

  // Invite Delete
  {
    name: Events.InviteDelete,
    async execute(invite) {
      if (!invite.guild) return;

      const config = await getLoggingConfig(invite.guild.id);
      if (!config?.enabled || !config.events?.inviteDelete) return;

      const embed = createEmbed(config, '#FF6B6B')
        .setTitle('Invite Deleted')
        .addFields(
          { name: 'Code', value: invite.code, inline: true },
          { name: 'Channel', value: `<#${invite.channel.id}>`, inline: true }
        );

      await sendLog(invite.guild, config, 'invites', embed);
    }
  }
];
