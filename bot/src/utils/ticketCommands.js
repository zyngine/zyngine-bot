const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Ticket, TicketPanel, TicketNote, ActivityLog } = require('../schemas');
const { closeTicket, claimTicket, unclaimTicket, generateHtmlTranscript } = require('./ticketHandler');
const { successEmbed, errorEmbed, COLORS } = require('./embeds');

/**
 * Handle $ commands in ticket channels
 */
async function handleTicketCommand(message) {
  // Ignore bots
  if (message.author.bot) return;

  // Check if message starts with $
  if (!message.content.startsWith('$')) return;

  // Parse command and arguments
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  // Find if this channel is a ticket
  const ticket = await Ticket.findOne({
    channelId: message.channel.id,
    status: { $ne: 'closed' }
  });

  if (!ticket) return; // Not a ticket channel

  // Get the panel for permission checking
  const panel = await TicketPanel.findById(ticket.panelId);

  // Check if user has permission (staff role or admin)
  const member = message.member;
  const isStaff = panel?.permissions?.supportRoles?.some(roleId =>
    member.roles.cache.has(roleId)
  ) || member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isStaff) {
    // Only ticket creator can use limited commands
    if (ticket.creatorId !== message.author.id) return;

    // Limited commands for ticket creator
    if (!['close'].includes(command)) return;
  }

  try {
    switch (command) {
      case 'close':
      case 'delete':
        await handleClose(message, ticket, args.join(' '));
        break;

      case 'rename':
        await handleRename(message, ticket, args.join(' '));
        break;

      case 'add':
        await handleAddUser(message, ticket, args[0]);
        break;

      case 'remove':
        await handleRemoveUser(message, ticket, args[0]);
        break;

      case 'claim':
        await handleClaim(message, ticket);
        break;

      case 'unclaim':
        await handleUnclaim(message, ticket);
        break;

      case 'priority':
        await handlePriority(message, ticket, args[0]);
        break;

      case 'note':
        await handleNote(message, ticket, args.join(' '));
        break;

      case 'transfer':
        await handleTransfer(message, ticket, args[0]);
        break;

      case 'ping':
        await handlePing(message, ticket);
        break;

      case 'help':
        await handleHelp(message, isStaff);
        break;

      default:
        // Unknown command - silently ignore
        break;
    }
  } catch (error) {
    console.error(`Error handling ticket command $${command}:`, error);
    await message.reply({
      embeds: [errorEmbed('An error occurred while executing that command.')],
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
  }
}

/**
 * $close / $delete - Close the ticket with optional reason
 */
async function handleClose(message, ticket, reason) {
  // Delete command message
  await message.delete().catch(() => {});

  const confirmMsg = await message.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.warning)
      .setDescription(`Are you sure you want to close this ticket?${reason ? `\n**Reason:** ${reason}` : ''}\n\nReact with ✅ to confirm or ❌ to cancel.`)
    ],
    allowedMentions: { repliedUser: false }
  });

  await confirmMsg.react('✅');
  await confirmMsg.react('❌');

  const filter = (reaction, user) =>
    ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;

  try {
    const collected = await confirmMsg.awaitReactions({ filter, max: 1, time: 30000 });
    const reaction = collected.first();

    if (reaction?.emoji.name === '✅') {
      await confirmMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.info)
          .setDescription('Closing ticket and generating transcript...')
        ]
      });

      // Generate transcript
      const transcript = await generateHtmlTranscript(message.channel, ticket);

      // Close the ticket
      await closeTicket(message.channel, ticket, message.author, reason, transcript);
    } else {
      await confirmMsg.edit({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.error)
          .setDescription('Ticket close cancelled.')
        ]
      });
      setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
    }
  } catch (error) {
    await confirmMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.error)
        .setDescription('Confirmation timed out. Ticket close cancelled.')
      ]
    });
    setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
  }
}

/**
 * $rename <new name> - Rename the ticket channel
 */
