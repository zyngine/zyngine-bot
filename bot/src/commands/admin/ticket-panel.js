const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { TicketPanel } = require('../../schemas');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');

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
      .setName('delete')
      .setDescription('Delete a ticket panel')
      .addStringOption(o => o
        .setName('panel-id')
        .setDescription('The panel ID to delete')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all ticket panels')),
  cooldown: 5,

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
        // Create the panel embed
        const panelEmbed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle(name)
          .setDescription(description)
          .addFields(
            { name: 'Category', value: categoryName, inline: true },
            { name: 'How to Open', value: 'Click the button below to create a ticket.', inline: false }
          )
          .setTimestamp()
          .setFooter({ text: 'Zyngine Bot - Ticket System' });

        // Create a temporary panel document to get the ID
        const panel = new TicketPanel({
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: 'pending',
          name,
          description,
          categories: [{
            id: categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: categoryName,
            description: `${categoryName} tickets`,
            emoji,
            staffRoles: staffRole ? [staffRole.id] : [],
            welcomeMessage: `Thank you for creating a ${categoryName} ticket! A staff member will be with you shortly.`
          }],
          settings: {
            categoryId: ticketCategory?.id || null,
            namingScheme: 'ticket-{number}',
            maxTicketsPerUser: 1,
            autoCloseHours: 0,
            transcriptChannelId: transcriptChannel?.id || null,
            logChannelId: logChannel?.id || null
          }
        });

        // Save to get the ID
        await panel.save();

        // Create the button with the panel ID
        const buttonRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket_create_${panel._id}`)
              .setLabel('Open Ticket')
              .setStyle(ButtonStyle.Primary)
              .setEmoji(emoji)
          );

        // Send the panel message
        const panelMessage = await channel.send({
          embeds: [panelEmbed],
          components: [buttonRow]
        });

        // Update the panel with the message ID
        panel.messageId = panelMessage.id;
        await panel.save();

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
          embeds: [infoEmbed('No Panels', 'No ticket panels have been created yet. Use `/ticket-panel create` to create one.')]
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Ticket Panels')
        .setDescription(`Found ${panels.length} ticket panel(s) in this server.`)
        .setTimestamp()
        .setFooter({ text: 'Zyngine Bot' });

      for (const panel of panels) {
        const channel = interaction.guild.channels.cache.get(panel.channelId);
        const categories = panel.categories.map(c => c.name).join(', ') || 'None';

        embed.addFields({
          name: panel.name,
          value: [
            `**ID:** \`${panel._id}\``,
            `**Channel:** ${channel ? `<#${channel.id}>` : 'Unknown'}`,
            `**Categories:** ${categories}`,
            `**Created:** <t:${Math.floor(panel.createdAt.getTime() / 1000)}:R>`
          ].join('\n'),
          inline: true
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
