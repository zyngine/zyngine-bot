const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

class ZyngineClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
      ],
    });

    this.commands = new Collection();
    this.cooldowns = new Collection();
    this.guildCache = new Collection();
  }

  async loadCommands() {
    const commandFolders = ['user', 'mod', 'admin'];
    const commandsPath = path.join(__dirname, '..', 'commands');

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder);
      
      if (!fs.existsSync(folderPath)) {
        console.warn(`Command folder not found: ${folderPath}`);
        continue;
      }

      const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command);
          console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
          console.warn(`⚠️ Command at ${filePath} is missing "data" or "execute"`);
        }
      }
    }

    console.log(`📦 Loaded ${this.commands.size} commands`);
  }

  async loadEvents() {
    const eventsPath = path.join(__dirname, '..', 'events');
    
    if (!fs.existsSync(eventsPath)) {
      console.warn('Events folder not found');
      return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);

      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args, this));
      } else {
        this.on(event.name, (...args) => event.execute(...args, this));
      }

      console.log(`✅ Loaded event: ${event.name}`);
    }
  }

  async start(token) {
    try {
      await this.loadCommands();
      await this.loadEvents();
      await this.login(token);
    } catch (error) {
      console.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

module.exports = ZyngineClient;