async function handleRename(message, ticket, newName) {
  if (!newName) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$rename <new name>`\nExample: `$rename billing-issue`')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete the command message immediately
  await message.delete().catch(() => {});

  // Sanitize channel name - replace spaces with dashes, remove special chars
  const sanitized = newName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '')     // Remove special characters
    .replace(/-+/g, '-')            // Collapse multiple dashes
    .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
    .substring(0, 80);

  const channelName = `ticket-${ticket.ticketNumber}-${sanitized}`;
  const oldName = message.channel.name;

  await message.channel.setName(channelName);

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_rename',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber, oldName, newName: channelName }
  });

  // Send temporary confirmation
  const confirmMsg = await message.channel.send({
    embeds: [successEmbed(`Ticket renamed to **${channelName}**`)]
  });
  setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
}

/**
 * $add <@user> - Add a user to the ticket
 */
async function handleAddUser(message, ticket, userMention) {
  const user = message.mentions.users.first();
  if (!user) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$add @user`')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  // Add permission to view the channel
  await message.channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true
  });

  // Update ticket participants
  await Ticket.findByIdAndUpdate(ticket._id, {
    $addToSet: { participants: { odId: user.id, odUsername: user.username, addedAt: new Date() } }
  });

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_add_user',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber, addedUser: user.username, addedUserId: user.id }
  });

  await message.channel.send({
    embeds: [successEmbed(`${message.author} added ${user} to the ticket.`)]
  });
}

/**
 * $remove <@user> - Remove a user from the ticket
 */
async function handleRemoveUser(message, ticket, userMention) {
  const user = message.mentions.users.first();
  if (!user) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$remove @user`')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Don't allow removing the ticket creator
  if (user.id === ticket.creatorId) {
    return message.reply({
      embeds: [errorEmbed('Cannot remove the ticket creator.')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  // Remove permission
  await message.channel.permissionOverwrites.delete(user.id);

  // Update ticket participants
  await Ticket.findByIdAndUpdate(ticket._id, {
    $pull: { participants: { odId: user.id } }
  });

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_remove_user',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber, removedUser: user.username, removedUserId: user.id }
  });

  await message.channel.send({
    embeds: [successEmbed(`${message.author} removed ${user} from the ticket.`)]
  });
}

/**
 * $claim - Claim the ticket
 */
async function handleClaim(message, ticket) {
  if (ticket.claimedBy) {
    return message.reply({
      embeds: [errorEmbed(`This ticket is already claimed by <@${ticket.claimedBy}>.`)],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  await Ticket.findByIdAndUpdate(ticket._id, {
    claimedBy: message.author.id,
    claimedByUsername: message.author.username,
    claimedAt: new Date()
  });

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_claim',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber }
  });

  await message.channel.send({
    embeds: [successEmbed(`${message.author} has claimed this ticket.`)]
  });
}

/**
 * $unclaim - Unclaim the ticket
 */
async function handleUnclaim(message, ticket) {
  if (!ticket.claimedBy) {
    return message.reply({
      embeds: [errorEmbed('This ticket is not claimed.')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Only the claimer or admins can unclaim
  if (ticket.claimedBy !== message.author.id &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply({
      embeds: [errorEmbed('Only the staff member who claimed this ticket can unclaim it.')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  await Ticket.findByIdAndUpdate(ticket._id, {
    $unset: { claimedBy: 1, claimedByUsername: 1, claimedAt: 1 }
  });

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_unclaim',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber }
  });

  await message.channel.send({
    embeds: [successEmbed(`${message.author} has unclaimed this ticket. It is now available.`)]
  });
}

/**
 * $priority <low|medium|high|urgent> - Set ticket priority
 */
async function handlePriority(message, ticket, priority) {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  if (!priority || !validPriorities.includes(priority.toLowerCase())) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$priority <low|medium|high|urgent>`')],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  const newPriority = priority.toLowerCase();
  const oldPriority = ticket.priority || 'medium';

  await Ticket.findByIdAndUpdate(ticket._id, {
    priority: newPriority
  });

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_priority',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber, oldPriority, newPriority }
  });

  const priorityColors = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  };

  await message.channel.send({
    embeds: [successEmbed(`${message.author} set priority to ${priorityColors[newPriority]} **${newPriority.toUpperCase()}**`)]
  });
}

