const { SlashCommandBuilder } = require('discord.js');
const { Guild } = require('../../schemas');
const { createRoleRequest } = require('../../utils/requestHandler');
const { errorEmbed, roleRequestEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('request-role')
    .setDescription('Request a role from server moderators')
    .addRoleOption(option => option.setName('role').setDescription('The role you want to request').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Why do you want this role?').setRequired(false).setMaxLength(500)),
  cooldown: 10,
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason');

    if (role.managed || role.id === interaction.guild.id) {
      return interaction.editReply({ embeds: [errorEmbed('Invalid Role', 'This role cannot be requested.')] });
    }

    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.editReply({ embeds: [errorEmbed('Permission Error', 'I cannot assign this role.')] });
    }

    const result = await createRoleRequest(interaction, role.id, reason);
    if (!result.success) return interaction.editReply({ embeds: [errorEmbed('Request Failed', result.error)] });

    return interaction.editReply({ content: '✅ Your role request has been submitted!', embeds: [roleRequestEmbed(result.request, 'pending')] });
  }
};
