const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../../shared/schemas');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    try {
      console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);

      // Create default guild configuration
      const existingConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!existingConfig) {
        await Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          guildIcon: guild.iconURL(),
          ownerId: guild.ownerId,
          autoRoles: [],
          roleTiers: [
            {
              name: 'Basic',
              level: 1,
              color: '#43B581',
              roles: [],
              approverRoles: [],
              requirements: { minMessages: 0, minAccountAge: 0, minServerAge: 0, requiredRoles: [] }
            },
            {
              name: 'Elevated',
              level: 2,
              color: '#FAA61A',
              roles: [],
              approverRoles: [],
              requirements: { minMessages: 10, minAccountAge: 7, minServerAge: 3, requiredRoles: [] }
            },
            {
              name: 'Premium',
              level: 3,
              color: '#F04747',
              roles: [],
              approverRoles: [],
              requirements: { minMessages: 50, minAccountAge: 30, minServerAge: 14, requiredRoles: [] }
            }
          ],
          notifications: {
            approvalDMEnabled: true,
            denialDMEnabled: true
          },
          requestCooldown: 3600
        });

        console.log(`📝 Created default config for guild: ${guild.name}`);
      }

      // Try to send welcome message to a suitable channel
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('👋 Thanks for adding Zyngine Bot!')
        .setDescription('The ultimate role management solution for your Discord server.')
        .addFields(
          {
            name: '🚀 Quick Start',
            value: [
              '• Use `/setup-autorole` to configure auto-roles for new members',
              '• Use `/setup-tier` to create role approval tiers',
              '• Use `/request-role` to let members request roles',
              '• Use `/role give` to directly assign roles'
            ].join('\n'),
            inline: false
          },
          {
            name: '📊 Web Dashboard',
            value: `Configure everything easily at:\n${process.env.DASHBOARD_URL || 'https://zyngine.bot/dashboard'}`,
            inline: false
          },
          {
            name: '📚 Commands',
            value: 'Use `/help` to see all available commands',
            inline: true
          },
          {
            name: '🔗 Support',
            value: '[Join our Discord](https://discord.gg/zyngine)',
            inline: true
          }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Zyngine Bot v1.0' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL(process.env.DASHBOARD_URL || 'https://zyngine.bot/dashboard'),
          new ButtonBuilder()
            .setLabel('Documentation')
            .setStyle(ButtonStyle.Link)
            .setURL('https://docs.zyngine.bot'),
          new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/zyngine')
        );

      // Find a suitable channel to send welcome message
      const systemChannel = guild.systemChannel;
      const generalChannel = guild.channels.cache.find(
        ch => ch.name === 'general' && ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages')
      );
      const anyTextChannel = guild.channels.cache.find(
        ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has('SendMessages')
      );

      const targetChannel = systemChannel || generalChannel || anyTextChannel;

      if (targetChannel) {
        await targetChannel.send({ embeds: [welcomeEmbed], components: [row] });
      }

      // Try to DM the server owner
      try {
        const owner = await guild.fetchOwner();
        
        const ownerEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🎉 Zyngine Bot has been added to your server!')
          .setDescription(`Thanks for adding Zyngine Bot to **${guild.name}**!`)
          .addFields(
            {
              name: '⚙️ Next Steps',
              value: [
                '1. Go to the web dashboard to configure your server',
                '2. Set up auto-roles for new members',
                '3. Create role tiers and approval workflows',
                '4. Configure notification channels'
              ].join('\n')
            },
            {
              name: '🔗 Dashboard Link',
              value: `${process.env.DASHBOARD_URL || 'https://zyngine.bot'}/dashboard/${guild.id}`
            }
          )
          .setTimestamp();

        await owner.send({ embeds: [ownerEmbed], components: [row] });
      } catch (error) {
        // Owner has DMs disabled
        console.log(`Could not DM owner of ${guild.name}`);
      }

    } catch (error) {
      console.error('Error in guildCreate event:', error);
    }
  },
};
