const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Ticket, TicketPanel, TicketCounter, ActivityLog } = require('../schemas');
const { successEmbed, errorEmbed, COLORS } = require('./embeds');

/**
 * Get the next ticket number for a guild
 */
async function getNextTicketNumber(guildId) {
  const counter = await TicketCounter.findOneAndUpdate(
    { guildId },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
  return counter.count;
}

/**
 * Create a new ticket channel
 */
async function createTicketChannel(interaction, panel, categoryConfig) {
  const { guild, user } = interaction;

  // Check if user already has max tickets
  const existingTickets = await Ticket.countDocuments({
    guildId: guild.id,
    userId: user.id,
    status: 'open'
  });

  if (existingTickets >= (panel.settings?.maxTicketsPerUser || 1)) {
    return { success: false, error: 'You already have the maximum number of open tickets.' };
  }

  const ticketNumber = await getNextTicketNumber(guild.id);
  const channelName = (panel.settings?.namingScheme || 'ticket-{number}')
    .replace('{number}', ticketNumber.toString().padStart(4, '0'))
    .replace('{user}', user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Build permission overwrites
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
    }
  ];

  // Add staff roles
  if (categoryConfig?.staffRoles?.length) {
    for (const roleId of categoryConfig.staffRoles) {
      permissionOverwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
      });
    }
  }

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: panel.settings?.categoryId || null,
      permissionOverwrites
    });

    // Create ticket in database
    const ticket = await Ticket.create({
      guildId: guild.id,
      channelId: channel.id,
      userId: user.id,
      username: user.tag,
      ticketNumber,
      category: categoryConfig?.name || 'General',
      status: 'open',
      panelId: panel._id,
      participants: [{ userId: user.id, username: user.tag }]
    });

    // Log the ticket creation
    await ActivityLog.create({
      guildId: guild.id,
      action: 'ticket_created',
      targetUserId: user.id,
      targetUsername: user.tag,
      details: { ticketNumber, channelId: channel.id, category: categoryConfig?.name }
    });

    // Send welcome message
    const welcomeEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(categoryConfig?.welcomeMessage || 'Thank you for creating a ticket! A staff member will be with you shortly.')
      .addFields(
        { name: 'Created By', value: `<@${user.id}>`, inline: true },
        { name: 'Category', value: categoryConfig?.name || 'General', inline: true },
        { name: 'Status', value: 'Open', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Zyngine Bot' });

    const controlRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🙋')
      );

    await channel.send({ content: `<@${user.id}>`, embeds: [welcomeEmbed], components: [controlRow] });

    return { success: true, channel, ticket };
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    return { success: false, error: 'Failed to create ticket channel. Please check my permissions.' };
  }
}

/**
 * Close a ticket
 */
async function closeTicket(channel, closedBy, reason = 'No reason provided') {
  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  if (ticket.status === 'closed') {
    return { success: false, error: 'This ticket is already closed.' };
  }

  // Generate transcript before closing
  const transcript = await generateTranscript(channel);

  // Update ticket in database
  ticket.status = 'closed';
  ticket.closedBy = closedBy.id;
  ticket.closedByUsername = closedBy.tag;
  ticket.closedAt = new Date();
  ticket.closeReason = reason;
  ticket.transcript = transcript;
  await ticket.save();

  // Log the closure
  await ActivityLog.create({
    guildId: channel.guild.id,
    action: 'ticket_closed',
    targetUserId: ticket.userId,
    targetUsername: ticket.username,
    performedBy: closedBy.id,
    performedByUsername: closedBy.tag,
    details: { ticketNumber: ticket.ticketNumber, reason }
  });

  // Get panel settings for transcript channel
  const panel = await TicketPanel.findById(ticket.panelId);

  // Send transcript to transcript channel if configured
  if (panel?.settings?.transcriptChannelId) {
    try {
      const transcriptChannel = channel.guild.channels.cache.get(panel.settings.transcriptChannelId);
      if (transcriptChannel) {
        const transcriptEmbed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`Ticket #${ticket.ticketNumber.toString().padStart(4, '0')} - Transcript`)
          .addFields(
            { name: 'Created By', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Closed By', value: `<@${closedBy.id}>`, inline: true },
            { name: 'Category', value: ticket.category || 'General', inline: true },
            { name: 'Close Reason', value: reason, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: 'Zyngine Bot' });

        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [{
            attachment: Buffer.from(transcript, 'utf-8'),
            name: `ticket-${ticket.ticketNumber}.txt`
          }]
        });
      }
    } catch (err) {
      console.error('Error sending transcript:', err);
    }
  }

  // Update channel name to indicate closed
  try {
    await channel.setName(`closed-${ticket.ticketNumber.toString().padStart(4, '0')}`);

    // Remove user permissions
    await channel.permissionOverwrites.edit(ticket.userId, {
      SendMessages: false
    });
  } catch (err) {
    console.error('Error updating channel:', err);
  }

  return { success: true, ticket, transcript };
}

/**
 * Generate a transcript of the ticket channel
 */
