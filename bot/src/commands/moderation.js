const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ModerationCase, ModerationCaseCounter, ModerationConfig } = require('../schemas');

async function getNextCaseNumber(guildId) {
  const counter = await ModerationCaseCounter.findOneAndUpdate(
    { guildId },
    { $inc: { count: 1 } },
    { new: true, upsert: true }
  );
  return counter.count;
}

async function createCase(data) {
  const caseNumber = await getNextCaseNumber(data.guildId);
  return await ModerationCase.create({ ...data, caseNumber });
}

async function sendModLog(guild, modCase, color) {
  const config = await ModerationConfig.findOne({ guildId: guild.id });
  if (!config?.logChannelId) return;

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Case #${modCase.caseNumber} | ${modCase.type.toUpperCase()}`)
    .addFields(
      { name: 'User', value: `<@${modCase.targetId}> (${modCase.targetUsername})`, inline: true },
      { name: 'Moderator', value: `<@${modCase.moderatorId}>`, inline: true },
      { name: 'Reason', value: modCase.reason || 'No reason provided' }
    )
    .setTimestamp();

  if (modCase.duration) {
    embed.addFields({ name: 'Duration', value: `${modCase.duration} minutes`, inline: true });
  }

  await channel.send({ embeds: [embed] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('warn')
        .setDescription('Warn a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning'))
    )
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kick'))
    )
    .addSubcommand(sub =>
      sub.setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for ban'))
        .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete').setMinValue(0).setMaxValue(7))
    )
    .addSubcommand(sub =>
      sub.setName('unban')
        .setDescription('Unban a user')
        .addStringOption(opt => opt.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for unban'))
    )
    .addSubcommand(sub =>
      sub.setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for timeout'))
    )
    .addSubcommand(sub =>
      sub.setName('untimeout')
        .setDescription('Remove timeout from a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to untimeout').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing timeout'))
    )
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('View moderation history for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('case')
        .setDescription('View details of a specific case')
        .addIntegerOption(opt => opt.setName('number').setDescription('Case number').setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'warn': return handleWarn(interaction);
      case 'kick': return handleKick(interaction);
      case 'ban': return handleBan(interaction);
      case 'unban': return handleUnban(interaction);
      case 'timeout': return handleTimeout(interaction);
      case 'untimeout': return handleUntimeout(interaction);
      case 'history': return handleHistory(interaction);
      case 'case': return handleCase(interaction);
    }
  }
};

