'use client';

import { useState, useEffect } from 'react';
import {
  Gavel,
  AlertTriangle,
  UserX,
  Ban,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Shield,
  Settings,
  Users,
  TrendingUp,
} from 'lucide-react';

export default function ModerationPanel({ guildId, channels, roles, onMessage }) {
  const [cases, setCases] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cases');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [guildId]);

  const fetchData = async () => {
    try {
      const [casesRes, configRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/moderation/cases`),
        fetch(`/api/guilds/${guildId}/moderation/config`)
      ]);

      if (casesRes.ok) setCases(await casesRes.json());
      if (configRes.ok) setConfig(await configRes.json());
    } catch (error) {
      console.error('Failed to fetch moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/moderation/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        onMessage('success', 'Moderation settings saved');
      } else {
        onMessage('error', 'Failed to save settings');
      }
    } catch (error) {
      onMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.targetUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.moderatorUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: cases.length,
    warns: cases.filter(c => c.type === 'warn').length,
    kicks: cases.filter(c => c.type === 'kick').length,
    bans: cases.filter(c => c.type === 'ban').length,
    timeouts: cases.filter(c => c.type === 'timeout').length,
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warn': return <AlertTriangle size={16} className="text-discord-yellow" />;
      case 'kick': return <UserX size={16} className="text-orange-400" />;
      case 'ban': case 'unban': return <Ban size={16} className="text-discord-red" />;
      case 'timeout': case 'untimeout': return <Clock size={16} className="text-purple-400" />;
      default: return <Gavel size={16} className="text-gray-400" />;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      warn: 'badge-warning',
      kick: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      ban: 'badge-danger',
      unban: 'badge-success',
      timeout: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      untimeout: 'badge-success',
      mute: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      unmute: 'badge-success',
    };
    return colors[type] || 'badge-primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-discord-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-discord-accent/20 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-discord-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Cases</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-discord-yellow/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-discord-yellow" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.warns}</p>
              <p className="text-sm text-gray-500">Warnings</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <UserX className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.kicks}</p>
              <p className="text-sm text-gray-500">Kicks</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-discord-red/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-discord-red" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.bans}</p>
              <p className="text-sm text-gray-500">Bans</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.timeouts}</p>
              <p className="text-sm text-gray-500">Timeouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'cases', label: 'Mod Cases', icon: Gavel },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'automod', label: 'Auto-Mod', icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-discord-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cases Tab */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Types</option>
              <option value="warn">Warnings</option>
              <option value="kick">Kicks</option>
              <option value="ban">Bans</option>
              <option value="timeout">Timeouts</option>
            </select>
          </div>

          {/* Cases List */}
          <div className="card">
            {filteredCases.length > 0 ? (
              <div className="space-y-3">
                {filteredCases.slice(0, 50).map((modCase) => (
                  <div
                    key={modCase._id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-discord-darker flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(modCase.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">Case #{modCase.caseNumber}</span>
                        <span className={`badge ${getTypeBadge(modCase.type)}`}>
                          {modCase.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        <span className="text-white">{modCase.targetUsername}</span>
                        {' by '}
                        <span className="text-discord-accent">{modCase.moderatorUsername}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1 truncate">{modCase.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(modCase.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(modCase.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Gavel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No moderation cases found</p>
                <p className="text-sm mt-1">Use /mod commands in Discord to create cases</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && config && (
        <div className="card space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Mod Log Channel</label>
            <select
              value={config.logChannelId || ''}
              onChange={(e) => setConfig({ ...config, logChannelId: e.target.value })}
              className="input max-w-md"
            >
              <option value="">No log channel</option>
              {channels?.filter(c => c.type === 0).map(channel => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Channel where moderation actions are logged</p>
          </div>

          <div className="divider" />

          <div>
            <h4 className="font-medium mb-4">Warning Thresholds</h4>
            <p className="text-sm text-gray-400 mb-4">Automatically take action when a user reaches a certain number of warnings</p>

            <div className="space-y-3">
              {(config.warningThresholds || []).map((threshold, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <span className="text-sm text-gray-400">At</span>
                  <input
                    type="number"
                    value={threshold.count}
                    onChange={(e) => {
                      const newThresholds = [...config.warningThresholds];
                      newThresholds[index].count = parseInt(e.target.value);
                      setConfig({ ...config, warningThresholds: newThresholds });
                    }}
                    className="input w-20"
                    min="1"
                  />
                  <span className="text-sm text-gray-400">warnings</span>
                  <select
                    value={threshold.action}
                    onChange={(e) => {
                      const newThresholds = [...config.warningThresholds];
                      newThresholds[index].action = e.target.value;
                      setConfig({ ...config, warningThresholds: newThresholds });
                    }}
                    className="input w-32"
                  >
                    <option value="mute">Mute</option>
                    <option value="kick">Kick</option>
                    <option value="ban">Ban</option>
                  </select>
                  <button
                    onClick={() => {
                      const newThresholds = config.warningThresholds.filter((_, i) => i !== index);
                      setConfig({ ...config, warningThresholds: newThresholds });
                    }}
                    className="text-discord-red hover:bg-discord-red/20 p-2 rounded-lg transition-all"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newThresholds = [...(config.warningThresholds || []), { count: 3, action: 'mute' }];
                  setConfig({ ...config, warningThresholds: newThresholds });
                }}
                className="btn-secondary text-sm"
              >
                + Add Threshold
              </button>
            </div>
          </div>

          <div className="divider" />

          <div>
            <h4 className="font-medium mb-4">Exempt Roles</h4>
            <p className="text-sm text-gray-400 mb-4">These roles won't be affected by auto-moderation</p>
            <select
              multiple
              value={config.exemptRoles || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                setConfig({ ...config, exemptRoles: selected });
              }}
              className="input h-32"
            >
              {roles?.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <button onClick={saveConfig} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Auto-Mod Tab */}
      {activeTab === 'automod' && config && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Moderation</h4>
              <p className="text-sm text-gray-400">Automatically moderate messages and users</p>
            </div>
            <button
              onClick={() => setConfig({
                ...config,
                autoMod: { ...config.autoMod, enabled: !config.autoMod?.enabled }
              })}
              className={`toggle ${config.autoMod?.enabled ? 'active' : ''}`}
            />
          </div>

          {config.autoMod?.enabled && (
            <>
              <div className="divider" />

              {/* Spam Detection */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-discord-red/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-discord-red" />
                    </div>
                    <div>
                      <h5 className="font-medium">Spam Detection</h5>
                      <p className="text-xs text-gray-500">Detect and punish message spam</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({
                      ...config,
                      autoMod: {
                        ...config.autoMod,
                        spamDetection: { ...config.autoMod.spamDetection, enabled: !config.autoMod?.spamDetection?.enabled }
                      }
                    })}
                    className={`toggle ${config.autoMod?.spamDetection?.enabled ? 'active' : ''}`}
                  />
                </div>

                {config.autoMod?.spamDetection?.enabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm text-gray-400">Message Limit</label>
                      <input
                        type="number"
                        value={config.autoMod.spamDetection.messageLimit || 5}
                        onChange={(e) => setConfig({
                          ...config,
                          autoMod: {
                            ...config.autoMod,
                            spamDetection: { ...config.autoMod.spamDetection, messageLimit: parseInt(e.target.value) }
                          }
                        })}
                        className="input mt-1"
                        min="2"
                        max="20"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Time Window (sec)</label>
                      <input
                        type="number"
                        value={config.autoMod.spamDetection.timeWindow || 5}
                        onChange={(e) => setConfig({
                          ...config,
                          autoMod: {
                            ...config.autoMod,
                            spamDetection: { ...config.autoMod.spamDetection, timeWindow: parseInt(e.target.value) }
                          }
                        })}
                        className="input mt-1"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Word Filter */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h5 className="font-medium">Word Filter</h5>
                      <p className="text-xs text-gray-500">Block messages containing banned words</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({
                      ...config,
                      autoMod: {
                        ...config.autoMod,
                        wordFilter: { ...config.autoMod.wordFilter, enabled: !config.autoMod?.wordFilter?.enabled }
                      }
                    })}
                    className={`toggle ${config.autoMod?.wordFilter?.enabled ? 'active' : ''}`}
                  />
                </div>

                {config.autoMod?.wordFilter?.enabled && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-400">Banned Words (one per line)</label>
                    <textarea
                      value={(config.autoMod.wordFilter.words || []).join('\n')}
                      onChange={(e) => setConfig({
                        ...config,
                        autoMod: {
                          ...config.autoMod,
                          wordFilter: { ...config.autoMod.wordFilter, words: e.target.value.split('\n').filter(w => w.trim()) }
                        }
                      })}
                      className="input mt-1 h-32"
                      placeholder="badword1&#10;badword2"
                    />
                  </div>
                )}
              </div>

              {/* Link Filter */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h5 className="font-medium">Link Filter</h5>
                      <p className="text-xs text-gray-500">Block or warn for posting links</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfig({
                      ...config,
                      autoMod: {
                        ...config.autoMod,
                        linkFilter: { ...config.autoMod.linkFilter, enabled: !config.autoMod?.linkFilter?.enabled }
                      }
                    })}
                    className={`toggle ${config.autoMod?.linkFilter?.enabled ? 'active' : ''}`}
                  />
                </div>
              </div>
            </>
          )}

          <button onClick={saveConfig} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
