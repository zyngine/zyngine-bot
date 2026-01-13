const mongoose = require('mongoose');

// Guild Configuration Schema
const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  guildName: { type: String },
  guildIcon: { type: String },
  ownerId: { type: String },
  
  autoRoles: [{
    roleId: { type: String, required: true },
    roleName: { type: String },
    enabled: { type: Boolean, default: true },
    delay: { type: Number, default: 0 },
    ignoreBots: { type: Boolean, default: true },
    minAccountAge: { type: Number, default: 0 }
  }],
  
  welcomeMessage: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: 'Welcome to {server}! You have been assigned the {roles} role(s).' },
    channelId: { type: String }
  },

  aiWelcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String },
    includeServerInfo: { type: Boolean, default: true }
  },

  roleTiers: [{
    name: { type: String, required: true },
    level: { type: Number, required: true },
    color: { type: String, default: '#5865F2' },
    roles: [{ type: String }],
    approverRoles: [{ type: String }],
    requirements: {
      minMessages: { type: Number, default: 0 },
      minAccountAge: { type: Number, default: 0 },
      minServerAge: { type: Number, default: 0 },
      requiredRoles: [{ type: String }]
    }
  }],
  
  selfRoles: [{
    roleId: { type: String, required: true },
    description: { type: String },
    requirements: {
      minMessages: { type: Number, default: 0 },
      requiredRoles: [{ type: String }]
    }
  }],
  
  reactionRoles: [{
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    mode: { type: String, enum: ['normal', 'unique', 'verify', 'drop'], default: 'normal' },
    roles: [{
      emoji: { type: String, required: true },
      roleId: { type: String, required: true },
      description: { type: String }
    }]
  }],
  
  buttonRoles: [{
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    roles: [{
      roleId: { type: String, required: true },
      label: { type: String, required: true },
      style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' },
      emoji: { type: String }
    }]
  }],
  
  rolePermissions: [{
    managerRoleId: { type: String, required: true },
    manageableRoles: [{ type: String }]
  }],
  
  notifications: {
    requestChannelId: { type: String },
    logChannelId: { type: String },
    approvalDMEnabled: { type: Boolean, default: true },
    denialDMEnabled: { type: Boolean, default: true }
  },
  
  requestCooldown: { type: Number, default: 3600 },
  premium: { type: Boolean, default: false },
  premiumUntil: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

guildSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Role Request Schema
const roleRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String },
  userAvatar: { type: String },
  roleId: { type: String, required: true },
  roleName: { type: String },
  reason: { type: String },
  tierLevel: { type: Number },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'denied', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },
  requirementsMet: { type: Boolean, default: true },
  requirementsDetails: { type: String },
  resolvedBy: { type: String },
  resolvedByUsername: { type: String },
  resolvedAt: { type: Date },
  resolutionReason: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date }
});

// Activity Log Schema - Extended with more ticket actions
const activityLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: [
      // Role actions
      'role_request', 'role_approved', 'role_denied', 'role_cancelled',
      'role_given', 'role_removed', 'role_temp_given', 'role_temp_expired',
      'autorole_given', 'selfrole_given', 'selfrole_removed',
      'reactionrole_given', 'reactionrole_removed',
      'buttonrole_given', 'buttonrole_removed',
      'config_updated', 'tier_created', 'tier_updated',
      // Ticket actions
      'ticket_created', 'ticket_closed', 'ticket_claimed', 'ticket_unclaimed',
      'ticket_escalated', 'ticket_user_added', 'ticket_user_removed',
      'ticket_priority_changed', 'ticket_renamed', 'ticket_reopened',
      'ticket_feedback', 'ticket_archived', 'ticket_deleted',
      // Panel actions
      'panel_created', 'panel_updated', 'panel_deleted',
      'automation_triggered'
    ],
    required: true
  },
  targetUserId: { type: String },
  targetUsername: { type: String },
  performedBy: { type: String },
  performedByUsername: { type: String },
  roleId: { type: String },
  roleName: { type: String },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  ticketNumber: { type: Number },
  panelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Canned Responses Schema - For quick replies in tickets
const cannedResponseSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  shortcut: { type: String, required: true }, // e.g., "!greet"
  content: { type: String, required: true },
  category: { type: String },
  useCount: { type: Number, default: 0 },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

cannedResponseSchema.index({ guildId: 1, shortcut: 1 }, { unique: true });

