const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
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
 * Generate HTML transcript of the ticket channel
 */
async function generateHtmlTranscript(channel, ticket) {
  try {
    const messages = await channel.messages.fetch({ limit: 500 });
    const sortedMessages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticket.ticketNumber} - Transcript</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #36393f; color: #dcddde; line-height: 1.4; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: #2f3136; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { color: #fff; font-size: 24px; margin-bottom: 10px; }
    .header-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
    .header-info div { background: #36393f; padding: 10px; border-radius: 4px; }
    .header-info label { color: #72767d; font-size: 12px; text-transform: uppercase; }
    .header-info p { color: #fff; }
    .messages { background: #36393f; border-radius: 8px; }
    .message { padding: 10px 20px; display: flex; gap: 15px; }
    .message:hover { background: #32353b; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #5865f2; flex-shrink: 0; }
    .avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .content { flex: 1; }
    .author { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .author-name { color: #fff; font-weight: 500; }
    .timestamp { color: #72767d; font-size: 12px; }
    .text { color: #dcddde; white-space: pre-wrap; word-wrap: break-word; }
    .embed { background: #2f3136; border-left: 4px solid #5865f2; padding: 12px; border-radius: 4px; margin-top: 8px; max-width: 500px; }
    .embed-title { color: #fff; font-weight: 600; margin-bottom: 8px; }
    .embed-desc { color: #dcddde; font-size: 14px; }
    .attachment { margin-top: 8px; }
    .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }
    .attachment a { color: #00b0f4; text-decoration: none; }
    .form-responses { background: #2f3136; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .form-responses h3 { color: #fff; margin-bottom: 10px; }
    .form-field { margin-bottom: 10px; }
    .form-field label { color: #72767d; font-size: 12px; }
    .form-field p { color: #dcddde; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ticket #${ticket.ticketNumber.toString().padStart(4, '0')}</h1>
      <div class="header-info">
        <div><label>Created By</label><p>${ticket.username || ticket.userId}</p></div>
        <div><label>Category</label><p>${ticket.category || 'General'}</p></div>
        <div><label>Status</label><p>${ticket.status}</p></div>
        <div><label>Created</label><p>${new Date(ticket.createdAt).toLocaleString()}</p></div>
        ${ticket.claimedByUsername ? `<div><label>Claimed By</label><p>${ticket.claimedByUsername}</p></div>` : ''}
        ${ticket.closedByUsername ? `<div><label>Closed By</label><p>${ticket.closedByUsername}</p></div>` : ''}
      </div>
    </div>`;

    // Add form responses if any
    if (ticket.formResponses?.length > 0) {
      html += `
    <div class="form-responses">
      <h3>Form Responses</h3>`;
      for (const fr of ticket.formResponses) {
        html += `
      <div class="form-field">
        <label>${fr.label}</label>
        <p>${fr.response || 'No response'}</p>
      </div>`;
      }
      html += `
    </div>`;
    }

    html += `
    <div class="messages">`;

    for (const msg of sortedMessages) {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString();
      const avatarUrl = msg.author?.displayAvatarURL?.({ size: 64 }) || '';

      html += `
      <div class="message">
        <div class="avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="">` : ''}</div>
        <div class="content">
          <div class="author">
            <span class="author-name">${msg.author?.tag || 'Unknown'}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          <div class="text">${escapeHtml(msg.content || '')}</div>`;

      // Add embeds
      for (const embed of msg.embeds) {
        html += `
          <div class="embed" style="border-color: ${embed.hexColor || '#5865f2'}">
            ${embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : ''}
            ${embed.description ? `<div class="embed-desc">${escapeHtml(embed.description)}</div>` : ''}
          </div>`;
      }

      // Add attachments
      for (const att of msg.attachments.values()) {
        if (att.contentType?.startsWith('image/')) {
          html += `
          <div class="attachment"><img src="${att.url}" alt="${att.name}"></div>`;
        } else {
          html += `
          <div class="attachment"><a href="${att.url}" target="_blank">${att.name}</a></div>`;
        }
      }

      html += `
        </div>
      </div>`;
    }

    html += `
    </div>
  </div>
</body>
</html>`;

    return html;
  } catch (error) {
    console.error('Error generating HTML transcript:', error);
    return null;
  }
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate a text transcript of the ticket channel
 */
async function generateTextTranscript(channel, limit = 500) {
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

      if (msg.embeds.length > 0) {
        content += ' [Embed]';
        for (const embed of msg.embeds) {
          if (embed.title) content += ` Title: ${embed.title}`;
          if (embed.description) content += ` Desc: ${embed.description.substring(0, 100)}`;
        }
      }

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
 * Create ticket channel (standard channel-based ticket)
 */
async function createTicketChannel(interaction, panel, categoryConfig, formResponses = []) {
  const { guild, user } = interaction;

  // Check limits
  const existingTickets = await Ticket.countDocuments({
    guildId: guild.id,
    userId: user.id,
    status: 'open'
  });

  const maxTickets = panel.limits?.maxTicketsPerUser || 1;
  if (existingTickets >= maxTickets) {
    return { success: false, error: `You already have the maximum number of open tickets (${maxTickets}).` };
  }

  // Check role requirements
  if (panel.limits?.requireRoles?.length > 0) {
    const member = await guild.members.fetch(user.id);
    const hasRequired = panel.limits.requireRoles.some(roleId => member.roles.cache.has(roleId));
    if (!hasRequired) {
      return { success: false, error: 'You do not have the required role to create tickets.' };
    }
  }

  // Check blacklist
  if (panel.limits?.blacklistRoles?.length > 0) {
    const member = await guild.members.fetch(user.id);
    const isBlacklisted = panel.limits.blacklistRoles.some(roleId => member.roles.cache.has(roleId));
    if (isBlacklisted) {
      return { success: false, error: 'You are not allowed to create tickets.' };
    }
  }

  const ticketNumber = await getNextTicketNumber(guild.id);
  const channelName = (panel.settings?.namingScheme || 'ticket-{number}')
    .replace('{number}', ticketNumber.toString().padStart(4, '0'))
    .replace('{user}', user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .replace('{category}', (categoryConfig?.name || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-'));

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
  const staffRoles = [
    ...(categoryConfig?.staffRoles || []),
    ...(panel.permissions?.supportRoles || []),
    ...(panel.permissions?.adminRoles || [])
  ];

  for (const roleId of [...new Set(staffRoles)]) {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
    });
  }

  try {
    let ticketChannel;
    let threadId = null;

    // Create based on style
    if (panel.style?.type === 'thread' && panel.style.threadParentId) {
      // Thread-style ticket
      const parentChannel = guild.channels.cache.get(panel.style.threadParentId);
      if (!parentChannel) {
        return { success: false, error: 'Thread parent channel not found.' };
      }

      const thread = await parentChannel.threads.create({
        name: channelName,
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Ticket created by ${user.tag}`
      });

      ticketChannel = thread;
      threadId = thread.id;
    } else {
      // Standard channel-style ticket
      ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: panel.settings?.categoryId || null,
        permissionOverwrites
      });
    }

    // Create ticket in database
    const ticket = await Ticket.create({
      guildId: guild.id,
      channelId: ticketChannel.id,
      threadId,
      userId: user.id,
      username: user.tag,
      userAvatar: user.displayAvatarURL(),
      ticketNumber,
      category: categoryConfig?.name || 'General',
      categoryId: categoryConfig?.id,
      status: 'open',
      panelId: panel._id,
      formResponses,
      participants: [{ userId: user.id, username: user.tag }]
    });

    // Log the ticket creation
    await ActivityLog.create({
      guildId: guild.id,
      action: 'ticket_created',
      targetUserId: user.id,
      targetUsername: user.tag,
      ticketId: ticket._id,
      ticketNumber,
      panelId: panel._id,
      details: { channelId: ticketChannel.id, category: categoryConfig?.name }
    });

    // Send welcome message
    const welcomeEmbed = new EmbedBuilder()
      .setColor(panel.embed?.color || COLORS.PRIMARY)
      .setTitle(`Ticket #${ticketNumber.toString().padStart(4, '0')}`)
      .setDescription(categoryConfig?.welcomeMessage || panel.embed?.description || 'Thank you for creating a ticket! A staff member will be with you shortly.')
      .addFields(
        { name: 'Created By', value: `<@${user.id}>`, inline: true },
        { name: 'Category', value: categoryConfig?.name || 'General', inline: true },
        { name: 'Status', value: 'Open', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Zyngine Bot' });

    // Add form responses to embed if any
    if (formResponses.length > 0) {
      welcomeEmbed.addFields({ name: '\u200b', value: '**Form Responses:**' });
      for (const fr of formResponses.slice(0, 5)) {
        welcomeEmbed.addFields({
          name: fr.label,
          value: fr.response?.substring(0, 1024) || 'No response',
          inline: false
        });
      }
    }

    // Build control buttons
    const buttons = [];

    if (panel.claiming?.enabled !== false) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🙋')
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    const controlRow = new ActionRowBuilder().addComponents(buttons);

    // Ping roles if configured
    let pingContent = `<@${user.id}>`;
    const pingRoles = categoryConfig?.pingRoles || [];
    if (pingRoles.length > 0) {
      pingContent += ' ' + pingRoles.map(r => `<@&${r}>`).join(' ');
    }

    await ticketChannel.send({ content: pingContent, embeds: [welcomeEmbed], components: [controlRow] });

    // Run automations for ticket_created trigger
    await runAutomations(panel, ticket, ticketChannel, 'ticket_created');

    return { success: true, channel: ticketChannel, ticket };
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    return { success: false, error: 'Failed to create ticket channel. Please check my permissions.' };
  }
}

/**
 * Run automations for a trigger
 */
async function runAutomations(panel, ticket, channel, triggerType, triggerValue = null) {
  if (!panel.automations?.length) return;

  const matchingAutomations = panel.automations.filter(auto =>
    auto.enabled && auto.trigger?.type === triggerType
  );

  for (const automation of matchingAutomations) {
    try {
      for (const action of automation.actions || []) {
        switch (action.type) {
          case 'send_message':
            if (action.value) {
              const message = action.value
                .replace('{user}', `<@${ticket.userId}>`)
                .replace('{ticket}', `#${ticket.ticketNumber}`)
                .replace('{category}', ticket.category || 'General');
              await channel.send(message);
            }
            break;

          case 'close_ticket':
            await closeTicket(channel, channel.guild.members.me.user, 'Auto-closed by automation');
            break;

          case 'ping_role':
            if (action.value) {
              await channel.send(`<@&${action.value}>`);
            }
            break;

          case 'set_priority':
            if (action.value) {
              ticket.priority = action.value;
              await ticket.save();
            }
            break;
        }
      }

      // Log automation
      await ActivityLog.create({
        guildId: channel.guild.id,
        action: 'automation_triggered',
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        details: { automationName: automation.name, triggerType }
      });
    } catch (err) {
      console.error(`Error running automation ${automation.name}:`, err);
    }
  }
}

/**
 * Close a ticket
 */
async function closeTicket(channel, closedBy, reason = 'No reason provided') {
  const ticket = await Ticket.findOne({ channelId: channel.id }).populate('panelId');

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  if (ticket.status === 'closed') {
    return { success: false, error: 'This ticket is already closed.' };
  }

  const panel = ticket.panelId;

  // Generate transcript
  let transcript = null;
  if (panel?.transcripts?.enabled !== false) {
    if (panel?.transcripts?.format === 'html') {
      transcript = await generateHtmlTranscript(channel, ticket);
    } else {
      transcript = await generateTextTranscript(channel);
    }
  }

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
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    details: { reason }
  });

  // Send transcript to transcript channel if configured
  if (transcript && panel?.transcripts?.channelId) {
    try {
      const transcriptChannel = channel.guild.channels.cache.get(panel.transcripts.channelId);
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

        const fileExt = panel.transcripts.format === 'html' ? 'html' : 'txt';
        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [{
            attachment: Buffer.from(transcript, 'utf-8'),
            name: `ticket-${ticket.ticketNumber}.${fileExt}`
          }]
        });
      }
    } catch (err) {
      console.error('Error sending transcript:', err);
    }
  }

  // DM transcript to user if configured
  console.log('Transcript DM check:', {
    hasTranscript: !!transcript,
    hasPanelTranscripts: !!panel?.transcripts,
    dmToUser: panel?.transcripts?.dmToUser,
    panelId: panel?._id
  });

  if (transcript && panel?.transcripts?.dmToUser) {
    try {
      const ticketUser = await channel.guild.members.fetch(ticket.userId);
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle('Your Ticket Has Been Closed')
        .setDescription(`Ticket #${ticket.ticketNumber} in **${channel.guild.name}** has been closed.`)
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      const fileExt = panel?.transcripts?.format === 'html' ? 'html' : 'txt';
      await ticketUser.send({
        embeds: [dmEmbed],
        files: [{
          attachment: Buffer.from(transcript, 'utf-8'),
          name: `ticket-${ticket.ticketNumber}-transcript.${fileExt}`
        }]
      });
      console.log('Transcript DM sent successfully to', ticket.userId);
    } catch (err) {
      console.error('Error sending transcript DM:', err.message);
    }
  }

  // Handle channel deletion/modification
  if (panel?.settings?.deleteOnClose) {
    try {
      await channel.delete(`Ticket closed by ${closedBy.tag}`);
      return { success: true, ticket, transcript, deleted: true };
    } catch (err) {
      console.error('Error deleting channel:', err);
    }
  } else {
    try {
      await channel.setName(`closed-${ticket.ticketNumber.toString().padStart(4, '0')}`);
      await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false });
    } catch (err) {
      console.error('Error updating channel:', err);
    }
  }

  // Send feedback request if enabled
  if (panel?.settings?.feedbackEnabled) {
    const feedbackEmbed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('Ticket Feedback')
      .setDescription(panel.settings.feedbackMessage || 'How would you rate your support experience?');

    const feedbackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('feedback_1').setLabel('1').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('feedback_2').setLabel('2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('feedback_3').setLabel('3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('feedback_4').setLabel('4').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('feedback_5').setLabel('5').setStyle(ButtonStyle.Success)
    );

    try {
      await channel.send({ content: `<@${ticket.userId}>`, embeds: [feedbackEmbed], components: [feedbackRow] });
    } catch (err) {
      console.error('Error sending feedback request:', err);
    }
  }

  return { success: true, ticket, transcript };
}

/**
 * Claim a ticket
 */
async function claimTicket(channel, claimedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id }).populate('panelId');

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  if (ticket.status !== 'open') {
    return { success: false, error: 'This ticket is not open.' };
  }

  if (ticket.claimedBy) {
    return { success: false, error: `This ticket is already claimed by <@${ticket.claimedBy}>.` };
  }

  const panel = ticket.panelId;

  // Check if staff-only claiming is enabled
  if (panel?.claiming?.staffOnlyClaimEnabled) {
    const member = await channel.guild.members.fetch(claimedBy.id);
    const staffRoles = [
      ...(panel.permissions?.supportRoles || []),
      ...(panel.permissions?.adminRoles || [])
    ];
    const isStaff = staffRoles.some(roleId => member.roles.cache.has(roleId));
    if (!isStaff && ticket.userId !== claimedBy.id) {
      return { success: false, error: 'Only staff members can claim tickets.' };
    }
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
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber
  });

  // Send claim message
  const claimMessage = (panel?.claiming?.claimMessage || 'This ticket has been claimed by {user}.')
    .replace('{user}', `<@${claimedBy.id}>`);

  await channel.send(claimMessage);

  // Run automations
  await runAutomations(panel, ticket, channel, 'ticket_claimed');

  return { success: true, ticket };
}

/**
 * Unclaim a ticket
 */
async function unclaimTicket(channel, unclaimedBy) {
  const ticket = await Ticket.findOne({ channelId: channel.id }).populate('panelId');

  if (!ticket) {
    return { success: false, error: 'This channel is not a ticket.' };
  }

  if (!ticket.claimedBy) {
    return { success: false, error: 'This ticket is not claimed.' };
  }

  const panel = ticket.panelId;
  if (panel?.claiming?.unclaimEnabled === false) {
    return { success: false, error: 'Unclaiming is disabled for this panel.' };
  }

  const previousClaimer = ticket.claimedBy;
  ticket.claimedBy = null;
  ticket.claimedByUsername = null;
  ticket.claimedAt = null;
  await ticket.save();

  await ActivityLog.create({
    guildId: channel.guild.id,
    action: 'ticket_unclaimed',
    targetUserId: ticket.userId,
    performedBy: unclaimedBy.id,
    performedByUsername: unclaimedBy.tag,
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    details: { previousClaimer }
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

  if (ticket.participants.some(p => p.userId === user.id)) {
    return { success: false, error: 'This user is already in the ticket.' };
  }

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

    await ActivityLog.create({
      guildId: channel.guild.id,
      action: 'ticket_user_added',
      targetUserId: user.id,
      targetUsername: user.tag,
      performedBy: addedBy.id,
      performedByUsername: addedBy.tag,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber
    });

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

  if (ticket.userId === user.id) {
    return { success: false, error: 'Cannot remove the ticket creator.' };
  }

  const participantIndex = ticket.participants.findIndex(p => p.userId === user.id);
  if (participantIndex === -1) {
    return { success: false, error: 'This user is not in the ticket.' };
  }

  try {
    await channel.permissionOverwrites.delete(user.id);

    ticket.participants.splice(participantIndex, 1);
    await ticket.save();

    await ActivityLog.create({
      guildId: channel.guild.id,
      action: 'ticket_user_removed',
      targetUserId: user.id,
      targetUsername: user.tag,
      performedBy: removedBy.id,
      performedByUsername: removedBy.tag,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber
    });

    return { success: true, ticket };
  } catch (error) {
    console.error('Error removing user from ticket:', error);
    return { success: false, error: 'Failed to remove user from ticket.' };
  }
}

/**
 * Build form modal for ticket creation
 */
function buildFormModal(panel, categoryConfig, customId) {
  const forms = categoryConfig?.forms?.length > 0 ? categoryConfig.forms : panel.forms || [];

  if (forms.length === 0) return null;

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Ticket Form');

  // Discord allows max 5 text inputs per modal
  const limitedForms = forms.slice(0, 5);

  for (const form of limitedForms) {
    const input = new TextInputBuilder()
      .setCustomId(form.id)
      .setLabel(form.label.substring(0, 45))
      .setStyle(form.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(form.required || false);

    if (form.placeholder) input.setPlaceholder(form.placeholder.substring(0, 100));
    if (form.minLength) input.setMinLength(form.minLength);
    if (form.maxLength) input.setMaxLength(form.maxLength);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
  }

  return modal;
}

/**
 * Send panel message to channel
 */
async function sendPanelMessage(channel, panel) {
  const embed = new EmbedBuilder()
    .setColor(panel.embed?.color || '#5865F2')
    .setTitle(panel.embed?.title || panel.name)
    .setDescription(panel.embed?.description || 'Click the button below to create a support ticket.');

  if (panel.embed?.thumbnail) embed.setThumbnail(panel.embed.thumbnail);
  if (panel.embed?.image) embed.setImage(panel.embed.image);
  if (panel.embed?.footer) embed.setFooter({ text: panel.embed.footer });

  let components = [];

  if (panel.style?.type === 'dropdown' && panel.categories?.length > 0) {
    // Dropdown style
    const options = panel.categories.map(cat => ({
      label: cat.name,
      description: cat.description?.substring(0, 100) || undefined,
      value: cat.id,
      emoji: cat.emoji || undefined
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_dropdown_${panel._id}`)
      .setPlaceholder(panel.style.dropdownPlaceholder || 'Select a category...')
      .addOptions(options);

    components.push(new ActionRowBuilder().addComponents(selectMenu));
  } else if (panel.categories?.length > 1) {
    // Multi-category buttons
    const buttonsPerRow = panel.multiPanel?.buttonsPerRow || 5;
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const cat of panel.categories) {
      const button = new ButtonBuilder()
        .setCustomId(`ticket_cat_${panel._id}_${cat.id}`)
        .setLabel(cat.buttonLabel || cat.name)
        .setStyle(ButtonStyle[cat.buttonStyle || 'Primary']);

      if (cat.emoji) button.setEmoji(cat.emoji);

      currentRow.addComponents(button);
      buttonCount++;

      if (buttonCount >= buttonsPerRow) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
        buttonCount = 0;
      }
    }

    if (buttonCount > 0) {
      components.push(currentRow);
    }
  } else {
    // Single button
    const button = new ButtonBuilder()
      .setCustomId(`ticket_create_${panel._id}`)
      .setLabel(panel.button?.label || 'Create Ticket')
      .setStyle(ButtonStyle[panel.button?.style || 'Primary']);

    if (panel.button?.emoji) button.setEmoji(panel.button.emoji);

    components.push(new ActionRowBuilder().addComponents(button));
  }

  const message = await channel.send({ embeds: [embed], components });

  // Update panel with message ID
  panel.messageId = message.id;
  await panel.save();

  return message;
}

/**
 * Handle ticket button interactions
 */
async function handleTicketButton(interaction) {
  const { customId, user, channel, guild } = interaction;

  // Close button
  if (customId === 'ticket_close') {
    await interaction.deferReply();
    const result = await closeTicket(channel, user);

    if (result.success) {
      if (result.deleted) {
        return; // Channel was deleted
      }
      return interaction.editReply({
        embeds: [successEmbed('Ticket Closed', `This ticket has been closed by <@${user.id}>.`)]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }

  // Claim button
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

  // Unclaim button
  if (customId === 'ticket_unclaim') {
    await interaction.deferReply();
    const result = await unclaimTicket(channel, user);

    if (result.success) {
      return interaction.editReply({
        embeds: [successEmbed('Ticket Unclaimed', 'This ticket is no longer claimed.')]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }

  // Feedback buttons
  if (customId.startsWith('feedback_')) {
    const rating = parseInt(customId.split('_')[1]);
    const ticket = await Ticket.findOne({ channelId: channel.id });

    if (ticket) {
      ticket.feedback = { rating, submittedAt: new Date() };
      await ticket.save();

      await ActivityLog.create({
        guildId: guild.id,
        action: 'ticket_feedback',
        targetUserId: ticket.userId,
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        details: { rating }
      });

      return interaction.reply({
        embeds: [successEmbed('Thank You!', `You rated this ticket ${rating}/5 stars.`)],
        ephemeral: true
      });
    }
  }

  // Create ticket button (single category)
  if (customId.startsWith('ticket_create_')) {
    const panelId = customId.replace('ticket_create_', '');
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket panel no longer exists.')], ephemeral: true });
    }

    const categoryConfig = panel.categories?.[0] || { name: 'General', id: 'default' };
    const forms = categoryConfig.forms?.length > 0 ? categoryConfig.forms : panel.forms || [];

    // If forms exist, show modal
    if (forms.length > 0) {
      const modal = buildFormModal(panel, categoryConfig, `ticket_form_${panelId}_${categoryConfig.id}`);
      if (modal) {
        return interaction.showModal(modal);
      }
    }

    // Otherwise create ticket directly
    await interaction.deferReply({ ephemeral: true });
    const result = await createTicketChannel(interaction, panel, categoryConfig);

    if (result.success) {
      return interaction.editReply({
        embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${result.channel.id}>`)]
      });
    } else {
      return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
    }
  }

  // Category button (multi-category)
  if (customId.startsWith('ticket_cat_')) {
    // Format: ticket_cat_<panelId>_<catId> where catId may contain underscores
    const withoutPrefix = customId.slice('ticket_cat_'.length);
    const panelId = withoutPrefix.slice(0, 24); // MongoDB ObjectId is 24 chars
    const catId = withoutPrefix.slice(25); // Skip panelId + underscore
    const panel = await TicketPanel.findById(panelId);

    if (!panel) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket panel no longer exists.')], ephemeral: true });
    }

    const categoryConfig = panel.categories.find(c => c.id === catId) || panel.categories[0];
    const forms = categoryConfig?.forms?.length > 0 ? categoryConfig.forms : panel.forms || [];

    if (forms.length > 0) {
      const modal = buildFormModal(panel, categoryConfig, `ticket_form_${panelId}_${catId}`);
      if (modal) {
        return interaction.showModal(modal);
      }
    }

    await interaction.deferReply({ ephemeral: true });
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

/**
 * Handle dropdown selection
 */
async function handleTicketDropdown(interaction) {
  const { customId, values, user } = interaction;

  if (!customId.startsWith('ticket_dropdown_')) return;

  const panelId = customId.replace('ticket_dropdown_', '');
  const catId = values[0];

  const panel = await TicketPanel.findById(panelId);
  if (!panel) {
    return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket panel no longer exists.')], ephemeral: true });
  }

  const categoryConfig = panel.categories.find(c => c.id === catId) || panel.categories[0];
  const forms = categoryConfig?.forms?.length > 0 ? categoryConfig.forms : panel.forms || [];

  if (forms.length > 0) {
    const modal = buildFormModal(panel, categoryConfig, `ticket_form_${panelId}_${catId}`);
    if (modal) {
      return interaction.showModal(modal);
    }
  }

  await interaction.deferReply({ ephemeral: true });
  const result = await createTicketChannel(interaction, panel, categoryConfig);

  if (result.success) {
    return interaction.editReply({
      embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${result.channel.id}>`)]
    });
  } else {
    return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
  }
}

/**
 * Handle form modal submission
 */
async function handleTicketFormSubmit(interaction) {
  const { customId, fields, user } = interaction;

  if (!customId.startsWith('ticket_form_')) return;

  // Format: ticket_form_<panelId>_<catId> where catId may contain underscores
  const withoutPrefix = customId.slice('ticket_form_'.length);
  const panelId = withoutPrefix.slice(0, 24); // MongoDB ObjectId is 24 chars
  const catId = withoutPrefix.slice(25); // Skip panelId + underscore

  const panel = await TicketPanel.findById(panelId);
  if (!panel) {
    return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket panel no longer exists.')], ephemeral: true });
  }

  const categoryConfig = panel.categories?.find(c => c.id === catId) || panel.categories?.[0] || { name: 'General', id: 'default' };
  const formDefs = categoryConfig?.forms?.length > 0 ? categoryConfig.forms : panel.forms || [];

  // Collect form responses
  const formResponses = [];
  for (const formDef of formDefs) {
    try {
      const value = fields.getTextInputValue(formDef.id);
      formResponses.push({
        formId: formDef.id,
        label: formDef.label,
        response: value
      });
    } catch (e) {
      // Field might not exist
    }
  }

  await interaction.deferReply({ ephemeral: true });
  const result = await createTicketChannel(interaction, panel, categoryConfig, formResponses);

  if (result.success) {
    return interaction.editReply({
      embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${result.channel.id}>`)]
    });
  } else {
    return interaction.editReply({ embeds: [errorEmbed('Error', result.error)] });
  }
}

module.exports = {
  getNextTicketNumber,
  createTicketChannel,
  closeTicket,
  claimTicket,
  unclaimTicket,
  addUserToTicket,
  removeUserFromTicket,
  handleTicketButton,
  handleTicketDropdown,
  handleTicketFormSubmit,
  sendPanelMessage,
  buildFormModal,
  generateHtmlTranscript,
  generateTextTranscript,
  runAutomations
};
