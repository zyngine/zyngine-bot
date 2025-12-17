require('dotenv').config();

const ZyngineClient = require('./structures/Client');
const database = require('./utils/database');
const { CronJob } = require('cron');
const { TempRole } = require('./schemas');

const client = new ZyngineClient();

// Temp role expiration checker
async function checkExpiredTempRoles() {
  try {
    const expiredRoles = await TempRole.find({
      expiresAt: { $lte: new Date() }
    });

    for (const tempRole of expiredRoles) {
      try {
        const guild = client.guilds.cache.get(tempRole.guildId);
        if (!guild) continue;

        const member = await guild.members.fetch(tempRole.userId).catch(() => null);
        if (member) {
          await member.roles.remove(tempRole.roleId, 'Temporary role expired');
          console.log(`Removed expired temp role ${tempRole.roleName} from ${member.user.tag}`);
        }

        await tempRole.deleteOne();
      } catch (error) {
        console.error(`Failed to remove expired temp role:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking expired temp roles:', error);
  }
}

// Start the bot
async function main() {
  await database.connect();
  await client.start(process.env.DISCORD_TOKEN);

  const tempRoleJob = new CronJob('* * * * *', checkExpiredTempRoles);
  tempRoleJob.start();
  console.log('✅ Temp role expiration checker started');
}

main().catch(console.error);

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await database.disconnect();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await database.disconnect();
  client.destroy();
  process.exit(0);
});