// Ticket Analytics Schema - Enhanced with more metrics
const ticketAnalyticsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  date: { type: Date, required: true },
  ticketsCreated: { type: Number, default: 0 },
  ticketsClosed: { type: Number, default: 0 },
  ticketsReopened: { type: Number, default: 0 },
  avgResponseTime: { type: Number }, // minutes
  avgResolutionTime: { type: Number }, // minutes
  avgMessagesPerTicket: { type: Number },
  feedbackAverage: { type: Number },
  feedbackCount: { type: Number, default: 0 },
  byCategory: { type: Map, of: Number },
  byStaff: { type: Map, of: Number },
  byPriority: { type: Map, of: Number },
  byHour: [{ type: Number }], // 24 entries for each hour
  slaBreaches: { type: Number, default: 0 },
  peakHour: { type: Number }
});

ticketAnalyticsSchema.index({ guildId: 1, date: 1 }, { unique: true });

// Staff Performance Schema - Track individual staff metrics
const staffPerformanceSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  odId: { type: String, required: true },
  odUsername: { type: String },
  period: { type: String, required: true }, // 'daily', 'weekly', 'monthly', 'all-time'
  periodStart: { type: Date, required: true },
  ticketsClaimed: { type: Number, default: 0 },
  ticketsClosed: { type: Number, default: 0 },
  ticketsResolved: { type: Number, default: 0 },
  avgResponseTime: { type: Number }, // minutes
  avgResolutionTime: { type: Number }, // minutes
  totalMessages: { type: Number, default: 0 },
  feedbackReceived: { type: Number, default: 0 },
  feedbackAverage: { type: Number },
  slaBreaches: { type: Number, default: 0 },
  points: { type: Number, default: 0 }, // Gamification points
  updatedAt: { type: Date, default: Date.now }
});

staffPerformanceSchema.index({ guildId: 1, odId: 1, period: 1, periodStart: 1 }, { unique: true });

// SLA Configuration Schema
const slaConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  responseTargets: {
    urgent: { type: Number, default: 15 },
    high: { type: Number, default: 60 },
    medium: { type: Number, default: 240 },
    low: { type: Number, default: 480 }
  },
  resolutionTargets: {
    urgent: { type: Number, default: 60 },
    high: { type: Number, default: 480 },
    medium: { type: Number, default: 1440 },
    low: { type: Number, default: 2880 }
  },
  alerts: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String },
    warnAtPercent: { type: Number, default: 80 },
    pingRoles: [{ type: String }]
  },
  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    schedule: [{
      day: { type: Number },
      start: { type: String },
      end: { type: String }
    }],
    pauseSlaOutsideHours: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ticket Tags Schema
const ticketTagSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  color: { type: String, default: '#5865F2' },
  description: { type: String },
  useCount: { type: Number, default: 0 },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

ticketTagSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Blacklist Schema
const blacklistSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  odId: { type: String, required: true },
  odUsername: { type: String },
  reason: { type: String },
  expiresAt: { type: Date },
  addedBy: { type: String },
  addedByUsername: { type: String },
  createdAt: { type: Date, default: Date.now }
});

blacklistSchema.index({ guildId: 1, odId: 1 }, { unique: true });

// Internal Notes Schema - Staff-only notes on tickets
const ticketNoteSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  guildId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorUsername: { type: String },
  content: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Scheduled Actions Schema
const scheduledActionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  channelId: { type: String },
  type: {
    type: String,
    enum: ['send_message', 'close_ticket', 'reminder', 'escalate', 'ping_staff'],
    required: true
  },
  data: { type: mongoose.Schema.Types.Mixed },
  scheduledFor: { type: Date, required: true, index: true },
  createdBy: { type: String },
  executed: { type: Boolean, default: false },
  executedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Snippets/Macros Schema
const snippetSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  trigger: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  variables: [{ type: String }],
  useCount: { type: Number, default: 0 },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

snippetSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

// Temporary Roles Schema
const tempRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String },
  givenBy: { type: String },
  givenByUsername: { type: String },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// User Stats Schema
const userStatsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  odId: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date },
  joinedAt: { type: Date },
});

