const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Ticket } = require('../../schemas');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');
const { closeTicket, claimTicket, addUserToTicket, removeUserFromTicket, generateTranscript } = require('../../utils/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(o => o
        .setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a user to the ticket')
      .addUserOption(o => o
        .setName('user')
        .setDescription('The user to add')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from the ticket')
      .addUserOption(o => o
        .setName('user')
        .setDescription('The user to remove')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('claim')
      .setDescription('Claim the current ticket'))
    .addSubcommand(sub => sub
      .setName('transcript')
      .setDescription('Generate a transcript of the current ticket'))
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Get information about the current ticket')),
  cooldown: 3,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // Check if the current channel is a ticket
    const ticket = await Ticket.findOne({ channelId: interaction.channel.id });

    if (!ticket && sub !== 'info') {
      return interaction.reply({
        embeds: [errorEmbed('Not a Ticket', 'This command can only be used in a ticket channel.')],
        ephemeral: true
      });
    }

    if (sub === 'close') {
      await interaction.deferReply();

      const reason = interaction.options.getString('reason') || 'No reason provided';
      const result = await closeTicket(interaction.channel, interaction.user, reason);

      if (result.success) {
        const embed = successEmbed(
          'Ticket Closed',
          `This ticket has been closed by ${interaction.user}.`
        );
        embed.addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Ticket Number', value: `#${result.ticket.ticketNumber.toString().padStart(4, '0')}`, inline: true }
        );

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          embeds: [errorEmbed('Error', result.error)]
        });
      }
    }

    if (sub === 'add') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');

      if (user.bot) {
        return interaction.editReply({
          embeds: [errorEmbed('Invalid User', 'You cannot add bots to tickets.')]
        });
      }

      const result = await addUserToTicket(interaction.channel, user, interaction.user);

      if (result.success) {
        return interaction.editReply({
          embeds: [successEmbed('User Added', `${user} has been added to this ticket.`)]
        });
      } else {
        return interaction.editReply({
          embeds: [errorEmbed('Error', result.error)]
        });
      }
    }

    if (sub === 'remove') {
      await interaction.deferReply();

      const user = interaction.options.getUser('user');
      const result = await removeUserFromTicket(interaction.channel, user, interaction.user);

      if (result.success) {
        return interaction.editReply({
          embeds: [successEmbed('User Removed', `${user} has been removed from this ticket.`)]
        });
      } else {
        return interaction.editReply({
          embeds: [errorEmbed('Error', result.error)]
        });
      }
    }

    if (sub === 'claim') {
      await interaction.deferReply();

      const result = await claimTicket(interaction.channel, interaction.user);

      if (result.success) {
        const embed = successEmbed(
          'Ticket Claimed',
          `This ticket has been claimed by ${interaction.user}.`
        );
        embed.addFields(
          { name: 'Ticket Number', value: `#${result.ticket.ticketNumber.toString().padStart(4, '0')}`, inline: true },
          { name: 'Original Creator', value: `<@${result.ticket.userId}>`, inline: true }
        );

        return interaction.editReply({ embeds: [embed] });
      } else {
        return interaction.editReply({
          embeds: [errorEmbed('Error', result.error)]
        });
      }
    }

    if (sub === 'transcript') {
      await interaction.deferReply();

      if (!ticket) {
        return interaction.editReply({
          embeds: [errorEmbed('Not a Ticket', 'This command can only be used in a ticket channel.')]
        });
      }

      try {
        const transcript = await generateTranscript(interaction.channel);

        const attachment = new AttachmentBuilder(
          Buffer.from(transcript, 'utf-8'),
          { name: `ticket-${ticket.ticketNumber}-transcript.txt` }
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.INFO)
          .setTitle(`Ticket #${ticket.ticketNumber.toString().padStart(4, '0')} - Transcript`)
          .setDescription('Here is the transcript for this ticket.')
          .addFields(
            { name: 'Ticket Creator', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Category', value: ticket.category || 'General', inline: true },
            { name: 'Status', value: ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1), inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Zyngine Bot' });

        return interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch (error) {
        console.error('Error generating transcript:', error);
        return interaction.editReply({
          embeds: [errorEmbed('Error', 'Failed to generate transcript.')]
        });
      }
    }

    if (sub === 'info') {
      if (!ticket) {
        return interaction.reply({
          embeds: [errorEmbed('Not a Ticket', 'This command can only be used in a ticket channel.')],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`Ticket #${ticket.ticketNumber.toString().padStart(4, '0')} - Info`)
        .addFields(
          { name: 'Created By', value: `<@${ticket.userId}>`, inline: true },
          { name: 'Category', value: ticket.category || 'General', inline: true },
          { name: 'Status', value: ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1), inline: true },
          { name: 'Priority', value: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1), inline: true },
          { name: 'Created', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Zyngine Bot' });

      if (ticket.claimedBy) {
        embed.addFields({
          name: 'Claimed By',
          value: `<@${ticket.claimedBy}>`,
          inline: true
        });
      }

      if (ticket.participants.length > 1) {
        const participantList = ticket.participants
          .map(p => `<@${p.userId}>`)
          .join(', ');
        embed.addFields({
          name: 'Participants',
          value: participantList,
          inline: false
        });
      }

      if (ticket.status === 'closed') {
        embed.addFields(
          { name: 'Closed By', value: `<@${ticket.closedBy}>`, inline: true },
          { name: 'Closed At', value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>`, inline: true }
        );
        if (ticket.closeReason) {
          embed.addFields({ name: 'Close Reason', value: ticket.closeReason, inline: false });
        }
      }

      return interaction.reply({ embeds: [embed] });
    }
  }
};
