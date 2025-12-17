const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { RoleRequest, Guild, ActivityLog } = require('../../../../shared/schemas');
const { successEmbed, errorEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a role request')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(option =>
      option
        .setName('request-id')
        .setDescription('The request ID (last 6 characters shown in request)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('note')
        .setDescription('Optional note for the approval')
        .setRequired(false)
    ),

  cooldown: 3,

  async execute(interaction) {
    await interaction.deferReply();

    const requestIdInput = interaction.options.getString('request-id').toUpperCase();
    const note = interaction.options.getString('note');

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
          embeds: [errorEmbed('Permission Denied', 'You do not have permission to approve this request.')]
        });
      }
    }

    // Get the member and role
    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
    const role = interaction.guild.roles.cache.get(request.roleId);

    if (!member) {
      request.status = 'cancelled';
      request.resolvedBy = interaction.user.id;
      request.resolvedByUsername = interaction.user.tag;
      request.resolvedAt = new Date();
      request.resolutionReason = 'Member left the server';
      await request.save();

      return interaction.editReply({
        embeds: [errorEmbed('Member Not Found', 'The member has left the server. Request has been cancelled.')]
      });
    }

    if (!role) {
      return interaction.editReply({
        embeds: [errorEmbed('Role Not Found', 'The requested role no longer exists.')]
      });
    }

    // Check bot permissions
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        embeds: [errorEmbed('Permission Error', 'I cannot assign this role as it is higher than my highest role.')]
      });
    }

    // Assign the role
    await member.roles.add(role, `Approved by ${interaction.user.tag}${note ? `: ${note}` : ''}`);

    // Update the request
    request.status = 'approved';
    request.resolvedBy = interaction.user.id;
    request.resolvedByUsername = interaction.user.tag;
    request.resolvedAt = new Date();
    request.resolutionReason = note;
    await request.save();

    // Log the action
    await ActivityLog.create({
      guildId: interaction.guild.id,
      action: 'role_approved',
      targetUserId: request.userId,
      targetUsername: request.username,
      performedBy: interaction.user.id,
      performedByUsername: interaction.user.tag,
      roleId: request.roleId,
      roleName: request.roleName,
      details: { note }
    });

    // DM the user
    if (guildConfig?.notifications?.approvalDMEnabled) {
      try {
        await member.send({
          embeds: [successEmbed(
            'Role Request Approved!',
            `Your request for **${role.name}** in **${interaction.guild.name}** has been approved!${note ? `\n\n**Note:** ${note}` : ''}`
          )]
        });
      } catch (e) {
        // User has DMs disabled
      }
    }

    const embed = roleRequestEmbed(request, 'approved');

    return interaction.editReply({
      content: `✅ Approved role request \`#${requestIdInput}\``,
      embeds: [embed]
    });
  }
};
