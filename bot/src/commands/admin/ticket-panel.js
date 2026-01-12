const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { TicketPanel } = require('../../schemas');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');
const { sendPanelMessage } = require('../../utils/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Manage ticket panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new ticket panel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Channel to send the panel to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
      .addStringOption(o => o
        .setName('name')
        .setDescription('Panel name')
        .setRequired(true))
      .addStringOption(o => o
        .setName('description')
        .setDescription('Panel description')
        .setRequired(true))
      .addStringOption(o => o
        .setName('category-name')
        .setDescription('Ticket category name (e.g., Support, Sales)')
        .setRequired(true))
      .addStringOption(o => o
        .setName('emoji')
        .setDescription('Button emoji')
        .setRequired(false))
      .addRoleOption(o => o
        .setName('staff-role')
        .setDescription('Staff role that can see tickets')
        .setRequired(false))
      .addChannelOption(o => o
        .setName('ticket-category')
        .setDescription('Category to create tickets in')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false))
      .addChannelOption(o => o
        .setName('transcript-channel')
        .setDescription('Channel to send transcripts to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))
      .addChannelOption(o => o
        .setName('log-channel')
        .setDescription('Channel to send ticket logs to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('deploy')
      .setDescription('Deploy a panel created from the dashboard')
      .addStringOption(o => o
        .setName('panel-id')
        .setDescription('The panel ID to deploy')
        .setRequired(true)
        .setAutocomplete(true))
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Channel to send the panel to (uses configured channel if not specified)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Delete a ticket panel')
      .addStringOption(o => o
        .setName('panel-id')
        .setDescription('The panel ID to delete')
        .setRequired(true)
        .setAutocomplete(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all ticket panels'))
    .addSubcommand(sub => sub
      .setName('refresh')
      .setDescription('Refresh/resend a panel message')
      .addStringOption(o => o
        .setName('panel-id')
        .setDescription('The panel ID to refresh')
        .setRequired(true)
        .setAutocomplete(true))
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('New channel for the panel (optional)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))),
  cooldown: 5,

  // Autocomplete for panel IDs
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const panels = await TicketPanel.find({ guildId: interaction.guild.id });

    const filtered = panels
      .filter(p => p.name.toLowerCase().includes(focused) || p._id.toString().includes(focused))
      .slice(0, 25);

    await interaction.respond(
      filtered.map(p => ({
        name: `${p.name} (${p.categories?.length || 0} categories)`,
        value: p._id.toString()
      }))
    );
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel('channel');
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const categoryName = interaction.options.getString('category-name');
      const emoji = interaction.options.getString('emoji') || '🎫';
      const staffRole = interaction.options.getRole('staff-role');
      const ticketCategory = interaction.options.getChannel('ticket-category');
      const transcriptChannel = interaction.options.getChannel('transcript-channel');
      const logChannel = interaction.options.getChannel('log-channel');

      // Check bot permissions in the target channel
      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return interaction.editReply({
          embeds: [errorEmbed('Permission Error', 'I need Send Messages and Embed Links permissions in that channel.')]
        });
      }

      try {
        // Create the panel
        const panel = new TicketPanel({
          guildId: interaction.guild.id,
          channelId: channel.id,
          name,
          description,
          embed: {
            title: name,
            description: description,
            color: COLORS.PRIMARY
          },
          button: {
            label: 'Open Ticket',
            emoji: emoji,
            style: 'Primary'
          },
          categories: [{
            id: categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: categoryName,
            description: `${categoryName} tickets`,
            emoji,
            staffRoles: staffRole ? [staffRole.id] : [],
            welcomeMessage: `Thank you for creating a ${categoryName} ticket! A staff member will be with you shortly.`
          }],
          permissions: {
            supportRoles: staffRole ? [staffRole.id] : []
          },
          settings: {
            categoryId: ticketCategory?.id || null,
            namingScheme: 'ticket-{number}',
            autoCloseHours: 0
          },
          transcripts: {
            enabled: true,
            channelId: transcriptChannel?.id || null,
            dmToUser: true,
            format: 'html'
          },
          logging: {
            enabled: true,
            channelId: logChannel?.id || null
          }
        });

        // Save to get the ID
        await panel.save();

        // Send the panel message
        await sendPanelMessage(channel, panel);

        const successEmb = successEmbed(
          'Ticket Panel Created',
          `Panel **${name}** has been created in ${channel}.`
        );
        successEmb.addFields(
          { name: 'Panel ID', value: `\`${panel._id}\``, inline: true },
          { name: 'Category', value: categoryName, inline: true }
        );

        if (staffRole) {
          successEmb.addFields({ name: 'Staff Role', value: `${staffRole}`, inline: true });
        }

        return interaction.editReply({ embeds: [successEmb] });
      } catch (error) {
        console.error('Error creating ticket panel:', error);
        return interaction.editReply({
          embeds: [errorEmbed('Error', 'Failed to create ticket panel. Please try again.')]
        });
      }
    }

    if (sub === 'deploy') {
      await interaction.deferReply({ ephemeral: true });

      const panelId = interaction.options.getString('panel-id');
      const targetChannel = interaction.options.getChannel('channel');

      try {
        const panel = await TicketPanel.findOne({
          _id: panelId,
          guildId: interaction.guild.id
        });

        if (!panel) {
          return interaction.editReply({
            embeds: [errorEmbed('Not Found', 'No panel found with that ID in this server.')]
          });
        }

        const channel = targetChannel || interaction.guild.channels.cache.get(panel.channelId);
        if (!channel) {
          return interaction.editReply({
            embeds: [errorEmbed('Error', 'Could not find the target channel. Please specify a channel.')]
          });
        }

        // Check bot permissions
        const botPerms = channel.permissionsFor(interaction.guild.members.me);
        if (!botPerms.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
          return interaction.editReply({
            embeds: [errorEmbed('Permission Error', 'I need Send Messages and Embed Links permissions in that channel.')]
          });
        }

        // Update channel ID if different
        if (targetChannel && targetChannel.id !== panel.channelId) {
          panel.channelId = targetChannel.id;
        }

        // Send the panel message
        await sendPanelMessage(channel, panel);

        return interaction.editReply({
          embeds: [successEmbed('Panel Deployed', `Panel **${panel.name}** has been deployed to ${channel}.`)]
        });
      } catch (error) {
        console.error('Error deploying ticket panel:', error);
        return interaction.editReply({
          embeds: [errorEmbed('Error', 'Failed to deploy ticket panel. Please try again.')]
        });
      }
    }

    if (sub === 'refresh') {
      await interaction.deferReply({ ephemeral: true });

      const panelId = interaction.options.getString('panel-id');
      const newChannel = interaction.options.getChannel('channel');

      try {
        const panel = await TicketPanel.findOne({
          _id: panelId,
          guildId: interaction.guild.id
        });

        if (!panel) {
          return interaction.editReply({
            embeds: [errorEmbed('Not Found', 'No panel found with that ID in this server.')]
          });
        }

        // Try to delete old message
        if (panel.messageId) {
          try {
            const oldChannel = interaction.guild.channels.cache.get(panel.channelId);
            if (oldChannel) {
              const oldMessage = await oldChannel.messages.fetch(panel.messageId).catch(() => null);
              if (oldMessage) {
                await oldMessage.delete();
              }
            }
          } catch (err) {
            // Message might already be deleted
          }
        }

        // Update channel if specified
        const channel = newChannel || interaction.guild.channels.cache.get(panel.channelId);
        if (!channel) {
          return interaction.editReply({
            embeds: [errorEmbed('Error', 'Could not find the target channel. Please specify a channel.')]
          });
        }

        if (newChannel) {
          panel.channelId = newChannel.id;
        }

        // Send new panel message
        await sendPanelMessage(channel, panel);

        return interaction.editReply({
          embeds: [successEmbed('Panel Refreshed', `Panel **${panel.name}** has been refreshed in ${channel}.`)]
        });
      } catch (error) {
        console.error('Error refreshing ticket panel:', error);
        return interaction.editReply({
          embeds: [errorEmbed('Error', 'Failed to refresh ticket panel. Please try again.')]
        });
      }
    }

    if (sub === 'delete') {
      await interaction.deferReply({ ephemeral: true });

      const panelId = interaction.options.getString('panel-id');

      try {
        const panel = await TicketPanel.findOne({
          _id: panelId,
          guildId: interaction.guild.id
        });

        if (!panel) {
          return interaction.editReply({
            embeds: [errorEmbed('Not Found', 'No panel found with that ID in this server.')]
          });
        }

        // Try to delete the panel message
        if (panel.messageId) {
          try {
            const channel = interaction.guild.channels.cache.get(panel.channelId);
            if (channel) {
              const message = await channel.messages.fetch(panel.messageId).catch(() => null);
              if (message) {
                await message.delete();
              }
            }
          } catch (err) {
            // Message might already be deleted
          }
        }

        // Delete from database
        await TicketPanel.deleteOne({ _id: panelId });

        return interaction.editReply({
          embeds: [successEmbed('Panel Deleted', `Ticket panel **${panel.name}** has been deleted.`)]
        });
      } catch (error) {
        console.error('Error deleting ticket panel:', error);
        return interaction.editReply({
          embeds: [errorEmbed('Error', 'Failed to delete ticket panel. Make sure the ID is correct.')]
        });
      }
    }

    if (sub === 'list') {
      await interaction.deferReply({ ephemeral: true });

      const panels = await TicketPanel.find({ guildId: interaction.guild.id });

      if (!panels.length) {
        return interaction.editReply({
          embeds: [infoEmbed('No Panels', 'No ticket panels have been created yet.\n\nYou can create panels:\n• From the **dashboard** at your web panel\n• Using `/ticket-panel create` command')]
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Ticket Panels')
        .setDescription(`Found ${panels.length} ticket panel(s) in this server.`)
        .setTimestamp()
        .setFooter({ text: 'Use /ticket-panel deploy to send a panel to a channel' });

      for (const panel of panels.slice(0, 10)) {
        const channel = interaction.guild.channels.cache.get(panel.channelId);
        const categories = panel.categories?.map(c => `${c.emoji || '📝'} ${c.name}`).join(', ') || 'None';
        const hasMessage = panel.messageId ? '✅' : '⚠️ Not deployed';
        const style = panel.style?.type || 'channel';

        embed.addFields({
          name: `${panel.name} ${hasMessage === '✅' ? '' : '(Not Deployed)'}`,
          value: [
            `**ID:** \`${panel._id}\``,
            `**Channel:** ${channel ? `<#${channel.id}>` : 'Not set'}`,
            `**Style:** ${style.charAt(0).toUpperCase() + style.slice(1)}`,
            `**Categories:** ${categories}`,
            `**Forms:** ${panel.forms?.length || 0} global, ${panel.categories?.reduce((acc, c) => acc + (c.forms?.length || 0), 0) || 0} per-category`,
            `**Automations:** ${panel.automations?.length || 0}`
          ].join('\n'),
          inline: false
        });
      }

      if (panels.length > 10) {
        embed.addFields({
          name: '\u200b',
          value: `*...and ${panels.length - 10} more panels. View all in the dashboard.*`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
