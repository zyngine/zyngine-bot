import mongoose from 'mongoose';

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

// Role Request Schema
const roleRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String },
  roleId: { type: String, required: true },
  roleName: { type: String },
  reason: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'cancelled', 'expired'],
    default: 'pending'
  },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Ticket Schema - Enhanced with form responses and more features
const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  threadId: { type: String },
  userId: { type: String, required: true },
  username: { type: String },
  userAvatar: { type: String },
  ticketNumber: { type: Number, required: true },
  category: { type: String },
  categoryId: { type: String },
  subject: { type: String },

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

  claimedBy: { type: String },
  claimedByUsername: { type: String },
  claimedAt: { type: Date },

  closedBy: { type: String },
  closedByUsername: { type: String },
  closedAt: { type: Date },
  closeReason: { type: String },

  escalatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
  escalatedBy: { type: String },
  escalatedAt: { type: Date },
  escalationReason: { type: String },

  participants: [{
    userId: { type: String },
    username: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],

  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String },
    submittedAt: { type: Date }
  },

  transcript: { type: String },
  transcriptUrl: { type: String },

  messageCount: { type: Number, default: 0 },
  firstResponseAt: { type: Date },
  lastMessageAt: { type: Date },

  tags: [{ type: String }],

  panelId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Ticket Panel Schema - Full Ticket Tool Premium features
const ticketPanelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String },
  name: { type: String, required: true },
  description: { type: String },

  embed: {
    title: { type: String },
    description: { type: String },
    color: { type: String, default: '#5865F2' },
    thumbnail: { type: String },
    image: { type: String },
    footer: { type: String }
  },

  button: {
    label: { type: String, default: 'Create Ticket' },
    emoji: { type: String },
    style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' }
  },

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

  multiPanel: {
    enabled: { type: Boolean, default: false },
    attachedPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' }],
    buttonsPerRow: { type: Number, default: 5, min: 1, max: 5 }
  },

  style: {
    type: { type: String, enum: ['channel', 'thread', 'dropdown'], default: 'channel' },
    threadParentId: { type: String },
    dropdownPlaceholder: { type: String, default: 'Select a category...' }
  },

  forms: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    placeholder: { type: String },
    style: { type: String, enum: ['short', 'paragraph'], default: 'short' },
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number }
  }],

  automations: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    trigger: {
      type: { type: String, enum: ['ticket_created', 'ticket_claimed', 'inactivity', 'keyword', 'time_elapsed'], required: true },
      value: { type: mongoose.Schema.Types.Mixed }
    },
    actions: [{
      type: { type: String, enum: ['send_message', 'add_role', 'remove_role', 'close_ticket', 'claim_ticket', 'ping_role', 'set_priority'], required: true },
      value: { type: mongoose.Schema.Types.Mixed }
    }]
  }],

  escalation: {
    enabled: { type: Boolean, default: false },
    targetPanels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketPanel' }],
    requireReason: { type: Boolean, default: true }
  },

  claiming: {
    enabled: { type: Boolean, default: true },
    autoClaimEnabled: { type: Boolean, default: false },
    staffOnlyClaimEnabled: { type: Boolean, default: true },
    unclaimEnabled: { type: Boolean, default: true },
    claimMessage: { type: String, default: 'This ticket has been claimed by {user}.' }
  },

  limits: {
    maxTicketsPerUser: { type: Number, default: 1 },
    maxTotalTickets: { type: Number, default: 0 },
    cooldownSeconds: { type: Number, default: 0 },
    requireRoles: [{ type: String }],
    blacklistRoles: [{ type: String }]
  },

  permissions: {
    supportRoles: [{ type: String }],
    adminRoles: [{ type: String }],
    canCloseRoles: [{ type: String }],
    canDeleteRoles: [{ type: String }],
    canViewAllTickets: [{ type: String }]
  },

  settings: {
    categoryId: { type: String },
    namingScheme: { type: String, default: 'ticket-{number}' },
    autoCloseHours: { type: Number, default: 0 },
    autoCloseWarningHours: { type: Number, default: 0 },
    deleteOnClose: { type: Boolean, default: false },
    deleteAfterHours: { type: Number, default: 0 },
    closeConfirmation: { type: Boolean, default: true },
    feedbackEnabled: { type: Boolean, default: false },
    feedbackMessage: { type: String, default: 'How would you rate your support experience?' }
  },

  transcripts: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String },
    dmToUser: { type: Boolean, default: true },
    format: { type: String, enum: ['text', 'html'], default: 'html' },
    includeAttachments: { type: Boolean, default: true }
  },

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

