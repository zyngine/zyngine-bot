const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { ActivityLog, TempRole } = require('../../schemas');
const { successEmbed, errorEmbed, COLORS } = require('../../utils/embeds');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Role management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub.setName('give').setDescription('Give a role to a user')
      .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a role from a user')
      .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true)))
    .addSubcommand(sub => sub.setName('temp').setDescription('Give a temporary role')
      .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration (1h, 1d, 1w)').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List user roles')
      .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
    .addSubcommand(sub => sub.setName('info').setDescription('Get role info')
      .addRoleOption(o => o.setName('role').setDescription('The role').setRequired(true))),
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const canManageRole = (role) => {
      const bot = interaction.guild.members.me;
      if (role.position >= bot.roles.highest.position) return { allowed: false, reason: 'Role is too high for me.' };
      if (role.managed) return { allowed: false, reason: 'This is a managed role.' };
      return { allowed: true };
    };

    if (sub === 'give') {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const reason = interaction.options.getString('reason') || 'No reason';
      const check = canManageRole(role);
      if (!check.allowed) return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
      if (member.roles.cache.has(role.id)) return interaction.editReply({ embeds: [errorEmbed('Already Has Role', `${user} already has this role.`)] });
      await member.roles.add(role, reason);
      await ActivityLog.create({ guildId: interaction.guild.id, action: 'role_given', targetUserId: user.id, targetUsername: user.tag, performedBy: interaction.user.id, performedByUsername: interaction.user.tag, roleId: role.id, roleName: role.name });
      return interaction.editReply({ embeds: [successEmbed('Role Given', `Gave ${role} to ${user}.`)] });
    }

    if (sub === 'remove') {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const check = canManageRole(role);
      if (!check.allowed) return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
      if (!member.roles.cache.has(role.id)) return interaction.editReply({ embeds: [errorEmbed('No Role', `${user} doesn't have this role.`)] });
      await member.roles.remove(role);
      await ActivityLog.create({ guildId: interaction.guild.id, action: 'role_removed', targetUserId: user.id, targetUsername: user.tag, performedBy: interaction.user.id, performedByUsername: interaction.user.tag, roleId: role.id, roleName: role.name });
      return interaction.editReply({ embeds: [successEmbed('Role Removed', `Removed ${role} from ${user}.`)] });
    }

    if (sub === 'temp') {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const durationStr = interaction.options.getString('duration');
      const duration = ms(durationStr);
      if (!duration || duration < 60000) return interaction.editReply({ embeds: [errorEmbed('Invalid Duration', 'Use format like 1h, 1d, 1w.')] });
      const check = canManageRole(role);
      if (!check.allowed) return interaction.editReply({ embeds: [errorEmbed('Cannot Manage Role', check.reason)] });
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')] });
      await member.roles.add(role);
      const expiresAt = new Date(Date.now() + duration);
      await TempRole.create({ guildId: interaction.guild.id, userId: user.id, roleId: role.id, roleName: role.name, givenBy: interaction.user.id, expiresAt });
      return interaction.editReply({ embeds: [successEmbed('Temporary Role Given', `Gave ${role} to ${user}.\nExpires: <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`)] });
    }

    if (sub === 'list') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed('Member Not Found', 'Could not find that member.')], ephemeral: true });
      const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString());
      const embed = new EmbedBuilder().setColor(COLORS.PRIMARY).setTitle(`Roles for ${member.user.tag}`).setDescription(roles.length ? roles.join(' ') : 'No roles').setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'info') {
      const role = interaction.options.getRole('role');
      const count = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;
      const embed = new EmbedBuilder().setColor(role.hexColor || COLORS.PRIMARY).setTitle(`Role: ${role.name}`)
        .addFields({ name: 'ID', value: role.id, inline: true }, { name: 'Color', value: role.hexColor || 'None', inline: true }, { name: 'Members', value: String(count), inline: true }, { name: 'Position', value: String(role.position), inline: true }).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
