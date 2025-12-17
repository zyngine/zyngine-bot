const { EmbedBuilder } = require('discord.js');

const COLORS = {
  PRIMARY: '#5865F2',
  SUCCESS: '#43B581',
  WARNING: '#FAA61A',
  ERROR: '#F04747',
  INFO: '#5865F2',
  PENDING: '#FAA61A'
};

function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || COLORS.PRIMARY)
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) {
    embed.setFooter({ 
      text: options.footer.text || 'Zyngine Bot',
      iconURL: options.footer.iconURL 
    });
  } else {
    embed.setFooter({ text: 'Zyngine Bot' });
  }

  return embed;
}

function successEmbed(title, description, fields = []) {
  return createEmbed({
    color: COLORS.SUCCESS,
    title: `✅ ${title}`,
    description,
    fields
  });
}

function errorEmbed(title, description, fields = []) {
  return createEmbed({
    color: COLORS.ERROR,
    title: `❌ ${title}`,
    description,
    fields
  });
}

function warningEmbed(title, description, fields = []) {
  return createEmbed({
    color: COLORS.WARNING,
    title: `⚠️ ${title}`,
    description,
    fields
  });
}

function infoEmbed(title, description, fields = []) {
  return createEmbed({
    color: COLORS.INFO,
    title: `ℹ️ ${title}`,
    description,
    fields
  });
}

function pendingEmbed(title, description, fields = []) {
  return createEmbed({
    color: COLORS.PENDING,
    title: `⏳ ${title}`,
    description,
    fields
  });
}

function roleRequestEmbed(request, status = 'pending') {
  const statusConfig = {
    pending: { color: COLORS.PENDING, emoji: '⏳', text: 'Pending Approval' },
    approved: { color: COLORS.SUCCESS, emoji: '✅', text: 'Approved' },
    denied: { color: COLORS.ERROR, emoji: '❌', text: 'Denied' },
    cancelled: { color: COLORS.WARNING, emoji: '🚫', text: 'Cancelled' },
    expired: { color: COLORS.WARNING, emoji: '⏰', text: 'Expired' }
  };

  const config = statusConfig[status] || statusConfig.pending;

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(`${config.emoji} Role Request - ${config.text}`)
    .addFields(
      { name: 'User', value: `<@${request.userId}>`, inline: true },
      { name: 'Role', value: `<@&${request.roleId}>`, inline: true },
      { name: 'Request ID', value: `\`#${request._id.toString().slice(-6).toUpperCase()}\``, inline: true }
    )
    .setTimestamp(request.createdAt);

  if (request.reason) {
    embed.addFields({ name: 'Reason', value: request.reason, inline: false });
  }

  if (request.requirementsMet !== undefined) {
    embed.addFields({
      name: 'Requirements',
      value: request.requirementsMet 
        ? '✅ All requirements met' 
        : `❌ ${request.requirementsDetails || 'Requirements not met'}`,
      inline: false
    });
  }

  if (request.resolvedBy && (status === 'approved' || status === 'denied')) {
    embed.addFields(
      { name: 'Resolved By', value: `<@${request.resolvedBy}>`, inline: true },
      { name: 'Resolved At', value: `<t:${Math.floor(request.resolvedAt.getTime() / 1000)}:R>`, inline: true }
    );

    if (request.resolutionReason) {
      embed.addFields({ name: 'Resolution Note', value: request.resolutionReason, inline: false });
    }
  }

  embed.setFooter({ text: 'Zyngine Bot' });

  return embed;
}

function roleInfoEmbed(role, memberCount) {
  return createEmbed({
    color: role.hexColor || COLORS.PRIMARY,
    title: `Role Info: ${role.name}`,
    fields: [
      { name: 'ID', value: `\`${role.id}\``, inline: true },
      { name: 'Color', value: role.hexColor || 'Default', inline: true },
      { name: 'Position', value: role.position.toString(), inline: true },
      { name: 'Members', value: memberCount.toString(), inline: true },
      { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
      { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Managed', value: role.managed ? 'Yes (Integration)' : 'No', inline: true }
    ]
  });
}

module.exports = {
  COLORS,
  createEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  pendingEmbed,
  roleRequestEmbed,
  roleInfoEmbed
};
