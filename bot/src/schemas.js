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
      'config_updated', 'tier_created', 'tier_updated'
    ],
    required: true
  },
  targetUserId: { type: String },
  targetUsername: { type: String },
  performedBy: { type: String },
  performedByUsername: { type: String },
  roleId: { type: String },
  roleName: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true }
});

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

module.exports = {
  Guild: mongoose.model('Guild', guildSchema),
  RoleRequest: mongoose.model('RoleRequest', roleRequestSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
  TempRole: mongoose.model('TempRole', tempRoleSchema),
  UserStats: mongoose.model('UserStats', userStatsSchema)
};
