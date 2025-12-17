const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { RoleRequest, Guild, ActivityLog } = require('../../../../shared/schemas');
const { successEmbed, errorEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Deny a role request')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(option =>
      option
        .setName('request-id')
        .setDescription('The request ID (last 6 characters shown in request)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for denial')
        .setRequired(false)
    ),

  cooldown: 3,

  async execute(interaction) {
    await interaction.deferReply();

    const requestIdInput = interaction.options.getString('request-id').toUpperCase();
    const reason = interaction.options.getString('reason');

    // Find the request
    const requests = await RoleRequest.find({
      guildId: interaction.guild.id,
      status: 'pending'
    });

    const request = requests.find(r => 
      r._id.toString().slice(-6).toUpperCase() === requestIdInput ||
      r._id.toString() === requestIdInput
    );

    if (!request) {
      return interaction.editReply({
        embeds: [errorEmbed('Not Found', `Could not find a pending request with ID \`${requestIdInput}\`.`)]
      });
    }

    // Check permissions
    const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
    const tier = guildConfig?.roleTiers?.find(t => t.roles.includes(request.roleId));

    if (tier && tier.approverRoles && tier.approverRoles.length > 0) {
      const hasApproverRole = tier.approverRoles.some(roleId =>
        interaction.member.roles.cache.has(roleId)
      );

      if (!hasApproverRole && !interaction.member.permissions.has('Administrator')) {
        return interaction.editReply({
          embeds: [errorEmbed('Permission Denied', 'You do not have permission to deny this request.')]
        });
      }
    }

    // Update the request
    request.status = 'denied';
    request.resolvedBy = interaction.user.id;
    request.resolvedByUsername = interaction.user.tag;
    request.resolvedAt = new Date();
    request.resolutionReason = reason;
    await request.save();

    // Log the action
    await ActivityLog.create({
      guildId: interaction.guild.id,
      action: 'role_denied',
      targetUserId: request.userId,
      targetUsername: request.username,
      performedBy: interaction.user.id,
      performedByUsername: interaction.user.tag,
      roleId: request.roleId,
      roleName: request.roleName,
      details: { reason }
    });

    // DM the user
    if (guildConfig?.notifications?.denialDMEnabled) {
      try {
        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        if (member) {
          await member.send({
            embeds: [errorEmbed(
              'Role Request Denied',
              `Your request for **${request.roleName}** in **${interaction.guild.name}** has been denied.${reason ? `\n\n**Reason:** ${reason}` : ''}`
            )]
          });
        }
      } catch (e) {
        // User has DMs disabled
      }
    }

    const embed = roleRequestEmbed(request, 'denied');

    return interaction.editReply({
      content: `❌ Denied role request \`#${requestIdInput}\``,
      embeds: [embed]
    });
  }
};