// Ticket Counter Schema
const ticketCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

// Canned Responses Schema
const cannedResponseSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  shortcut: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String },
  useCount: { type: Number, default: 0 },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: [
      'role_request', 'role_approved', 'role_denied', 'role_cancelled',
      'role_given', 'role_removed', 'role_temp_given', 'role_temp_expired',
      'autorole_given', 'selfrole_given', 'selfrole_removed',
      'reactionrole_given', 'reactionrole_removed',
      'buttonrole_given', 'buttonrole_removed',
      'config_updated', 'tier_created', 'tier_updated',
      'ticket_created', 'ticket_closed', 'ticket_claimed', 'ticket_unclaimed',
      'ticket_escalated', 'ticket_user_added', 'ticket_user_removed',
      'ticket_priority_changed', 'ticket_renamed', 'ticket_reopened',
      'ticket_feedback', 'ticket_archived', 'ticket_deleted',
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

// Ticket Analytics Schema
const ticketAnalyticsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  date: { type: Date, required: true },
  ticketsCreated: { type: Number, default: 0 },
  ticketsClosed: { type: Number, default: 0 },
  avgResponseTime: { type: Number },
  avgResolutionTime: { type: Number },
  feedbackAverage: { type: Number },
  byCategory: { type: Map, of: Number },
  byStaff: { type: Map, of: Number }
});

// Staff Performance Schema
const staffPerformanceSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  odId: { type: String, required: true },
  odUsername: { type: String },
  period: { type: String, required: true },
  periodStart: { type: Date, required: true },
  ticketsClaimed: { type: Number, default: 0 },
  ticketsClosed: { type: Number, default: 0 },
  ticketsResolved: { type: Number, default: 0 },
  avgResponseTime: { type: Number },
  avgResolutionTime: { type: Number },
  totalMessages: { type: Number, default: 0 },
  feedbackReceived: { type: Number, default: 0 },
  feedbackAverage: { type: Number },
  slaBreaches: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

// SLA Config Schema
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

// Internal Notes Schema
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

// Snippets Schema
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

export const Guild = mongoose.models.Guild || mongoose.model('Guild', guildSchema);
export const RoleRequest = mongoose.models.RoleRequest || mongoose.model('RoleRequest', roleRequestSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
export const TicketPanel = mongoose.models.TicketPanel || mongoose.model('TicketPanel', ticketPanelSchema);
export const TicketCounter = mongoose.models.TicketCounter || mongoose.model('TicketCounter', ticketCounterSchema);
export const CannedResponse = mongoose.models.CannedResponse || mongoose.model('CannedResponse', cannedResponseSchema);
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
export const TicketAnalytics = mongoose.models.TicketAnalytics || mongoose.model('TicketAnalytics', ticketAnalyticsSchema);
export const StaffPerformance = mongoose.models.StaffPerformance || mongoose.model('StaffPerformance', staffPerformanceSchema);
export const SlaConfig = mongoose.models.SlaConfig || mongoose.model('SlaConfig', slaConfigSchema);
export const TicketTag = mongoose.models.TicketTag || mongoose.model('TicketTag', ticketTagSchema);
export const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', blacklistSchema);
export const TicketNote = mongoose.models.TicketNote || mongoose.model('TicketNote', ticketNoteSchema);
export const ScheduledAction = mongoose.models.ScheduledAction || mongoose.model('ScheduledAction', scheduledActionSchema);
export const Snippet = mongoose.models.Snippet || mongoose.model('Snippet', snippetSchema);
