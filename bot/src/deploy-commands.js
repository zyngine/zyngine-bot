require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFolders = ['user', 'mod', 'admin'];
const commandsPath = path.join(__dirname, 'commands');

// Load all commands
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  
  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    continue;
  }

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Command at ${filePath} is missing "data" property`);
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log(`\n🔄 Started refreshing ${commands.length} application (/) commands.\n`);

    const isGlobal = process.argv.includes('--global');

    let data;
    
    if (isGlobal) {
      // Deploy globally
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Successfully registered ${data.length} global commands.`);
    } else {
      // Deploy to test guild
      if (!process.env.GUILD_ID) {
        console.error('❌ GUILD_ID not set. Use --global for global deployment or set GUILD_ID for guild deployment.');
        process.exit(1);
      }
      
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Successfully registered ${data.length} commands to guild ${process.env.GUILD_ID}.`);
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();
