const { Collection, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../../shared/schemas');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, client);
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      await handleButton(interaction, client);
    }
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction, client);
    }
    // Handle autocomplete
    else if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction, client);
    }
  },
};

async function handleCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  // Cooldown handling
  const { cooldowns } = client;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldown = 3;
  const cooldownAmount = (command.cooldown ?? defaultCooldown) * 1000;

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
      .setDescription('There was an error executing this command. Please try again later.')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

async function handleButton(interaction, client) {
  const [action, ...params] = interaction.customId.split(':');

  // Handle role request approval/denial buttons
  if (action === 'approve_request' || action === 'deny_request') {
    const requestId = params[0];
    
    // Import and use the appropriate handler
    const { handleRequestButton } = require('../utils/requestHandler');
    await handleRequestButton(interaction, action, requestId);
    return;
  }

  // Handle button roles
  if (action === 'buttonrole') {
    const roleId = params[0];
    const { handleButtonRole } = require('../utils/buttonRoleHandler');
    await handleButtonRole(interaction, roleId);
    return;
  }
}

async function handleSelectMenu(interaction, client) {
  // Handle select menu interactions if needed
}

async function handleAutocomplete(interaction, client) {
  const command = client.commands.get(interaction.commandName);

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction, client);
  } catch (error) {
    console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
  }
}
