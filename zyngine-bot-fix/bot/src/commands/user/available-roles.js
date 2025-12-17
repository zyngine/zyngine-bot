const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../schemas');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('available-roles').setDescription('See which roles you can request'),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });

    if (!guildConfig?.roleTiers?.length) {
      return interaction.editReply({ embeds: [errorEmbed('No Roles Available', 'No requestable roles have been configured.')] });
    }

    const embed = new EmbedBuilder().setColor(COLORS.PRIMARY).setTitle('📋 Available Roles').setTimestamp();
    for (const tier of guildConfig.roleTiers) {
      if (!tier.roles?.length) continue;
      const roleNames = tier.roles.map(id => {
        const role = interaction.guild.roles.cache.get(id);
        if (!role) return null;
        return interaction.member.roles.cache.has(id) ? `~~${role.name}~~ ✓` : role.name;
      }).filter(Boolean);
      if (roleNames.length) embed.addFields({ name: `${tier.name} Tier`, value: roleNames.join(', ') });
    }
    return interaction.editReply({ embeds: [embed] });
  }
};
