'use client';

import { useState, useEffect } from 'react';
import {
  ScrollText,
  Save,
  MessageSquare,
  Users,
  Shield,
  Hash,
  Mic,
  Settings,
  Link,
  Bot,
  Eye,
  EyeOff,
  Palette,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const LOG_CATEGORIES = [
  {
    id: 'messages',
    name: 'Message Logs',
    icon: MessageSquare,
    description: 'Message edits, deletes, and bulk deletes',
    events: [
      { id: 'messageDelete', name: 'Message Delete', description: 'When a message is deleted' },
      { id: 'messageEdit', name: 'Message Edit', description: 'When a message is edited' },
      { id: 'messageBulkDelete', name: 'Bulk Delete', description: 'When multiple messages are deleted at once' }
    ]
  },
  {
    id: 'members',
    name: 'Member Logs',
    icon: Users,
    description: 'Member joins, leaves, and profile changes',
    events: [
      { id: 'memberJoin', name: 'Member Join', description: 'When a member joins the server' },
      { id: 'memberLeave', name: 'Member Leave', description: 'When a member leaves the server' },
      { id: 'memberNicknameChange', name: 'Nickname Change', description: 'When a member changes their nickname' },
      { id: 'memberAvatarChange', name: 'Avatar Change', description: 'When a member changes their avatar' },
      { id: 'memberRoleAdd', name: 'Role Added', description: 'When a role is added to a member' },
      { id: 'memberRoleRemove', name: 'Role Removed', description: 'When a role is removed from a member' }
    ]
  },
  {
    id: 'moderation',
    name: 'Moderation Logs',
    icon: Shield,
    description: 'Bans, kicks, timeouts, and mod actions',
    events: [
      { id: 'memberBan', name: 'Member Ban', description: 'When a member is banned' },
      { id: 'memberUnban', name: 'Member Unban', description: 'When a member is unbanned' },
      { id: 'memberKick', name: 'Member Kick', description: 'When a member is kicked' },
      { id: 'memberTimeout', name: 'Member Timeout', description: 'When a member is timed out' }
    ]
  },
  {
    id: 'roles',
    name: 'Role Logs',
    icon: Shield,
    description: 'Role creation, deletion, and updates',
    events: [
      { id: 'roleCreate', name: 'Role Create', description: 'When a role is created' },
      { id: 'roleDelete', name: 'Role Delete', description: 'When a role is deleted' },
      { id: 'roleUpdate', name: 'Role Update', description: 'When a role is modified' }
    ]
  },
  {
    id: 'channels',
    name: 'Channel Logs',
    icon: Hash,
    description: 'Channel creation, deletion, and updates',
    events: [
      { id: 'channelCreate', name: 'Channel Create', description: 'When a channel is created' },
      { id: 'channelDelete', name: 'Channel Delete', description: 'When a channel is deleted' },
      { id: 'channelUpdate', name: 'Channel Update', description: 'When a channel is modified' }
    ]
  },
  {
    id: 'voice',
    name: 'Voice Logs',
    icon: Mic,
    description: 'Voice channel joins, leaves, and moves',
    events: [
      { id: 'voiceJoin', name: 'Voice Join', description: 'When a member joins a voice channel' },
      { id: 'voiceLeave', name: 'Voice Leave', description: 'When a member leaves a voice channel' },
      { id: 'voiceMove', name: 'Voice Move', description: 'When a member moves between voice channels' },
      { id: 'voiceMute', name: 'Voice Mute', description: 'When a member is muted/unmuted' },
      { id: 'voiceDeafen', name: 'Voice Deafen', description: 'When a member is deafened/undeafened' }
    ]
  },
  {
    id: 'server',
    name: 'Server Logs',
    icon: Settings,
    description: 'Server settings and emoji changes',
    events: [
      { id: 'serverUpdate', name: 'Server Update', description: 'When server settings are changed' },
      { id: 'emojiCreate', name: 'Emoji Create', description: 'When an emoji is added' },
      { id: 'emojiDelete', name: 'Emoji Delete', description: 'When an emoji is removed' },
      { id: 'stickerCreate', name: 'Sticker Create', description: 'When a sticker is added' },
      { id: 'stickerDelete', name: 'Sticker Delete', description: 'When a sticker is removed' }
    ]
  },
  {
    id: 'invites',
    name: 'Invite Logs',
    icon: Link,
    description: 'Invite creation and deletion',
    events: [
      { id: 'inviteCreate', name: 'Invite Create', description: 'When an invite is created' },
      { id: 'inviteDelete', name: 'Invite Delete', description: 'When an invite is deleted' }
    ]
  }
];

export default function LoggingPanel({ guildId, channels, roles, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('channels');

  const textChannels = channels?.filter(c => c.type === 0) || [];

  useEffect(() => {
    fetchConfig();
  }, [guildId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/logging`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching logging config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/logging`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        onMessage('success', 'Logging configuration saved!');
      } else {
        onMessage('error', 'Failed to save configuration');
      }
    } catch (error) {
      onMessage('error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const parts = path.split('.');
      let current = newConfig;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
      return newConfig;
    });
  };

  const toggleAllEvents = (categoryId, enabled) => {
    const category = LOG_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    setConfig(prev => {
      const newEvents = { ...prev.events };
      category.events.forEach(e => {
        newEvents[e.id] = enabled;
      });
      return { ...prev, events: newEvents };
    });
  };

  const getCategoryEventCount = (categoryId) => {
    const category = LOG_CATEGORIES.find(c => c.id === categoryId);
    if (!category || !config?.events) return { enabled: 0, total: 0 };

    const total = category.events.length;
    const enabled = category.events.filter(e => config.events[e.id]).length;
    return { enabled, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-discord-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-discord-accent" />
            Server Logging
          </h2>
          <p className="text-gray-400 mt-1">Configure comprehensive logging for your server</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-gray-400">Logging Enabled</span>
            <button
              onClick={() => updateConfig('enabled', !config?.enabled)}
              className={`relative w-12 h-6 rounded-full transition-all ${
                config?.enabled ? 'bg-discord-accent' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                config?.enabled ? 'left-7' : 'left-1'
              }`} />
            </button>
          </label>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'channels', label: 'Log Channels', icon: Hash },
          { id: 'events', label: 'Events', icon: Eye },
          { id: 'ignore', label: 'Ignore List', icon: EyeOff },
          { id: 'appearance', label: 'Appearance', icon: Palette }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-discord-accent/20 text-discord-accent'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Log Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Assign channels for different types of logs. You can use the same channel for multiple log types or separate them.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LOG_CATEGORIES.map(category => {
              const Icon = category.icon;
              return (
                <div key={category.id} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-discord-accent/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-discord-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <select
                    value={config?.channels?.[category.id] || ''}
                    onChange={(e) => updateConfig(`channels.${category.id}`, e.target.value || null)}
                    className="input w-full"
                  >
                    <option value="">Disabled</option>
                    {textChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="card bg-discord-accent/10 border-discord-accent/30">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-discord-accent mt-0.5" />
              <div>
                <p className="font-medium">Quick Setup</p>
                <p className="text-sm text-gray-400 mt-1">
                  Want all logs in one channel? Select the same channel for each category, or create a #logs channel and select it everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Toggle which events should be logged. Disabled events won't be sent even if a channel is configured.
          </p>

          {LOG_CATEGORIES.map(category => {
            const Icon = category.icon;
            const { enabled, total } = getCategoryEventCount(category.id);
            const isExpanded = expandedCategory === category.id;

            return (
              <div key={category.id} className="card">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-discord-accent/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-discord-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-xs text-gray-500">{enabled}/{total} events enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllEvents(category.id, enabled < total);
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      {enabled === total ? 'Disable All' : 'Enable All'}
                    </button>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    {category.events.map(event => (
                      <label
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-discord-darker hover:bg-discord-lighter transition-all cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-xs text-gray-500">{event.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={config?.events?.[event.id] ?? true}
                          onChange={(e) => updateConfig(`events.${event.id}`, e.target.checked)}
                          className="w-5 h-5"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ignore List Tab */}
      {activeTab === 'ignore' && (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm">
            Configure which channels, roles, or users should be ignored by the logging system.
          </p>

          {/* Ignored Channels */}
          <div className="card">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Hash size={18} />
              Ignored Channels
            </h4>
            <p className="text-sm text-gray-500 mb-3">
              Message logs won't be recorded from these channels.
            </p>
            <select
              multiple
              value={config?.ignoredChannels || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, o => o.value);
                updateConfig('ignoredChannels', values);
              }}
              className="input h-32 w-full"
            >
              {textChannels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Ignored Roles */}
          <div className="card">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Shield size={18} />
              Ignored Roles
            </h4>
            <p className="text-sm text-gray-500 mb-3">
              Actions by members with these roles won't be logged.
            </p>
            <select
              multiple
              value={config?.ignoredRoles || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, o => o.value);
                updateConfig('ignoredRoles', values);
              }}
              className="input h-32 w-full"
            >
              {roles?.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <p className="text-gray-400 text-sm">
            Customize how log messages appear in your channels.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h4 className="font-semibold mb-4">Embed Color</h4>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={config?.embedColor || '#00D4AA'}
                  onChange={(e) => updateConfig('embedColor', e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={config?.embedColor || '#00D4AA'}
                  onChange={(e) => updateConfig('embedColor', e.target.value)}
                  className="input flex-1"
                  placeholder="#00D4AA"
                />
              </div>
            </div>

            <div className="card space-y-4">
              <h4 className="font-semibold">Display Options</h4>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Show Timestamps</span>
                <input
                  type="checkbox"
                  checked={config?.showTimestamps ?? true}
                  onChange={(e) => updateConfig('showTimestamps', e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Show User Avatars</span>
                <input
                  type="checkbox"
                  checked={config?.showAvatars ?? true}
                  onChange={(e) => updateConfig('showAvatars', e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Compact Mode</span>
                <input
                  type="checkbox"
                  checked={config?.compactMode ?? false}
                  onChange={(e) => updateConfig('compactMode', e.target.checked)}
                  className="w-5 h-5"
                />
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="card">
            <h4 className="font-semibold mb-4">Preview</h4>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#2f3136', borderLeft: `4px solid ${config?.embedColor || '#00D4AA'}` }}
            >
              <div className="flex items-start gap-3">
                {config?.showAvatars && (
                  <div className="w-10 h-10 rounded-full bg-discord-accent flex items-center justify-center text-sm font-bold">
                    U
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Message Deleted</span>
                    {config?.showTimestamps && (
                      <span className="text-xs text-gray-400">Today at 12:34 PM</span>
                    )}
                  </div>
                  {!config?.compactMode && (
                    <>
                      <p className="text-sm text-gray-300 mt-1">
                        <span className="text-gray-400">Author:</span> ExampleUser#1234
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="text-gray-400">Channel:</span> #general
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="text-gray-400">Content:</span> This is an example message that was deleted.
                      </p>
                    </>
                  )}
                  {config?.compactMode && (
                    <p className="text-sm text-gray-300 mt-1">
                      ExampleUser deleted a message in #general
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
