const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { ApplicationTemplate, ApplicationSubmission } = require('../schemas');
const { COLORS } = require('./embeds');

/**
 * Handle application selection from dropdown
 */
async function handleApplicationSelect(interaction) {
  const applicationId = interaction.values[0];

  const application = await ApplicationTemplate.findById(applicationId);
  if (!application || !application.enabled) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setDescription('This application is no longer available.')
      ],
      ephemeral: true
    });
  }

  // Use the apply command's startApplication logic
  const applyCommand = interaction.client.commands.get('apply');
  if (applyCommand?.startApplication) {
    await applyCommand.startApplication(interaction, application);
  } else {
    // Fallback: build modal directly
    await buildApplicationModal(interaction, application);
  }
}

/**
 * Build and show the application modal
 */
async function buildApplicationModal(interaction, application) {
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

  questions.forEach((question) => {
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

/**
 * Handle application form submission
 */
async function handleApplicationSubmit(interaction) {
  const applicationId = interaction.customId.replace('application_', '');

  const application = await ApplicationTemplate.findById(applicationId);
  if (!application) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setDescription('Application not found.')
      ],
      ephemeral: true
    });
  }

  // Collect responses
  const responses = [];
  for (const question of application.questions.slice(0, 5)) {
    const answer = interaction.fields.getTextInputValue(`question_${question.id}`);
    responses.push({
      questionId: question.id,
      questionLabel: question.label,
      answer
    });
  }

  // Create submission
  const submission = new ApplicationSubmission({
    guildId: interaction.guild.id,
    applicationId: application._id,
    applicationName: application.name,
    userId: interaction.user.id,
    username: interaction.user.username,
    userAvatar: interaction.user.avatar,
    responses,
    status: 'pending'
  });

  await submission.save();

  // Send confirmation to user
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('Application Submitted')
        .setDescription(application.completionMessage || 'Your application has been submitted successfully!')
        .setFooter({ text: `Application ID: ${submission._id}` })
        .setTimestamp()
    ],
    ephemeral: true
  });

  // DM user if enabled
  if (application.dmOnSubmit) {
    try {
      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`Application Submitted - ${application.name}`)
            .setDescription(`Your application for **${application.name}** in **${interaction.guild.name}** has been submitted.`)
            .addFields({ name: 'Status', value: 'Pending Review', inline: true })
            .setTimestamp()
        ]
      });
    } catch (e) {
      // User has DMs disabled
    }
  }

  // Send to log channel
  if (application.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(application.logChannelId);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`New Application: ${application.name}`)
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      // Add responses as fields
      responses.forEach((r, idx) => {
        logEmbed.addFields({
          name: `${idx + 1}. ${r.questionLabel}`,
          value: r.answer || 'No answer',
          inline: false
        });
      });

      logEmbed.setFooter({ text: `User ID: ${interaction.user.id} | Submission ID: ${submission._id}` });

      // Create accept/deny buttons
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_accept_${submission._id}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`app_deny_${submission._id}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

      // Ping roles if configured
      let content = '';
      if (application.pingRoles?.length > 0) {
        content = application.pingRoles.map(r => `<@&${r}>`).join(' ');
      }

      const logMessage = await logChannel.send({
        content: content || undefined,
        embeds: [logEmbed],
        components: [buttons]
      });

      // Update submission with log message ID
      submission.logMessageId = logMessage.id;

      // Create thread if enabled
      if (application.staffThreads) {
        try {
          const thread = await logMessage.startThread({
            name: `${interaction.user.username} - ${application.name}`,
            autoArchiveDuration: 1440
          });
          submission.threadId = thread.id;
        } catch (e) {
          console.error('Failed to create thread:', e);
        }
      }

      await submission.save();
    }
  }
}

/**
 * Handle application accept/deny buttons
 */
async function handleApplicationButton(interaction) {
  const customId = interaction.customId;
  const isAccept = customId.startsWith('app_accept_');
  const submissionId = customId.replace('app_accept_', '').replace('app_deny_', '');

  const submission = await ApplicationSubmission.findById(submissionId);
  if (!submission) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setDescription('Submission not found.')
      ],
      ephemeral: true
    });
  }

  if (submission.status !== 'pending') {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.WARNING)
          .setDescription(`This application has already been ${submission.status}.`)
      ],
      ephemeral: true
    });
  }

  const application = await ApplicationTemplate.findById(submission.applicationId);
  if (!application) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.ERROR)
          .setDescription('Application template not found.')
      ],
      ephemeral: true
    });
  }

  // Check if user has permission to review
  if (application.managerRoles?.length > 0) {
    const hasPermission = application.managerRoles.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    );
    if (!hasPermission && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setDescription('You do not have permission to review this application.')
        ],
        ephemeral: true
      });
    }
  }

  // Update submission
  submission.status = isAccept ? 'accepted' : 'denied';
  submission.reviewedBy = interaction.user.id;
  submission.reviewedByUsername = interaction.user.username;
  submission.reviewedAt = new Date();
  await submission.save();

  // Get applicant member
  let member;
  try {
    member = await interaction.guild.members.fetch(submission.userId);
  } catch (e) {
    // Member may have left
  }

  // Apply role changes
  if (member) {
    try {
      if (isAccept) {
        // Add accept roles
        if (application.acceptRoles?.length > 0) {
          await member.roles.add(application.acceptRoles);
        }
        // Remove roles on accept
        if (application.removeRolesOnAccept?.length > 0) {
          await member.roles.remove(application.removeRolesOnAccept);
        }
      } else {
        // Add deny roles
        if (application.denyRoles?.length > 0) {
          await member.roles.add(application.denyRoles);
        }
        // Remove roles on deny
        if (application.removeRolesOnDeny?.length > 0) {
          await member.roles.remove(application.removeRolesOnDeny);
        }
      }
    } catch (e) {
      console.error('Failed to update roles:', e);
    }
  }

  // DM applicant if enabled
  if (application.dmOnDecision) {
    try {
      const applicant = await interaction.client.users.fetch(submission.userId);
      await applicant.send({
        embeds: [
          new EmbedBuilder()
            .setColor(isAccept ? COLORS.SUCCESS : COLORS.ERROR)
            .setTitle(`Application ${isAccept ? 'Accepted' : 'Denied'}`)
            .setDescription(isAccept ? application.acceptMessage : application.denyMessage)
            .addFields(
              { name: 'Application', value: application.name, inline: true },
              { name: 'Server', value: interaction.guild.name, inline: true }
            )
            .setTimestamp()
        ]
      });
    } catch (e) {
      // User has DMs disabled
    }
  }

  // Update the log message
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(isAccept ? COLORS.SUCCESS : COLORS.ERROR)
    .addFields({
      name: isAccept ? '✅ Accepted' : '❌ Denied',
      value: `By ${interaction.user} at <t:${Math.floor(Date.now() / 1000)}:f>`,
      inline: false
    });

  await interaction.update({
    embeds: [embed],
    components: [] // Remove buttons
  });
}

module.exports = {
  handleApplicationSelect,
  handleApplicationSubmit,
  handleApplicationButton
};
