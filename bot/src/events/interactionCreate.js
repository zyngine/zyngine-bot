const { Collection, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, client);
    } else if (interaction.isButton()) {
      await handleButton(interaction, client);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction, client);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction, client);
    } else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
    }
  },
};

async function handleCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const { cooldowns } = client;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);
      return interaction.reply({
        content: `⏳ Please wait, you can use \`/${command.data.name}\` again <t:${expiredTimestamp}:R>.`,
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const errorEmbed = new EmbedBuilder()
      .setColor('#F04747')
      .setTitle('❌ Error')
      .setDescription('There was an error executing this command.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

async function handleButton(interaction, client) {
  const customId = interaction.customId;

  // Handle role request buttons
  if (customId.startsWith('approve_request:') || customId.startsWith('deny_request:')) {
    const [action, requestId] = customId.split(':');
    const { handleRequestButton } = require('../utils/requestHandler');
    await handleRequestButton(interaction, action, requestId);
    return;
  }

  // Handle button roles
  if (customId.startsWith('buttonrole:')) {
    const [, roleId] = customId.split(':');
    const { handleButtonRole } = require('../utils/buttonRoleHandler');
    await handleButtonRole(interaction, roleId);
    return;
  }

  // Handle all ticket-related buttons
  if (
    customId.startsWith('ticket_') ||
    customId.startsWith('feedback_')
  ) {
    const { handleTicketButton } = require('../utils/ticketHandler');
    await handleTicketButton(interaction);
    return;
  }

  // Handle application buttons (accept/deny)
  if (customId.startsWith('app_accept_') || customId.startsWith('app_deny_')) {
    const { handleApplicationButton } = require('../utils/applicationHandler');
    await handleApplicationButton(interaction);
    return;
  }
}

async function handleSelectMenu(interaction, client) {
  const customId = interaction.customId;

  // Handle ticket dropdown category selection
  if (customId.startsWith('ticket_dropdown_')) {
    const { handleTicketDropdown } = require('../utils/ticketHandler');
    await handleTicketDropdown(interaction);
    return;
  }

  // Handle application selection
  if (customId === 'application_select') {
    const { handleApplicationSelect } = require('../utils/applicationHandler');
    await handleApplicationSelect(interaction);
    return;
  }
}

async function handleModalSubmit(interaction, client) {
  const customId = interaction.customId;

  // Handle ticket form submission
  if (customId.startsWith('ticket_form_')) {
    const { handleTicketFormSubmit } = require('../utils/ticketHandler');
    await handleTicketFormSubmit(interaction);
    return;
  }

  // Handle application form submission
  if (customId.startsWith('application_')) {
    const { handleApplicationSubmit } = require('../utils/applicationHandler');
    await handleApplicationSubmit(interaction);
    return;
  }
}

async function handleAutocomplete(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (command?.autocomplete) {
    try {
      await command.autocomplete(interaction, client);
    } catch (error) {
      console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
    }
  }
}
