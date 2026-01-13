const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { ApplicationTemplate, ApplicationSubmission } = require('../../schemas');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply for a position or role')
    .addStringOption(option =>
      option
        .setName('application')
        .setDescription('The application to apply for')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  cooldown: 5,

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    try {
      const applications = await ApplicationTemplate.find({
        guildId: interaction.guild.id,
        enabled: true
      }).select('name description').lean();

      const filtered = applications
        .filter(app => app.name.toLowerCase().includes(focusedValue))
        .slice(0, 25);

      await interaction.respond(
        filtered.map(app => ({
          name: app.name,
          value: app._id.toString()
        }))
      );
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const applicationId = interaction.options.getString('application');

    // If no application specified, show a list
    if (!applicationId) {
      const applications = await ApplicationTemplate.find({
        guildId: interaction.guild.id,
        enabled: true
      }).lean();

      if (applications.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.WARNING)
              .setDescription('There are no applications available at this time.')
          ],
          ephemeral: true
        });
      }

      // If only one application, apply directly
      if (applications.length === 1) {
        return this.startApplication(interaction, applications[0]);
      }

      // Show selection menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('application_select')
        .setPlaceholder('Select an application...')
        .addOptions(
          applications.slice(0, 25).map(app => ({
            label: app.name,
            description: app.description?.substring(0, 100) || 'No description',
            value: app._id.toString()
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Available Applications')
        .setDescription('Select an application from the dropdown below to apply.')
        .addFields(
          applications.slice(0, 10).map(app => ({
            name: app.name,
            value: app.description || 'No description',
            inline: true
          }))
        );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // Find the application
    const application = await ApplicationTemplate.findById(applicationId);

    if (!application || application.guildId !== interaction.guild.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('Application not found.')
        ],
        ephemeral: true
      });
    }

    if (!application.enabled) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setDescription('This application is currently closed.')
        ],
        ephemeral: true
      });
    }

    return this.startApplication(interaction, application);
  },

  async startApplication(interaction, application) {
    const member = interaction.member;

    // Check required roles
    if (application.requiredRoles?.length > 0) {
      const hasRequiredRole = application.requiredRoles.some(roleId =>
        member.roles.cache.has(roleId)
      );
      if (!hasRequiredRole) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription('You do not have the required roles to apply for this position.')
          ],
          ephemeral: true
        });
      }
    }

    // Check restricted roles
    if (application.restrictedRoles?.length > 0) {
      const hasRestrictedRole = application.restrictedRoles.some(roleId =>
        member.roles.cache.has(roleId)
      );
      if (hasRestrictedRole) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.ERROR)
              .setDescription('You cannot apply for this position with your current roles.')
          ],
          ephemeral: true
        });
      }
    }

    // Check for pending application
    const pendingApplication = await ApplicationSubmission.findOne({
      applicationId: application._id,
      userId: interaction.user.id,
      status: 'pending'
    });

    if (pendingApplication) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setDescription('You already have a pending application. Please wait for a response before applying again.')
        ],
        ephemeral: true
      });
    }

    // Check cooldown
    if (application.cooldown > 0) {
      const lastSubmission = await ApplicationSubmission.findOne({
        applicationId: application._id,
        userId: interaction.user.id
      }).sort({ createdAt: -1 });

      if (lastSubmission) {
        const cooldownEnd = new Date(lastSubmission.createdAt.getTime() + application.cooldown * 1000);
        if (new Date() < cooldownEnd) {
          const remainingTime = Math.ceil((cooldownEnd - new Date()) / 1000);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.WARNING)
                .setDescription(`You must wait ${remainingTime} seconds before applying again.`)
            ],
            ephemeral: true
          });
        }
      }
    }

    // Build modal with questions (max 5 questions per modal)
    const questions = application.questions.slice(0, 5);

    if (questions.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('This application has no questions configured.')
        ],
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`application_${application._id}`)
      .setTitle(application.name.substring(0, 45));

    questions.forEach((question, index) => {
      const textInput = new TextInputBuilder()
        .setCustomId(`question_${question.id}`)
        .setLabel(question.label.substring(0, 45))
        .setStyle(question.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(question.required)
        .setPlaceholder(question.placeholder || '');

      if (question.minLength) textInput.setMinLength(question.minLength);
      if (question.maxLength) textInput.setMaxLength(question.maxLength);

      const row = new ActionRowBuilder().addComponents(textInput);
      modal.addComponents(row);
    });

    await interaction.showModal(modal);
  }
};
