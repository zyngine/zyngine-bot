const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../../../shared/schemas');
const { COLORS, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('available-roles')
    .setDescription('See which roles you can request'),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });

    if (!guildConfig || (!guildConfig.roleTiers?.length && !guildConfig.selfRoles?.length)) {
      return interaction.editReply({
        embeds: [errorEmbed(
          'No Roles Available',
          'No requestable roles have been configured for this server. Ask an admin to set up role tiers.'
        )]
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('📋 Available Roles')
      .setDescription('Here are the roles you can request in this server:')
      .setFooter({ text: 'Use /request-role to request a role' })
      .setTimestamp();

    // Show roles by tier
    for (const tier of guildConfig.roleTiers || []) {
      if (!tier.roles || tier.roles.length === 0) continue;

      const roleNames = tier.roles
        .map(roleId => {
          const role = interaction.guild.roles.cache.get(roleId);
          if (!role) return null;
          
          // Check if user already has this role
          const hasRole = interaction.member.roles.cache.has(roleId);
          return hasRole ? `~~${role.name}~~ ✓` : role.name;
        })
        .filter(Boolean);

      if (roleNames.length === 0) continue;

      let tierInfo = roleNames.join(', ');
      
      // Add requirements info
      const reqs = [];
      if (tier.requirements?.minMessages > 0) {
        reqs.push(`${tier.requirements.minMessages} messages`);
      }
      if (tier.requirements?.minAccountAge > 0) {
        reqs.push(`${tier.requirements.minAccountAge}d account age`);
      }
      if (tier.requirements?.minServerAge > 0) {
        reqs.push(`${tier.requirements.minServerAge}d server membership`);
      }

      if (reqs.length > 0) {
        tierInfo += `\n*Requirements: ${reqs.join(', ')}*`;
      }

      embed.addFields({
        name: `${tier.name} Tier (Level ${tier.level})`,
        value: tierInfo,
        inline: false
      });
    }

    // Show self-roles
    if (guildConfig.selfRoles && guildConfig.selfRoles.length > 0) {
      const selfRoleNames = guildConfig.selfRoles
        .map(sr => {
          const role = interaction.guild.roles.cache.get(sr.roleId);
          if (!role) return null;
          const hasRole = interaction.member.roles.cache.has(sr.roleId);
          return hasRole ? `~~${role.name}~~ ✓` : role.name;
        })
        .filter(Boolean);

      if (selfRoleNames.length > 0) {
        embed.addFields({
          name: '⚡ Self-Assignable Roles',
          value: selfRoleNames.join(', '),
          inline: false
        });
      }
    }

    // Add legend
    embed.addFields({
      name: '📖 Legend',
      value: '~~Strikethrough~~ = You already have this role',
      inline: false
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
