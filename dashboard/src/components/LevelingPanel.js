'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  Settings,
  Search,
  Crown,
  Star,
  Zap,
  Plus,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';

export default function LevelingPanel({ guildId, channels, roles, onMessage }) {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [config, setConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [guildId, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaderboardRes, configRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/leveling/leaderboard?page=${page}&limit=20`),
        fetch(`/api/guilds/${guildId}/leveling/config`)
      ]);

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.users || []);
        setTotalPages(data.pagination?.pages || 1);
      }

      if (configRes.ok) {
        setConfig(await configRes.json());
      } else {
        // Set default config
        setConfig({
          enabled: false,
          xpPerMessage: 15,
          xpCooldown: 60,
          levelUpChannelId: null,
          levelUpMessage: 'Congratulations {user}! You reached level {level}!',
          roleRewards: [],
          ignoredChannels: [],
          ignoredRoles: [],
          xpMultipliers: []
        });
      }
    } catch (error) {
      console.error('Error fetching leveling data:', error);
      // Set default config on error
      setConfig({
        enabled: false,
        xpPerMessage: 15,
        xpCooldown: 60,
        levelUpChannelId: null,
        levelUpMessage: 'Congratulations {user}! You reached level {level}!',
        roleRewards: [],
        ignoredChannels: [],
        ignoredRoles: [],
        xpMultipliers: []
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/leveling/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        onMessage('success', 'Leveling settings saved');
      } else {
        onMessage('error', 'Failed to save settings');
      }
    } catch (error) {
      onMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addRoleReward = () => {
    setConfig({
      ...config,
      roleRewards: [
        ...config.roleRewards,
        { level: 1, roleId: '', removeOnHigherLevel: false }
      ]
    });
  };

  const removeRoleReward = (index) => {
    setConfig({
      ...config,
      roleRewards: config.roleRewards.filter((_, i) => i !== index)
    });
  };

  const updateRoleReward = (index, field, value) => {
    const newRewards = [...config.roleRewards];
    newRewards[index] = { ...newRewards[index], [field]: value };
    setConfig({ ...config, roleRewards: newRewards });
  };

  const addXpMultiplier = () => {
    setConfig({
      ...config,
      xpMultipliers: [
        ...config.xpMultipliers,
        { type: 'role', targetId: '', multiplier: 1.5 }
      ]
    });
  };

  const removeXpMultiplier = (index) => {
    setConfig({
      ...config,
      xpMultipliers: config.xpMultipliers.filter((_, i) => i !== index)
    });
  };

  const getLevelFromXp = (xp) => {
    let level = 0;
    let requiredXp = 100;
    let totalXp = 0;

    while (totalXp + requiredXp <= xp) {
      totalXp += requiredXp;
      level++;
      requiredXp = Math.floor(100 * Math.pow(1.5, level));
    }

    return {
      level,
      currentXp: xp - totalXp,
      requiredXp,
      progress: ((xp - totalXp) / requiredXp) * 100
    };
  };

  const filteredLeaderboard = leaderboard.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full border-4 border-discord-accent/20 border-t-discord-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-discord-accent" />
            Leveling System
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Reward active members with XP and level-based roles
          </p>
        </div>
        {config && (
          <div className="flex items-center gap-3">
            <span className={`badge ${config.enabled ? 'badge-success' : 'badge-error'}`}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-3">
        {[
          { id: 'leaderboard', label: 'Leaderboard', icon: Crown },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'rewards', label: 'Role Rewards', icon: Award },
          { id: 'multipliers', label: 'XP Multipliers', icon: Zap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-discord-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-discord-dark border border-gray-700 rounded-lg focus:border-discord-accent outline-none"
              />
            </div>
            <button
              onClick={fetchData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Leaderboard */}
          <div className="card">
            {filteredLeaderboard.length > 0 ? (
              <div className="space-y-2">
                {filteredLeaderboard.map((user, index) => {
                  const levelInfo = getLevelFromXp(user.xp);
                  const rank = (page - 1) * 20 + index + 1;
                  return (
                    <div
                      key={user.userId}
                      className={`flex items-center gap-4 p-4 rounded-lg transition ${
                        rank <= 3 ? 'bg-gradient-to-r from-discord-accent/10 to-transparent' : 'bg-discord-dark hover:bg-discord-lighter'
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                        rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                        rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                        'bg-discord-lighter text-gray-400'
                      }`}>
                        {rank <= 3 ? <Crown size={18} /> : rank}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.username || 'Unknown User'}</span>
                          <span className="badge badge-primary">Lvl {levelInfo.level}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">{user.xp.toLocaleString()} XP</span>
                          <div className="flex-1 max-w-xs h-2 bg-discord-darker rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-discord-accent to-discord-purple transition-all"
                              style={{ width: `${levelInfo.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {levelInfo.currentXp}/{levelInfo.requiredXp}
                          </span>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="text-right">
                        <p className="text-sm font-medium">{user.messageCount?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-500">messages</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && config && (
        <div className="card space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-discord-dark rounded-lg">
            <div>
              <p className="font-medium">Enable Leveling System</p>
              <p className="text-sm text-gray-500">Members earn XP for sending messages</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* XP Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">XP Per Message</label>
              <input
                type="number"
                value={config.xpPerMessage}
                onChange={(e) => setConfig({ ...config, xpPerMessage: parseInt(e.target.value) || 15 })}
                className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Base XP gained per message (1-100)</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">XP Cooldown (seconds)</label>
              <input
                type="number"
                value={config.xpCooldown}
                onChange={(e) => setConfig({ ...config, xpCooldown: parseInt(e.target.value) || 60 })}
                className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Time between XP gains (prevents spam)</p>
            </div>
          </div>

          {/* Level Up Announcement */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Level Up Channel</label>
            <select
              value={config.levelUpChannelId || ''}
              onChange={(e) => setConfig({ ...config, levelUpChannelId: e.target.value || null })}
              className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
            >
              <option value="">Same channel as message</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Level Up Message</label>
            <textarea
              value={config.levelUpMessage}
              onChange={(e) => setConfig({ ...config, levelUpMessage: e.target.value })}
              className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
              rows={2}
              placeholder="Congratulations {user}! You reached level {level}!"
            />
            <p className="text-xs text-gray-500 mt-1">
              Variables: {'{user}'}, {'{level}'}, {'{server}'}
            </p>
          </div>

          {/* Ignored Channels */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Ignored Channels</label>
            <select
              multiple
              value={config.ignoredChannels || []}
              onChange={(e) => setConfig({
                ...config,
                ignoredChannels: Array.from(e.target.selectedOptions, opt => opt.value)
              })}
              className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2 min-h-[100px]"
            >
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Messages in these channels won't earn XP</p>
          </div>

          {/* Save Button */}
          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Role Rewards Tab */}
      {activeTab === 'rewards' && config && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Role Rewards</h3>
              <p className="text-sm text-gray-500">Automatically assign roles when users reach certain levels</p>
            </div>
            <button onClick={addRoleReward} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              Add Reward
            </button>
          </div>

          {config.roleRewards?.length > 0 ? (
            <div className="space-y-3">
              {config.roleRewards.map((reward, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-discord-dark rounded-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-400">Level</label>
                    <input
                      type="number"
                      value={reward.level}
                      onChange={(e) => updateRoleReward(index, 'level', parseInt(e.target.value) || 1)}
                      className="w-20 bg-discord-darker border border-gray-600 rounded px-3 py-1"
                      min="1"
                    />
                  </div>

                  <div className="flex-1">
                    <select
                      value={reward.roleId}
                      onChange={(e) => updateRoleReward(index, 'roleId', e.target.value)}
                      className="w-full bg-discord-darker border border-gray-600 rounded px-3 py-1"
                    >
                      <option value="">Select role...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={reward.removeOnHigherLevel}
                      onChange={(e) => updateRoleReward(index, 'removeOnHigherLevel', e.target.checked)}
                    />
                    Remove on higher level
                  </label>

                  <button
                    onClick={() => removeRoleReward(index)}
                    className="text-discord-red hover:bg-discord-red/20 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No role rewards configured</p>
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Rewards'}
          </button>
        </div>
      )}

      {/* XP Multipliers Tab */}
      {activeTab === 'multipliers' && config && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">XP Multipliers</h3>
              <p className="text-sm text-gray-500">Give bonus XP to specific roles or channels</p>
            </div>
            <button onClick={addXpMultiplier} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              Add Multiplier
            </button>
          </div>

          {config.xpMultipliers?.length > 0 ? (
            <div className="space-y-3">
              {config.xpMultipliers.map((mult, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-discord-dark rounded-lg">
                  <select
                    value={mult.type}
                    onChange={(e) => {
                      const newMults = [...config.xpMultipliers];
                      newMults[index] = { ...mult, type: e.target.value, targetId: '' };
                      setConfig({ ...config, xpMultipliers: newMults });
                    }}
                    className="bg-discord-darker border border-gray-600 rounded px-3 py-1"
                  >
                    <option value="role">Role</option>
                    <option value="channel">Channel</option>
                  </select>

                  <div className="flex-1">
                    <select
                      value={mult.targetId}
                      onChange={(e) => {
                        const newMults = [...config.xpMultipliers];
                        newMults[index] = { ...mult, targetId: e.target.value };
                        setConfig({ ...config, xpMultipliers: newMults });
                      }}
                      className="w-full bg-discord-darker border border-gray-600 rounded px-3 py-1"
                    >
                      <option value="">Select {mult.type}...</option>
                      {mult.type === 'role' ? (
                        roles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))
                      ) : (
                        channels.map(ch => (
                          <option key={ch.id} value={ch.id}>#{ch.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={mult.multiplier}
                      onChange={(e) => {
                        const newMults = [...config.xpMultipliers];
                        newMults[index] = { ...mult, multiplier: parseFloat(e.target.value) || 1 };
                        setConfig({ ...config, xpMultipliers: newMults });
                      }}
                      className="w-20 bg-discord-darker border border-gray-600 rounded px-3 py-1"
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-400">x</span>
                  </div>

                  <button
                    onClick={() => removeXpMultiplier(index)}
                    className="text-discord-red hover:bg-discord-red/20 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No XP multipliers configured</p>
            </div>
          )}

          <button
            onClick={saveConfig}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Multipliers'}
          </button>
        </div>
      )}
    </div>
  );
}
