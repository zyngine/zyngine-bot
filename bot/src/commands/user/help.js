const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Get help with Zyngine Bot commands'),
  cooldown: 3,
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('🛡️ Zyngine Bot Help')
      .addFields(
        { name: '👤 User Commands', value: '`/apply` - Apply for a position\n`/request-role` - Request a role\n`/my-requests` - View your requests\n`/available-roles` - See requestable roles' },
        { name: '🛡️ Moderator Commands', value: '`/approve` - Approve a request\n`/deny` - Deny a request\n`/pending` - View pending requests\n`/role give/remove/temp` - Manage roles' },
        { name: '⚙️ Admin Commands', value: '`/setup-autorole` - Configure auto-roles' }
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
