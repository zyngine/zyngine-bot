const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../../../../shared/schemas');
const { createRoleRequest } = require('../../utils/requestHandler');
const { successEmbed, errorEmbed, pendingEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('request-role')
    .setDescription('Request a role from server moderators')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role you want to request')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Why do you want this role?')
        .setRequired(false)
        .setMaxLength(500)
    ),

  cooldown: 10,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason');

    // Validate role
    if (role.managed) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Role', 'This role is managed by an integration and cannot be requested.')]
      });
    }

    if (role.id === interaction.guild.id) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Role', 'You cannot request the @everyone role.')]
      });
    }

    // Check if role is in any tier (requestable)
    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    
    if (guildConfig) {
      const isInTier = guildConfig.roleTiers?.some(tier => tier.roles.includes(role.id));
      const isSelfRole = guildConfig.selfRoles?.some(sr => sr.roleId === role.id);
      
      if (!isInTier && !isSelfRole && guildConfig.roleTiers?.length > 0) {
        return interaction.editReply({
          embeds: [errorEmbed(
            'Role Not Requestable', 
            'This role is not configured as requestable. Use `/available-roles` to see which roles you can request.'
          )]
        });
      }
    }

    // Check bot permissions
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [errorEmbed(
          'Permission Error', 
          'I cannot assign this role as it is higher than or equal to my highest role.'
        )]
      });
    }

    // Create the request
    const result = await createRoleRequest(interaction, role.id, reason);

    if (!result.success) {
      return interaction.editReply({
        embeds: [errorEmbed('Request Failed', result.error)]
      });
    }

    const embed = roleRequestEmbed(result.request, 'pending');
    
    return interaction.editReply({
      content: '✅ Your role request has been submitted!',
      embeds: [embed]
    });
  },

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    
    if (!guildConfig) return interaction.respond([]);

    const requestableRoles = [];
    
    // Get roles from tiers
    for (const tier of guildConfig.roleTiers || []) {
      for (const roleId of tier.roles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role && role.name.toLowerCase().includes(focusedValue)) {
          requestableRoles.push({
            name: `${role.name} (${tier.name} Tier)`,
            value: role.id
          });
        }
      }
    }

    // Get self-roles
    for (const selfRole of guildConfig.selfRoles || []) {
      const role = interaction.guild.roles.cache.get(selfRole.roleId);
      if (role && role.name.toLowerCase().includes(focusedValue)) {
        requestableRoles.push({
          name: `${role.name} (Self-Assignable)`,
          value: role.id
        });
      }
    }

    await interaction.respond(requestableRoles.slice(0, 25));
  }
};
