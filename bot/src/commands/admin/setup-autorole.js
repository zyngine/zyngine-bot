const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../../../shared/schemas');
const { successEmbed, errorEmbed, infoEmbed, COLORS } = require('../../utils/embeds');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-autorole')
    .setDescription('Configure auto-roles for new members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add an auto-role')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to auto-assign').setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('delay').setDescription('Delay in seconds before assigning (0-300)').setRequired(false).setMinValue(0).setMaxValue(300)
        )
        .addBooleanOption(option =>
          option.setName('ignore-bots').setDescription('Should bots be ignored?').setRequired(false)
        )
        .addIntegerOption(option =>
          option.setName('min-account-age').setDescription('Minimum account age in days').setRequired(false).setMinValue(0).setMaxValue(365)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove an auto-role')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to remove from auto-assign').setRequired(true)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all configured auto-roles')
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable an auto-role')
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to toggle').setRequired(true)
        )
        .addBooleanOption(option =>
          option.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome-message')
        .setDescription('Configure welcome DM for new members')
        .addBooleanOption(option =>
          option.setName('enabled').setDescription('Enable or disable welcome DM').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message').setDescription('Welcome message (use {server}, {user}, {roles})').setRequired(false).setMaxLength(1000)
        )
        .addChannelOption(option =>
          option.setName('channel').setDescription('Optional channel to send welcome message').setRequired(false)
        )
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Get or create guild config
    let guildConfig = await Guild.findOne({ guildId });
    if (!guildConfig) {
      guildConfig = await Guild.create({
        guildId,
        guildName: interaction.guild.name,
        guildIcon: interaction.guild.iconURL(),
        ownerId: interaction.guild.ownerId
      });
    }

    switch (subcommand) {
      case 'add': {
        const role = interaction.options.getRole('role');
        const delay = interaction.options.getInteger('delay') || 0;
        const ignoreBots = interaction.options.getBoolean('ignore-bots') ?? true;
        const minAccountAge = interaction.options.getInteger('min-account-age') || 0;

        // Validation
        if (role.managed) {
          return interaction.editReply({
            embeds: [errorEmbed('Invalid Role', 'Cannot auto-assign managed/integration roles.')]
          });
        }

        if (role.id === interaction.guild.id) {
          return interaction.editReply({
            embeds: [errorEmbed('Invalid Role', 'Cannot auto-assign the @everyone role.')]
          });
        }

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
          return interaction.editReply({
            embeds: [errorEmbed('Permission Error', 'This role is higher than my highest role. I cannot assign it.')]
          });
        }

        // Check if already exists
        const existingIndex = guildConfig.autoRoles.findIndex(ar => ar.roleId === role.id);
        
        if (existingIndex !== -1) {
          // Update existing
          guildConfig.autoRoles[existingIndex] = {
            roleId: role.id,
            roleName: role.name,
            enabled: true,
            delay,
            ignoreBots,
            minAccountAge
          };
        } else {
          // Add new
          guildConfig.autoRoles.push({
            roleId: role.id,
            roleName: role.name,
            enabled: true,
            delay,
            ignoreBots,
            minAccountAge
          });
        }

        await guildConfig.save();

        return interaction.editReply({
          embeds: [successEmbed(
            'Auto-Role Added',
            `**Role:** ${role}\n**Delay:** ${delay} seconds\n**Ignore Bots:** ${ignoreBots ? 'Yes' : 'No'}\n**Min Account Age:** ${minAccountAge} days`
          )]
        });
      }

      case 'remove': {
        const role = interaction.options.getRole('role');
        
        const index = guildConfig.autoRoles.findIndex(ar => ar.roleId === role.id);
        if (index === -1) {
          return interaction.editReply({
            embeds: [errorEmbed('Not Found', 'This role is not configured as an auto-role.')]
          });
        }

        guildConfig.autoRoles.splice(index, 1);
        await guildConfig.save();

        return interaction.editReply({
          embeds: [successEmbed('Auto-Role Removed', `${role} will no longer be auto-assigned to new members.`)]
        });
      }

      case 'list': {
        if (!guildConfig.autoRoles || guildConfig.autoRoles.length === 0) {
          return interaction.editReply({
            embeds: [infoEmbed('No Auto-Roles', 'No auto-roles are configured. Use `/setup-autorole add` to add one.')]
          });
        }

        const embed = new EmbedBuilder()
          .setColor(COLORS.PRIMARY)
          .setTitle('⚙️ Auto-Role Configuration')
          .setDescription('These roles are automatically assigned to new members:')
          .setFooter({ text: 'Zyngine Bot' })
          .setTimestamp();

        for (const autoRole of guildConfig.autoRoles) {
          const role = interaction.guild.roles.cache.get(autoRole.roleId);
          const status = autoRole.enabled ? '✅ Enabled' : '❌ Disabled';
          
          embed.addFields({
            name: role ? role.name : 'Unknown Role',
            value: [
              `**Status:** ${status}`,
              `**Delay:** ${autoRole.delay}s`,
              `**Ignore Bots:** ${autoRole.ignoreBots ? 'Yes' : 'No'}`,
              `**Min Account Age:** ${autoRole.minAccountAge || 0} days`
            ].join('\n'),
            inline: true
          });
        }

        // Welcome message status
        const wmStatus = guildConfig.welcomeMessage?.enabled ? '✅ Enabled' : '❌ Disabled';
        embed.addFields({
          name: '📨 Welcome DM',
          value: wmStatus,
          inline: true
        });

        return interaction.editReply({ embeds: [embed] });
      }

      case 'toggle': {
        const role = interaction.options.getRole('role');
        const enabled = interaction.options.getBoolean('enabled');
        
        const autoRole = guildConfig.autoRoles.find(ar => ar.roleId === role.id);
        if (!autoRole) {
          return interaction.editReply({
            embeds: [errorEmbed('Not Found', 'This role is not configured as an auto-role.')]
          });
        }

        autoRole.enabled = enabled;
        await guildConfig.save();

        return interaction.editReply({
          embeds: [successEmbed(
            'Auto-Role Updated',
            `${role} is now **${enabled ? 'enabled' : 'disabled'}** for auto-assignment.`
          )]
        });
      }

      case 'welcome-message': {
        const enabled = interaction.options.getBoolean('enabled');
        const message = interaction.options.getString('message');
        const channel = interaction.options.getChannel('channel');

        if (!guildConfig.welcomeMessage) {
          guildConfig.welcomeMessage = {};
        }

        guildConfig.welcomeMessage.enabled = enabled;
        
        if (message) {
          guildConfig.welcomeMessage.message = message;
        }
        
        if (channel) {
          guildConfig.welcomeMessage.channelId = channel.id;
        }

        await guildConfig.save();

        const embed = successEmbed(
          'Welcome Message Updated',
          `**Status:** ${enabled ? 'Enabled' : 'Disabled'}`
        );

        if (enabled && guildConfig.welcomeMessage.message) {
          embed.addFields({
            name: 'Message Preview',
            value: guildConfig.welcomeMessage.message.substring(0, 500)
          });
        }

        if (channel) {
          embed.addFields({
            name: 'Welcome Channel',
            value: channel.toString()
          });
        }

        return interaction.editReply({ embeds: [embed] });
      }
    }
  }
};
