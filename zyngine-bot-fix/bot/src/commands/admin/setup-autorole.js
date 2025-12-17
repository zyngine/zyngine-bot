const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../schemas');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-autorole')
    .setDescription('Configure auto-roles for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('add').setDescription('Add an auto-role')
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      .addIntegerOption(o => o.setName('delay').setDescription('Delay in seconds (0-300)').setRequired(false).setMinValue(0).setMaxValue(300))
      .addBooleanOption(o => o.setName('ignore-bots').setDescription('Ignore bots?').setRequired(false)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an auto-role')
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all auto-roles')),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const sub = interaction.options.getSubcommand();
    let guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    if (!guildConfig) {
      guildConfig = await Guild.create({ guildId: interaction.guild.id, guildName: interaction.guild.name, ownerId: interaction.guild.ownerId });
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      const delay = interaction.options.getInteger('delay') || 0;
      const ignoreBots = interaction.options.getBoolean('ignore-bots') ?? true;

      if (role.managed || role.id === interaction.guild.id) return interaction.editReply({ embeds: [errorEmbed('Invalid Role', 'Cannot use this role.')] });
      const botMember = interaction.guild.members.me;
      if (role.position >= botMember.roles.highest.position) return interaction.editReply({ embeds: [errorEmbed('Permission Error', 'This role is too high for me.')] });

      const existingIndex = guildConfig.autoRoles.findIndex(ar => ar.roleId === role.id);
      if (existingIndex !== -1) {
        guildConfig.autoRoles[existingIndex] = { roleId: role.id, roleName: role.name, enabled: true, delay, ignoreBots };
      } else {
        guildConfig.autoRoles.push({ roleId: role.id, roleName: role.name, enabled: true, delay, ignoreBots });
      }
      await guildConfig.save();
      return interaction.editReply({ embeds: [successEmbed('Auto-Role Added', `**Role:** ${role}\n**Delay:** ${delay}s\n**Ignore Bots:** ${ignoreBots}`)] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const index = guildConfig.autoRoles.findIndex(ar => ar.roleId === role.id);
      if (index === -1) return interaction.editReply({ embeds: [errorEmbed('Not Found', 'This role is not an auto-role.')] });
      guildConfig.autoRoles.splice(index, 1);
      await guildConfig.save();
      return interaction.editReply({ embeds: [successEmbed('Auto-Role Removed', `${role} will no longer be auto-assigned.`)] });
    }

    if (sub === 'list') {
      if (!guildConfig.autoRoles?.length) return interaction.editReply({ embeds: [infoEmbed('No Auto-Roles', 'Use `/setup-autorole add` to add one.')] });
      const embed = new EmbedBuilder().setColor(COLORS.PRIMARY).setTitle('⚙️ Auto-Role Configuration').setTimestamp();
      for (const ar of guildConfig.autoRoles) {
        const role = interaction.guild.roles.cache.get(ar.roleId);
        embed.addFields({ name: role?.name || 'Unknown Role', value: `**Status:** ${ar.enabled ? '✅' : '❌'}\n**Delay:** ${ar.delay}s\n**Ignore Bots:** ${ar.ignoreBots ? 'Yes' : 'No'}`, inline: true });
      }
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