async function generateTranscript(channel, limit = 500) {
  try {
    const messages = await channel.messages.fetch({ limit });
    const sortedMessages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let transcript = `=== Ticket Transcript ===\n`;
    transcript += `Channel: #${channel.name}\n`;
    transcript += `Generated: ${new Date().toISOString()}\n`;
    transcript += `Total Messages: ${sortedMessages.length}\n`;
    transcript += `=========================\n\n`;

    for (const msg of sortedMessages) {
      const timestamp = new Date(msg.createdTimestamp).toISOString();
      const author = msg.author?.tag || 'Unknown';
      let content = msg.content || '';

      // Handle embeds
      if (msg.embeds.length > 0) {
        content += ' [Embed]';
        for (const embed of msg.embeds) {
          if (embed.title) content += ` Title: ${embed.title}`;
          if (embed.description) content += ` Desc: ${embed.description.substring(0, 100)}`;
        }
      }

      // Handle attachments
      if (msg.attachments.size > 0) {
        const attachmentUrls = msg.attachments.map(a => a.url).join(', ');
        content += ` [Attachments: ${attachmentUrls}]`;
      }

      transcript += `[${timestamp}] ${author}: ${content}\n`;
    }

    return transcript;
  } catch (error) {
    console.error('Error generating transcript:', error);
    return 'Error generating transcript.';
  }
}

/**
 * Claim a ticket
 */
async function claimTicket(channel, claimedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  if (ticket.status !== 'open') {
    return { success: false, error: 'This ticket is not open.' };
  }

  if (ticket.claimedBy) {
    return { success: false, error: `This ticket is already claimed by <@${ticket.claimedBy}>.` };
  }

  ticket.claimedBy = claimedBy.id;
  ticket.claimedByUsername = claimedBy.tag;
  ticket.claimedAt = new Date();
  await ticket.save();

  // Log the claim
  await ActivityLog.create({
    guildId: channel.guild.id,
    action: 'ticket_claimed',
    targetUserId: ticket.userId,
    targetUsername: ticket.username,
    performedBy: claimedBy.id,
    performedByUsername: claimedBy.tag,
    details: { ticketNumber: ticket.ticketNumber }
  });

  return { success: true, ticket };
}

/**
 * Add a user to a ticket
 */
async function addUserToTicket(channel, user, addedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  // Check if user is already a participant
  if (ticket.participants.some(p => p.userId === user.id)) {
    return { success: false, error: 'This user is already in the ticket.' };
  }

  // Add permission to view channel
  try {
    await channel.permissionOverwrites.edit(user.id, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      ReadMessageHistory: true
    });

    ticket.participants.push({
      userId: user.id,
      username: user.tag,
      addedBy: addedBy.id
    });
    await ticket.save();

    return { success: true, ticket };
  } catch (error) {
    console.error('Error adding user to ticket:', error);
    return { success: false, error: 'Failed to add user to ticket.' };
  }
}

/**
 * Remove a user from a ticket
 */
async function removeUserFromTicket(channel, user, removedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id });

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  // Cannot remove ticket creator
  if (ticket.userId === user.id) {
    return { success: false, error: 'Cannot remove the ticket creator.' };
  }

  // Check if user is a participant
  const participantIndex = ticket.participants.findIndex(p => p.userId === user.id);
  if (participantIndex === -1) {
    return { success: false, error: 'This user is not in the ticket.' };
  }

  // Remove permission
  try {
    await channel.permissionOverwrites.delete(user.id);

    ticket.participants.splice(participantIndex, 1);
    await ticket.save();

    return { success: true, ticket };
  } catch (error) {
    console.error('Error removing user from ticket:', error);
    return { success: false, error: 'Failed to remove user from ticket.' };
  }
}

/**
 * Handle ticket button interactions
 */
async function handleTicketButton(interaction) {
  const { customId, user, channel } = interaction;

  if (customId === 'ticket_close') {
    await interaction.deferReply();
    const result = await closeTicket(channel, user);

    if (result.success) {
      return interaction.editReply({
        embeds: [successEmbed('Ticket Closed', `This ticket has been closed by <@${user.id}>.`)]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }

  if (customId === 'ticket_claim') {
    await interaction.deferReply();
    const result = await claimTicket(channel, user);

    if (result.success) {
      return interaction.editReply({
        embeds: [successEmbed('Ticket Claimed', `This ticket has been claimed by <@${user.id}>.`)]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }

  // Handle create ticket button from panel
  if (customId.startsWith('ticket_create_')) {
    await interaction.deferReply({ ephemeral: true });

    const panelId = customId.replace('ticket_create_', '');
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      return interaction.editReply({ embeds: [errorEmbed('Error', 'This ticket panel no longer exists.')] });
    }

    // Get the first category or default
    const categoryConfig = panel.categories?.[0] || { name: 'General' };

    const result = await createTicketChannel(interaction, panel, categoryConfig);

    if (result.success) {
      return interaction.editReply({
        embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${result.channel.id}>`)]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }
}

module.exports = {
  getNextTicketNumber,
  createTicketChannel,
  closeTicket,
  generateTranscript,
  claimTicket,
  addUserToTicket,
  removeUserFromTicket,
  handleTicketButton
};