userStatsSchema.index({ guildId: 1, odId: 1 }, { unique: true });
// Ticket Schema - Enhanced with form responses and more features
const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  threadId: { type: String }, // For thread-style tickets
  userId: { type: String, required: true, index: true },
  username: { type: String },
  userAvatar: { type: String },
  ticketNumber: { type: Number, required: true },
  category: { type: String },
  categoryId: { type: String },
  subject: { type: String },

  // Form responses from pre-ticket forms
  formResponses: [{
    formId: { type: String, required: true },
    label: { type: String },
    response: { type: String }
  }],

  status: {
    type: String,
    enum: ['open', 'closed', 'archived', 'on_hold'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Claiming
  claimedBy: { type: String },
  claimedByUsername: { type: String },
  claimedAt: { type: Date },

  // Closing
  closedBy: { type: String },
  closedByUsername: { type: String },
  closedAt: { type: Date },
  closeReason: { type: String },

  // Escalation tracking
  escalatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
  escalatedBy: { type: String },
  escalatedAt: { type: Date },
  escalationReason: { type: String },

  // Participants
  participants: [{
    userId: { type: String, required: true },
    username: { type: String },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: String }
  }],

  // Feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    submittedAt: { type: Date }
  },

  // Transcript
  transcript: { type: String },
  transcriptUrl: { type: String }, // URL to HTML transcript if hosted

  // Message count for analytics
  messageCount: { type: Number, default: 0 },
  firstResponseAt: { type: Date },
  lastMessageAt: { type: Date },

  // Tags for organization
  tags: [{ type: String }],

  panelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });

ticketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ticket Panel Schema - Full Ticket Tool Premium features
const ticketPanelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String },
  name: { type: String, required: true },
  description: { type: String },

  // Panel embed customization
  embed: {
    title: { type: String },
    description: { type: String },
    color: { type: String, default: '#5865F2' },
    thumbnail: { type: String },
    image: { type: String },
    footer: { type: String }
  },

  // Button configuration
  button: {
    label: { type: String, default: 'Create Ticket' },
    emoji: { type: String },
    style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' }
  },

  // Ticket categories
  categories: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    emoji: { type: String },
    buttonLabel: { type: String },
    buttonStyle: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' },
    staffRoles: [{ type: String }],
    pingRoles: [{ type: String }],
    welcomeMessage: { type: String, default: 'Thank you for creating a ticket! A staff member will be with you shortly.' },
    // Category-specific forms
    forms: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      placeholder: { type: String },
      style: { type: String, enum: ['short', 'paragraph'], default: 'short' },
      required: { type: Boolean, default: false },
      minLength: { type: Number },
      maxLength: { type: Number }
    }]
  }],

  // Multi-panel support (combine multiple panels)
  multiPanel: {
    enabled: { type: Boolean, default: false },
    attachedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' }],
    buttonsPerRow: { type: Number, default: 5, min: 1, max: 5 }
  },

  // Ticket style options
  style: {
    type: { type: String, enum: ['channel', 'thread', 'dropdown'], default: 'channel' },
    threadParentId: { type: String }, // For thread-style tickets
    dropdownPlaceholder: { type: String, default: 'Select a category...' }
  },

  // Pre-ticket forms (applies to all categories if not category-specific)
  forms: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    placeholder: { type: String },
    style: { type: String, enum: ['short', 'paragraph'], default: 'short' },
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number }
  }],

  // Automations
  automations: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    trigger: {
      type: { type: String, enum: ['ticket_created', 'ticket_claimed', 'inactivity', 'keyword', 'time_elapsed'], required: true },
      value: { type: mongoose.Schema.Types.Mixed } // e.g., hours for inactivity, keyword for keyword trigger
    },
    actions: [{
      type: { type: String, enum: ['send_message', 'add_role', 'remove_role', 'close_ticket', 'claim_ticket', 'ping_role', 'set_priority'], required: true },
      value: { type: mongoose.Schema.Types.Mixed }
    }]
  }],

  // Escalation settings
  escalation: {
    enabled: { type: Boolean, default: false },
    targetPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' }],
    requireReason: { type: Boolean, default: true }
  },

  // Claiming options
  claiming: {
    enabled: { type: Boolean, default: true },
    autoClaimEnabled: { type: Boolean, default: false },
    staffOnlyClaimEnabled: { type: Boolean, default: true },
    unclaimEnabled: { type: Boolean, default: true },
    claimMessage: { type: String, default: 'This ticket has been claimed by {user}.' }
  },

  // Ticket limits
  limits: {
    maxTicketsPerUser: { type: Number, default: 1 },
    maxTotalTickets: { type: Number, default: 0 }, // 0 = unlimited
    cooldownSeconds: { type: Number, default: 0 }, // Time between ticket creations
    requireRoles: [{ type: String }], // Roles required to create tickets
    blacklistRoles: [{ type: String }] // Roles that cannot create tickets
  },

  // Permissions / Staff settings
  permissions: {
    supportRoles: [{ type: String }],
    adminRoles: [{ type: String }],
    canCloseRoles: [{ type: String }],
    canDeleteRoles: [{ type: String }],
    canViewAllTickets: [{ type: String }]
  },

  // General settings
  settings: {
    categoryId: { type: String }, // Discord category for ticket channels
    namingScheme: { type: String, default: 'ticket-{number}' },
    autoCloseHours: { type: Number, default: 0 },
    autoCloseWarningHours: { type: Number, default: 0 },
    deleteOnClose: { type: Boolean, default: false },
    deleteAfterHours: { type: Number, default: 0 },
    closeConfirmation: { type: Boolean, default: true },
    feedbackEnabled: { type: Boolean, default: false },
    feedbackMessage: { type: String, default: 'How would you rate your support experience?' }
  },

  // Transcript settings
  transcripts: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String },
    dmToUser: { type: Boolean, default: true },
    format: { type: String, enum: ['text', 'html'], default: 'html' },
    includeAttachments: { type: Boolean, default: true }
  },

  // Logging settings
  logging: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String },
    logCreation: { type: Boolean, default: true },
    logClose: { type: Boolean, default: true },
    logClaim: { type: Boolean, default: true },
    logEscalation: { type: Boolean, default: true },
    logAddRemoveUser: { type: Boolean, default: true }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ticketPanelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ticket Counter Schema
const ticketCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

// Moderation Case Schema
const moderationCaseSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  caseNumber: { type: Number, required: true },
  type: {
    type: String,
    enum: ['warn', 'mute', 'unmute', 'kick', 'ban', 'unban', 'timeout', 'untimeout'],
    required: true
  },
  targetId: { type: String, required: true, index: true },
  targetUsername: { type: String },
  targetAvatar: { type: String },
  moderatorId: { type: String, required: true },
  moderatorUsername: { type: String },
  reason: { type: String, default: 'No reason provided' },
  duration: { type: Number }, // Duration in minutes for mutes/timeouts
  expiresAt: { type: Date },
  active: { type: Boolean, default: true }, // For mutes/bans that can be reversed
  createdAt: { type: Date, default: Date.now, index: true }
});

moderationCaseSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });

// Moderation Case Counter Schema
const moderationCaseCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

// Moderation Config Schema
const moderationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  logChannelId: { type: String },
  muteRoleId: { type: String },

  // Auto-moderation settings
  autoMod: {
    enabled: { type: Boolean, default: false },
    spamDetection: {
      enabled: { type: Boolean, default: false },
      messageLimit: { type: Number, default: 5 },
      timeWindow: { type: Number, default: 5 }, // seconds
      action: { type: String, enum: ['warn', 'mute', 'kick'], default: 'warn' },
      muteDuration: { type: Number, default: 10 } // minutes
    },
    linkFilter: {
      enabled: { type: Boolean, default: false },
      whitelist: [{ type: String }],
      action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' }
    },
    wordFilter: {
      enabled: { type: Boolean, default: false },
      words: [{ type: String }],
      action: { type: String, enum: ['delete', 'warn', 'mute'], default: 'delete' }
    },
    mentionSpam: {
      enabled: { type: Boolean, default: false },
      limit: { type: Number, default: 5 },
      action: { type: String, enum: ['warn', 'mute', 'kick'], default: 'warn' }
    },
    capsFilter: {
      enabled: { type: Boolean, default: false },
      percentage: { type: Number, default: 70 },
      minLength: { type: Number, default: 10 },
      action: { type: String, enum: ['delete', 'warn'], default: 'delete' }
    }
  },

  // Exempt roles and channels
  exemptRoles: [{ type: String }],
  exemptChannels: [{ type: String }],

  // Warning thresholds
  warningThresholds: [{
    count: { type: Number, required: true },
    action: { type: String, enum: ['mute', 'kick', 'ban'], required: true },
    duration: { type: Number } // For mutes, in minutes
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Leveling Schema
const levelingConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  xpPerMessage: { type: Number, default: 15 },
  xpCooldown: { type: Number, default: 60 }, // seconds
  levelUpChannelId: { type: String },
  levelUpMessage: { type: String, default: 'Congratulations {user}! You reached level {level}!' },
  stackRoles: { type: Boolean, default: false }, // Whether to keep lower level roles

  // Role rewards
  roleRewards: [{
    level: { type: Number, required: true },
    roleId: { type: String, required: true },
    roleName: { type: String }
  }],

  // Exempt channels
  exemptChannels: [{ type: String }],
  exemptRoles: [{ type: String }],

  // Multipliers
  multiplierRoles: [{
    roleId: { type: String, required: true },
    multiplier: { type: Number, default: 1.5 }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Level Schema
const userLevelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  odId: { type: String, required: true, index: true },
  odUsername: { type: String },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastXpAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

userLevelSchema.index({ guildId: 1, odId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, totalXp: -1 }); // For leaderboard

// Starboard Schema
const starboardConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String },
  emoji: { type: String, default: '⭐' },
  threshold: { type: Number, default: 3 },
  selfStar: { type: Boolean, default: false },
  ignoredChannels: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Starboard Entry Schema
const starboardEntrySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  originalMessageId: { type: String, required: true, unique: true },
  originalChannelId: { type: String, required: true },
  starboardMessageId: { type: String },
  authorId: { type: String, required: true },
  authorUsername: { type: String },
  starCount: { type: Number, default: 0 },
  content: { type: String },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Giveaway Schema
const giveawaySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  hostUsername: { type: String },
  prize: { type: String, required: true },
  description: { type: String },
  winnerCount: { type: Number, default: 1 },
  participants: [{ type: String }],
  winners: [{ type: String }],
  requiredRoles: [{ type: String }],
  requiredLevel: { type: Number, default: 0 },
  endsAt: { type: Date, required: true, index: true },
  ended: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Custom Command Schema
const customCommandSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  response: { type: String, required: true },
  embed: {
    enabled: { type: Boolean, default: false },
    title: { type: String },
    description: { type: String },
    color: { type: String, default: '#5865F2' },
    thumbnail: { type: String },
    image: { type: String },
    footer: { type: String }
  },
  allowedRoles: [{ type: String }],
  allowedChannels: [{ type: String }],
  cooldown: { type: Number, default: 0 }, // seconds
  useCount: { type: Number, default: 0 },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Application Template Schema
const applicationTemplateSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  enabled: { type: Boolean, default: true },
  questions: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'paragraph', 'multiple_choice'], default: 'text' },
    placeholder: { type: String },
    required: { type: Boolean, default: true },
    minLength: { type: Number },
    maxLength: { type: Number },
    options: [{ type: String }]
  }],
  logChannelId: { type: String },
  staffThreads: { type: Boolean, default: false },
  completionMessage: { type: String, default: 'Your application has been submitted successfully!' },
  acceptMessage: { type: String, default: 'Congratulations! Your application has been accepted.' },
  denyMessage: { type: String, default: 'Unfortunately, your application has been denied.' },
  requiredRoles: [{ type: String }],
  restrictedRoles: [{ type: String }],
  managerRoles: [{ type: String }],
  pingRoles: [{ type: String }],
  acceptRoles: [{ type: String }],
  denyRoles: [{ type: String }],
  removeRolesOnAccept: [{ type: String }],
  removeRolesOnDeny: [{ type: String }],
  cooldown: { type: Number, default: 0 },
  allowReapply: { type: Boolean, default: true },
  dmOnSubmit: { type: Boolean, default: true },
  dmOnDecision: { type: Boolean, default: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

applicationTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Application Submission Schema
const applicationSubmissionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationTemplate', required: true, index: true },
  applicationName: { type: String },
  userId: { type: String, required: true, index: true },
  username: { type: String },
  userAvatar: { type: String },
  responses: [{
    questionId: { type: String, required: true },
    questionLabel: { type: String },
    answer: { type: String }
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'denied', 'cancelled'],
    default: 'pending',
    index: true
  },
  reviewedBy: { type: String },
  reviewedByUsername: { type: String },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
  logMessageId: { type: String },
  threadId: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Server Logging Configuration Schema
const loggingConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },

  channels: {
    messages: { type: String },
    members: { type: String },
    moderation: { type: String },
    roles: { type: String },
    channels: { type: String },
    voice: { type: String },
    server: { type: String },
    invites: { type: String },
    automod: { type: String }
  },

  events: {
    messageDelete: { type: Boolean, default: true },
    messageEdit: { type: Boolean, default: true },
    messageBulkDelete: { type: Boolean, default: true },
    memberJoin: { type: Boolean, default: true },
    memberLeave: { type: Boolean, default: true },
    memberBan: { type: Boolean, default: true },
    memberUnban: { type: Boolean, default: true },
    memberKick: { type: Boolean, default: true },
    memberTimeout: { type: Boolean, default: true },
    memberNicknameChange: { type: Boolean, default: true },
    memberAvatarChange: { type: Boolean, default: false },
    memberRoleAdd: { type: Boolean, default: true },
    memberRoleRemove: { type: Boolean, default: true },
    roleCreate: { type: Boolean, default: true },
    roleDelete: { type: Boolean, default: true },
    roleUpdate: { type: Boolean, default: true },
    channelCreate: { type: Boolean, default: true },
    channelDelete: { type: Boolean, default: true },
    channelUpdate: { type: Boolean, default: true },
    voiceJoin: { type: Boolean, default: true },
    voiceLeave: { type: Boolean, default: true },
    voiceMove: { type: Boolean, default: true },
    voiceMute: { type: Boolean, default: false },
    voiceDeafen: { type: Boolean, default: false },
    serverUpdate: { type: Boolean, default: true },
    emojiCreate: { type: Boolean, default: true },
    emojiDelete: { type: Boolean, default: true },
    stickerCreate: { type: Boolean, default: false },
    stickerDelete: { type: Boolean, default: false },
    inviteCreate: { type: Boolean, default: true },
    inviteDelete: { type: Boolean, default: true }
  },

  ignoredChannels: [{ type: String }],
  ignoredRoles: [{ type: String }],
  ignoredUsers: [{ type: String }],

  embedColor: { type: String, default: '#00D4AA' },
  showTimestamps: { type: Boolean, default: true },
  showAvatars: { type: Boolean, default: true },
  compactMode: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = {
  Guild: mongoose.model('Guild', guildSchema),
  RoleRequest: mongoose.model('RoleRequest', roleRequestSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
  TempRole: mongoose.model('TempRole', tempRoleSchema),
  UserStats: mongoose.model('UserStats', userStatsSchema),
  Ticket: mongoose.model('Ticket', ticketSchema),
  TicketPanel: mongoose.model('TicketPanel', ticketPanelSchema),
  TicketCounter: mongoose.model('TicketCounter', ticketCounterSchema),
  CannedResponse: mongoose.model('CannedResponse', cannedResponseSchema),
  TicketAnalytics: mongoose.model('TicketAnalytics', ticketAnalyticsSchema),
  StaffPerformance: mongoose.model('StaffPerformance', staffPerformanceSchema),
  SlaConfig: mongoose.model('SlaConfig', slaConfigSchema),
  TicketTag: mongoose.model('TicketTag', ticketTagSchema),
  Blacklist: mongoose.model('Blacklist', blacklistSchema),
  TicketNote: mongoose.model('TicketNote', ticketNoteSchema),
  ScheduledAction: mongoose.model('ScheduledAction', scheduledActionSchema),
  Snippet: mongoose.model('Snippet', snippetSchema),
  // Moderation
  ModerationCase: mongoose.model('ModerationCase', moderationCaseSchema),
  ModerationCaseCounter: mongoose.model('ModerationCaseCounter', moderationCaseCounterSchema),
  ModerationConfig: mongoose.model('ModerationConfig', moderationConfigSchema),
  // Leveling
  LevelingConfig: mongoose.model('LevelingConfig', levelingConfigSchema),
  UserLevel: mongoose.model('UserLevel', userLevelSchema),
  // Starboard
  StarboardConfig: mongoose.model('StarboardConfig', starboardConfigSchema),
  StarboardEntry: mongoose.model('StarboardEntry', starboardEntrySchema),
  // Giveaways
  Giveaway: mongoose.model('Giveaway', giveawaySchema),
  // Custom Commands
  CustomCommand: mongoose.model('CustomCommand', customCommandSchema),
  // Applications
  ApplicationTemplate: mongoose.model('ApplicationTemplate', applicationTemplateSchema),
  ApplicationSubmission: mongoose.model('ApplicationSubmission', applicationSubmissionSchema),
  // Logging
  LoggingConfig: mongoose.model('LoggingConfig', loggingConfigSchema)
};
