const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { RoleRequest, Guild, ActivityLog } = require('../../../shared/schemas');
const { successEmbed, errorEmbed, roleRequestEmbed } = require('./embeds');

async function checkRequirements(member, guildConfig, roleId) {
  const tier = guildConfig.roleTiers?.find(t => t.roles.includes(roleId));
  
  if (!tier || !tier.requirements) {
    return { met: true, details: 'No requirements' };
  }

  const requirements = tier.requirements;
  const issues = [];

  // Check message count (would need user stats from database)
  // For now, we'll skip this or implement later

  // Check account age
  if (requirements.minAccountAge > 0) {
    const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    if (accountAge < requirements.minAccountAge) {
      issues.push(`Account age: ${Math.floor(accountAge)}/${requirements.minAccountAge} days`);
    }
  }

  // Check server membership age
  if (requirements.minServerAge > 0) {
    const serverAge = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
    if (serverAge < requirements.minServerAge) {
      issues.push(`Server membership: ${Math.floor(serverAge)}/${requirements.minServerAge} days`);
    }
  }

  // Check required roles
  if (requirements.requiredRoles && requirements.requiredRoles.length > 0) {
    const missingRoles = requirements.requiredRoles.filter(
      roleId => !member.roles.cache.has(roleId)
    );
    if (missingRoles.length > 0) {
      issues.push(`Missing required roles: ${missingRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
  }

  return {
    met: issues.length === 0,
    details: issues.length > 0 ? issues.join('\n') : 'All requirements met'
  };
}

async function createRoleRequest(interaction, roleId, reason) {
  const { member, guild } = interaction;
  const role = guild.roles.cache.get(roleId);

  if (!role) {
    return { success: false, error: 'Role not found' };
  }

  // Check if user already has the role
  if (member.roles.cache.has(roleId)) {
    return { success: false, error: 'You already have this role' };
  }

  // Get guild config
  const guildConfig = await Guild.findOne({ guildId: guild.id });

  // Check cooldown
  if (guildConfig?.requestCooldown) {
    const recentRequest = await RoleRequest.findOne({
      guildId: guild.id,
      userId: member.id,
      createdAt: { $gte: new Date(Date.now() - guildConfig.requestCooldown * 1000) }
    });

    if (recentRequest) {
      const nextAllowed = new Date(recentRequest.createdAt.getTime() + guildConfig.requestCooldown * 1000);
      return { 
        success: false, 
        error: `You're on cooldown. You can make another request <t:${Math.floor(nextAllowed.getTime() / 1000)}:R>` 
      };
    }
  }

  // Check if there's already a pending request for this role
  const existingRequest = await RoleRequest.findOne({
    guildId: guild.id,
    userId: member.id,
    roleId: roleId,
    status: 'pending'
  });

  if (existingRequest) {
    return { success: false, error: 'You already have a pending request for this role' };
  }

  // Check requirements
  const requirements = await checkRequirements(member, guildConfig, roleId);

  // Find tier level
  const tier = guildConfig?.roleTiers?.find(t => t.roles.includes(roleId));

  // Create the request
  const request = await RoleRequest.create({
    guildId: guild.id,
    userId: member.id,
    username: member.user.tag,
    userAvatar: member.user.displayAvatarURL(),
    roleId: roleId,
    roleName: role.name,
    reason: reason,
    tierLevel: tier?.level || 1,
    requirementsMet: requirements.met,
    requirementsDetails: requirements.details,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
  });

  // Log the action
  await ActivityLog.create({
    guildId: guild.id,
    action: 'role_request',
    targetUserId: member.id,
    targetUsername: member.user.tag,
    roleId: roleId,
    roleName: role.name,
    details: { reason, requirementsMet: requirements.met }
  });

  // Send to notification channel if configured
  if (guildConfig?.notifications?.requestChannelId) {
    try {
      const channel = guild.channels.cache.get(guildConfig.notifications.requestChannelId);
      if (channel && channel.isTextBased()) {
        const embed = roleRequestEmbed(request, 'pending');
        
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`approve_request:${request._id}`)
              .setLabel('Approve')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅'),
            new ButtonBuilder()
              .setCustomId(`deny_request:${request._id}`)
              .setLabel('Deny')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
          );

        await channel.send({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('Failed to send request notification:', error);
    }
  }

  return { success: true, request };
}

async function handleRequestButton(interaction, action, requestId) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const request = await RoleRequest.findById(requestId);
    
    if (!request) {
      return interaction.editReply({ embeds: [errorEmbed('Not Found', 'This request no longer exists.')] });
    }

    if (request.status !== 'pending') {
      return interaction.editReply({ 
        embeds: [errorEmbed('Already Processed', `This request has already been ${request.status}.`)] 
      });
    }

    // Check permissions
    const guildConfig = await Guild.findOne({ guildId: request.guildId });
    const tier = guildConfig?.roleTiers?.find(t => t.roles.includes(request.roleId));
    
    if (tier && tier.approverRoles && tier.approverRoles.length > 0) {
      const hasApproverRole = tier.approverRoles.some(roleId => 
        interaction.member.roles.cache.has(roleId)
      );
      
      if (!hasApproverRole && !interaction.member.permissions.has('Administrator')) {
        return interaction.editReply({ 
          embeds: [errorEmbed('Permission Denied', 'You do not have permission to process this request.')] 
        });
      }
    } else if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.editReply({ 
        embeds: [errorEmbed('Permission Denied', 'You need the Manage Roles permission to process requests.')] 
      });
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(request.userId).catch(() => null);

    if (action === 'approve_request') {
      if (!member) {
        request.status = 'cancelled';
        request.resolvedBy = interaction.user.id;
        request.resolvedByUsername = interaction.user.tag;
        request.resolvedAt = new Date();
        request.resolutionReason = 'Member left the server';
        await request.save();
        
        return interaction.editReply({ 
          embeds: [errorEmbed('Member Not Found', 'The member has left the server.')] 
        });
      }

      const role = guild.roles.cache.get(request.roleId);
      if (!role) {
        return interaction.editReply({ 
          embeds: [errorEmbed('Role Not Found', 'The requested role no longer exists.')] 
        });
      }

      // Assign the role
      await member.roles.add(role, `Approved by ${interaction.user.tag}`);

      // Update request
      request.status = 'approved';
      request.resolvedBy = interaction.user.id;
      request.resolvedByUsername = interaction.user.tag;
      request.resolvedAt = new Date();
      await request.save();

      // Log the action
      await ActivityLog.create({
        guildId: guild.id,
        action: 'role_approved',
        targetUserId: request.userId,
        targetUsername: request.username,
        performedBy: interaction.user.id,
        performedByUsername: interaction.user.tag,
        roleId: request.roleId,
        roleName: request.roleName
      });

      // DM the user if enabled
      if (guildConfig?.notifications?.approvalDMEnabled) {
        try {
          await member.send({
            embeds: [successEmbed(
              'Role Request Approved!',
              `Your request for **${role.name}** in **${guild.name}** has been approved!`
            )]
          });
        } catch (e) {
          // User has DMs disabled
        }
      }

      // Update the original message
      const updatedEmbed = roleRequestEmbed(request, 'approved');
      await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

      return interaction.editReply({ 
        embeds: [successEmbed('Request Approved', `Approved role request for <@${request.userId}>.`)] 
      });

    } else if (action === 'deny_request') {
      request.status = 'denied';
      request.resolvedBy = interaction.user.id;
      request.resolvedByUsername = interaction.user.tag;
      request.resolvedAt = new Date();
      await request.save();

      // Log the action
      await ActivityLog.create({
        guildId: guild.id,
        action: 'role_denied',
        targetUserId: request.userId,
        targetUsername: request.username,
        performedBy: interaction.user.id,
        performedByUsername: interaction.user.tag,
        roleId: request.roleId,
        roleName: request.roleName
      });

      // DM the user if enabled
      if (guildConfig?.notifications?.denialDMEnabled && member) {
        try {
          await member.send({
            embeds: [errorEmbed(
              'Role Request Denied',
              `Your request for **${request.roleName}** in **${guild.name}** has been denied.`
            )]
          });
        } catch (e) {
          // User has DMs disabled
        }
      }

      // Update the original message
      const updatedEmbed = roleRequestEmbed(request, 'denied');
      await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

      return interaction.editReply({ 
        embeds: [successEmbed('Request Denied', `Denied role request for <@${request.userId}>.`)] 
      });
    }

  } catch (error) {
    console.error('Error handling request button:', error);
    return interaction.editReply({ 
      embeds: [errorEmbed('Error', 'An error occurred while processing this request.')] 
    });
  }
}

module.exports = {
  checkRequirements,
  createRoleRequest,
  handleRequestButton
};
