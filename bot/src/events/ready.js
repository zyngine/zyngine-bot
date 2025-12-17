const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);

    // Set bot status
    client.user.setPresence({
      activities: [{
        name: `/request-role | ${client.guilds.cache.size} servers`,
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    // Update status every 5 minutes
    setInterval(() => {
      client.user.setPresence({
        activities: [{
          name: `/request-role | ${client.guilds.cache.size} servers`,
          type: ActivityType.Watching,
        }],
        status: 'online',
      });
    }, 300000);
  },
};
