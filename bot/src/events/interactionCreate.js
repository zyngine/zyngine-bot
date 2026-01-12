const { Collection, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction, client);
    } else if (interaction.isButton()) {
      await handleButton(interaction, client);
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
  const [action, ...params] = interaction.customId.split(':');

  if (action === 'approve_request' || action === 'deny_request') {
    const { handleRequestButton } = require('../utils/requestHandler');
    await handleRequestButton(interaction, action, params[0]);
  } else if (action === 'buttonrole') {
    const { handleButtonRole } = require('../utils/buttonRoleHandler');
    await handleButtonRole(interaction, params[0]);
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
