const { handleTicketCommand } = require('../utils/ticketCommands');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore DMs
    if (!message.guild) return;

    // Handle $ ticket commands
    if (message.content.startsWith('$')) {
      await handleTicketCommand(message);
    }
  }
};