async function handleWarn(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (user.id === interaction.user.id) {
    return interaction.reply({ content: 'You cannot warn yourself.', ephemeral: true });
  }

  if (user.bot) {
    return interaction.reply({ content: 'You cannot warn bots.', ephemeral: true });
  }

  const modCase = await createCase({
    guildId: interaction.guild.id,
    type: 'warn',
    targetId: user.id,
    targetUsername: user.tag,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.tag,
    reason
  });

  // Try to DM the user
  try {
    await user.send({
      embeds: [new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle(`Warning in ${interaction.guild.name}`)
        .setDescription(`You have been warned by a moderator.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp()
      ]
    });
  } catch (e) {}

  await sendModLog(interaction.guild, modCase, '#FEE75C');

  // Check warning thresholds
  const warningCount = await ModerationCase.countDocuments({
    guildId: interaction.guild.id,
    targetId: user.id,
    type: 'warn'
  });

  const embed = new EmbedBuilder()
    .setColor('#FEE75C')
    .setTitle('User Warned')
    .setDescription(`**${user.tag}** has been warned.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${modCase.caseNumber}`, inline: true },
      { name: 'Total Warnings', value: `${warningCount}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleKick(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
  }

  if (!member.kickable) {
    return interaction.reply({ content: 'I cannot kick this user. They may have higher permissions than me.', ephemeral: true });
  }

  if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'You cannot kick this user. They have equal or higher role than you.', ephemeral: true });
  }

  const modCase = await createCase({
    guildId: interaction.guild.id,
    type: 'kick',
    targetId: user.id,
    targetUsername: user.tag,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.tag,
    reason
  });

  // Try to DM the user before kicking
  try {
    await user.send({
      embeds: [new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle(`Kicked from ${interaction.guild.name}`)
        .setDescription(`You have been kicked from the server.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp()
      ]
    });
  } catch (e) {}

  await member.kick(reason);
  await sendModLog(interaction.guild, modCase, '#ED4245');

  const embed = new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('User Kicked')
    .setDescription(`**${user.tag}** has been kicked from the server.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${modCase.caseNumber}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleBan(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const deleteDays = interaction.options.getInteger('delete_days') || 0;

  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (member) {
    if (!member.bannable) {
      return interaction.reply({ content: 'I cannot ban this user. They may have higher permissions than me.', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: 'You cannot ban this user. They have equal or higher role than you.', ephemeral: true });
    }
  }

  const modCase = await createCase({
    guildId: interaction.guild.id,
    type: 'ban',
    targetId: user.id,
    targetUsername: user.tag,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.tag,
    reason
  });

  // Try to DM the user before banning
  try {
    await user.send({
      embeds: [new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle(`Banned from ${interaction.guild.name}`)
        .setDescription(`You have been banned from the server.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp()
      ]
    });
  } catch (e) {}

  await interaction.guild.members.ban(user.id, { reason, deleteMessageDays: deleteDays });
  await sendModLog(interaction.guild, modCase, '#ED4245');

  const embed = new EmbedBuilder()
    .setColor('#ED4245')
    .setTitle('User Banned')
    .setDescription(`**${user.tag}** has been banned from the server.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${modCase.caseNumber}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUnban(interaction) {
  const userId = interaction.options.getString('user_id');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  try {
    const ban = await interaction.guild.bans.fetch(userId);

    const modCase = await createCase({
      guildId: interaction.guild.id,
      type: 'unban',
      targetId: userId,
      targetUsername: ban.user.tag,
      moderatorId: interaction.user.id,
      moderatorUsername: interaction.user.tag,
      reason
    });

    await interaction.guild.members.unban(userId, reason);
    await sendModLog(interaction.guild, modCase, '#57F287');

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('User Unbanned')
      .setDescription(`**${ban.user.tag}** has been unbanned.`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Case', value: `#${modCase.caseNumber}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (e) {
    await interaction.reply({ content: 'Could not find a ban for that user ID.', ephemeral: true });
  }
}

async function handleTimeout(interaction) {
  const user = interaction.options.getUser('user');
  const duration = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
  }

  if (!member.moderatable) {
    return interaction.reply({ content: 'I cannot timeout this user. They may have higher permissions than me.', ephemeral: true });
  }

  if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'You cannot timeout this user. They have equal or higher role than you.', ephemeral: true });
  }

  const modCase = await createCase({
    guildId: interaction.guild.id,
    type: 'timeout',
    targetId: user.id,
    targetUsername: user.tag,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.tag,
    reason,
    duration,
    expiresAt: new Date(Date.now() + duration * 60 * 1000)
  });

  await member.timeout(duration * 60 * 1000, reason);
  await sendModLog(interaction.guild, modCase, '#FEE75C');

  const embed = new EmbedBuilder()
    .setColor('#FEE75C')
    .setTitle('User Timed Out')
    .setDescription(`**${user.tag}** has been timed out.`)
    .addFields(
      { name: 'Duration', value: `${duration} minutes`, inline: true },
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${modCase.caseNumber}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleUntimeout(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) {
    return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
  }

  if (!member.isCommunicationDisabled()) {
    return interaction.reply({ content: 'This user is not timed out.', ephemeral: true });
  }

  const modCase = await createCase({
    guildId: interaction.guild.id,
    type: 'untimeout',
    targetId: user.id,
    targetUsername: user.tag,
    moderatorId: interaction.user.id,
    moderatorUsername: interaction.user.tag,
    reason
  });

  await member.timeout(null, reason);
  await sendModLog(interaction.guild, modCase, '#57F287');

  const embed = new EmbedBuilder()
    .setColor('#57F287')
    .setTitle('Timeout Removed')
    .setDescription(`**${user.tag}**'s timeout has been removed.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Case', value: `#${modCase.caseNumber}`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleHistory(interaction) {
  const user = interaction.options.getUser('user');

  const cases = await ModerationCase.find({
    guildId: interaction.guild.id,
    targetId: user.id
  }).sort({ createdAt: -1 }).limit(10);

  if (cases.length === 0) {
    return interaction.reply({ content: `No moderation history found for **${user.tag}**.`, ephemeral: true });
  }

  const caseList = cases.map(c => {
    const date = new Date(c.createdAt).toLocaleDateString();
    return `**#${c.caseNumber}** | ${c.type.toUpperCase()} | ${date}\n└ ${c.reason.substring(0, 50)}${c.reason.length > 50 ? '...' : ''}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`Moderation History: ${user.tag}`)
    .setDescription(caseList)
    .setFooter({ text: `Showing last ${cases.length} cases` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCase(interaction) {
  const caseNumber = interaction.options.getInteger('number');

  const modCase = await ModerationCase.findOne({
    guildId: interaction.guild.id,
    caseNumber
  });

  if (!modCase) {
    return interaction.reply({ content: `Case #${caseNumber} not found.`, ephemeral: true });
  }

  const color = ['ban', 'kick'].includes(modCase.type) ? '#ED4245' :
                ['warn', 'timeout', 'mute'].includes(modCase.type) ? '#FEE75C' : '#57F287';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Case #${modCase.caseNumber} | ${modCase.type.toUpperCase()}`)
    .addFields(
      { name: 'User', value: `<@${modCase.targetId}> (${modCase.targetUsername})`, inline: true },
      { name: 'Moderator', value: `<@${modCase.moderatorId}>`, inline: true },
      { name: 'Reason', value: modCase.reason },
      { name: 'Date', value: new Date(modCase.createdAt).toLocaleString(), inline: true }
    )
    .setTimestamp();

  if (modCase.duration) {
    embed.addFields({ name: 'Duration', value: `${modCase.duration} minutes`, inline: true });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
