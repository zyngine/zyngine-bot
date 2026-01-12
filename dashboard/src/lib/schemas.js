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

// Ticket Schema
const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String },
  userAvatar: { type: String },
  ticketNumber: { type: Number, required: true },
  category: { type: String, default: 'general' },
  subject: { type: String },
  status: {
    type: String,
    enum: ['open', 'closed', 'archived'],
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
  closedBy: { type: String },
  closedByUsername: { type: String },
  closedAt: { type: Date },
  closeReason: { type: String },
  participants: [{
    userId: { type: String },
    username: { type: String },
    addedAt: { type: Date, default: Date.now }
  }],
  transcript: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Ticket Panel Schema
const ticketPanelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  categories: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    emoji: { type: String },
    staffRoles: [{ type: String }],
    welcomeMessage: { type: String, default: 'Thank you for creating a ticket! Staff will be with you shortly.' }
  }],
  settings: {
    categoryId: { type: String },
    namingScheme: { type: String, default: 'ticket-{number}' },
    maxTicketsPerUser: { type: Number, default: 1 },
    autoCloseHours: { type: Number, default: 0 },
    transcriptChannelId: { type: String },
    logChannelId: { type: String },
    dmTranscript: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

// Ticket Counter Schema
const ticketCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 }
});

export const Guild = mongoose.models.Guild || mongoose.model('Guild', guildSchema);
export const RoleRequest = mongoose.models.RoleRequest || mongoose.model('RoleRequest', roleRequestSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
export const TicketPanel = mongoose.models.TicketPanel || mongoose.model('TicketPanel', ticketPanelSchema);
export const TicketCounter = mongoose.models.TicketCounter || mongoose.model('TicketCounter', ticketCounterSchema);