/**
 * $note <message> - Add an internal note
 */
async function handleNote(message, ticket, noteContent) {
  if (!noteContent) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$note <your note>`')],
      allowedMentions: { repliedUser: false }
    });
  }

  await TicketNote.create({
    guildId: ticket.guildId,
    ticketId: ticket._id,
    authorId: message.author.id,
    authorUsername: message.author.username,
    content: noteContent
  });

  // Delete the command message to keep notes private
  await message.delete().catch(() => {});

  // Send confirmation that auto-deletes
  const confirmMsg = await message.channel.send({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription(`📝 Internal note added by ${message.author}`)
      .setFooter({ text: 'This message will be deleted in 5 seconds' })
    ]
  });

  setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
}

/**
 * $transfer <category> - Transfer ticket to another category
 */
async function handleTransfer(message, ticket, categoryName) {
  if (!categoryName) {
    return message.reply({
      embeds: [errorEmbed('Usage: `$transfer <category name>`')],
      allowedMentions: { repliedUser: false }
    });
  }

  const panel = await TicketPanel.findById(ticket.panelId);
  if (!panel) {
    return message.reply({
      embeds: [errorEmbed('Could not find the panel for this ticket.')],
      allowedMentions: { repliedUser: false }
    });
  }

  const category = panel.categories?.find(c =>
    c.name.toLowerCase() === categoryName.toLowerCase()
  );

  if (!category) {
    const available = panel.categories?.map(c => c.name).join(', ') || 'None';
    return message.reply({
      embeds: [errorEmbed(`Category not found. Available: ${available}`)],
      allowedMentions: { repliedUser: false }
    });
  }

  // Delete command message
  await message.delete().catch(() => {});

  const oldCategory = ticket.category;

  await Ticket.findByIdAndUpdate(ticket._id, {
    category: category.name,
    categoryId: category.id
  });

  // Move to new Discord category if configured
  if (category.categoryId) {
    await message.channel.setParent(category.categoryId, { lockPermissions: false }).catch(() => {});
  }

  // Log the action
  await ActivityLog.create({
    guildId: ticket.guildId,
    actionType: 'ticket_transfer',
    user: { odId: message.author.id, odUsername: message.author.username },
    details: { ticketNumber: ticket.ticketNumber, oldCategory, newCategory: category.name }
  });

  await message.channel.send({
    embeds: [successEmbed(`${message.author} transferred ticket to **${category.name}**`)]
  });
}

/**
 * $ping - Ping the ticket creator
 */
async function handlePing(message, ticket) {
  await message.channel.send({
    content: `<@${ticket.creatorId}>`,
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription(`${message.author} is requesting your attention in this ticket.`)
    ]
  });

  // Delete the command message
  await message.delete().catch(() => {});
}

/**
 * $help - Show available commands
 */
async function handleHelp(message, isStaff) {
  const staffCommands = `
**Staff Commands:**
\`$close [reason]\` - Close the ticket with transcript
\`$delete [reason]\` - Same as $close
\`$rename <name>\` - Rename the ticket channel
\`$add @user\` - Add a user to the ticket
\`$remove @user\` - Remove a user from the ticket
\`$claim\` - Claim the ticket
\`$unclaim\` - Release the ticket
\`$priority <level>\` - Set priority (low/medium/high/urgent)
\`$note <text>\` - Add internal note (hidden from user)
\`$transfer <category>\` - Move to another category
\`$ping\` - Ping the ticket creator
`;

  const userCommands = `
**User Commands:**
\`$close\` - Request to close your ticket
`;

  await message.reply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('Ticket Commands')
      .setDescription(isStaff ? staffCommands : userCommands)
      .setFooter({ text: 'All commands start with $' })
    ],
    allowedMentions: { repliedUser: false }
  });
}

module.exports = { handleTicketCommand };
