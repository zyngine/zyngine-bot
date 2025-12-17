const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with Zyngine Bot commands')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Command category to view')
        .setRequired(false)
        .addChoices(
          { name: 'User Commands', value: 'user' },
          { name: 'Moderator Commands', value: 'mod' },
          { name: 'Admin Commands', value: 'admin' }
        )
    ),

  cooldown: 3,

  async execute(interaction) {
    const category = interaction.options.getString('category');

    const commands = {
      user: [
        { name: '/request-role', desc: 'Request a role for approval' },
        { name: '/my-requests', desc: 'View your request history' },
        { name: '/available-roles', desc: 'See requestable roles' },
        { name: '/role list', desc: 'View your roles' },
        { name: '/role info', desc: 'Get information about a role' },
      ],
      mod: [
        { name: '/approve', desc: 'Approve a role request' },
        { name: '/deny', desc: 'Deny a role request' },
        { name: '/pending', desc: 'View pending requests' },
        { name: '/role give', desc: 'Give a role to a user' },
        { name: '/role remove', desc: 'Remove a role from a user' },
        { name: '/role temp', desc: 'Give a temporary role' },
        { name: '/role give-multiple', desc: 'Give role to multiple users' },
        { name: '/role remove-multiple', desc: 'Remove role from multiple users' },
        { name: '/role swap', desc: 'Swap roles on a user' },
        { name: '/role members', desc: 'List members with a role' },
      ],
      admin: [
        { name: '/setup-autorole add', desc: 'Add an auto-role' },
        { name: '/setup-autorole remove', desc: 'Remove an auto-role' },
        { name: '/setup-autorole list', desc: 'List auto-roles' },
        { name: '/setup-autorole toggle', desc: 'Enable/disable an auto-role' },
        { name: '/setup-autorole welcome-message', desc: 'Configure welcome DM' },
        { name: '/setup-tier', desc: 'Configure role tiers' },
        { name: '/buttonrole create', desc: 'Create button roles' },
        { name: '/reactionrole create', desc: 'Create reaction roles' },
        { name: '/selfrole add', desc: 'Add a self-assignable role' },
        { name: '/audit', desc: 'View role change logs' },
      ]
    };

    if (category) {
      const categoryNames = {
        user: 'User Commands',
        mod: 'Moderator Commands',
        admin: 'Admin Commands'
      };

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`📚 ${categoryNames[category]}`)
        .setDescription(`Here are the ${categoryNames[category].toLowerCase()}:`)
        .setFooter({ text: 'Zyngine Bot' })
        .setTimestamp();

      for (const cmd of commands[category]) {
        embed.addFields({
          name: cmd.name,
          value: cmd.desc,
          inline: true
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Main help embed
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('🛡️ Zyngine Bot Help')
      .setDescription('The ultimate Discord role management bot!')
      .addFields(
        {
          name: '👤 User Commands',
          value: 'Request roles, view your requests, and more.\n`/help category:User Commands`',
          inline: false
        },
        {
          name: '🛡️ Moderator Commands',
          value: 'Approve/deny requests, manage roles directly.\n`/help category:Moderator Commands`',
          inline: false
        },
        {
          name: '⚙️ Admin Commands',
          value: 'Configure auto-roles, tiers, and bot settings.\n`/help category:Admin Commands`',
          inline: false
        },
        {
          name: '🌐 Web Dashboard',
          value: `Configure everything at:\n${process.env.DASHBOARD_URL || 'https://zyngine.bot'}/dashboard`,
          inline: false
        }
      )
      .setFooter({ text: 'Zyngine Bot • Use /help category: for detailed commands' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Dashboard')
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.DASHBOARD_URL || 'https://zyngine.bot'),
        new ButtonBuilder()
          .setLabel('Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/zyngine'),
        new ButtonBuilder()
          .setLabel('Invite Bot')
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.BOT_INVITE_URL || 'https://discord.com/api/oauth2/authorize')
      );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
