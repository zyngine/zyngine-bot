'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  Settings,
  Hash,
  Save,
  Plus,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function StarboardPanel({ guildId, channels, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [config, setConfig] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [guildId, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, entriesRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/starboard/config`),
        fetch(`/api/guilds/${guildId}/starboard/entries?page=${page}`)
      ]);

      if (configRes.ok) {
        setConfig(await configRes.json());
      } else {
        setConfig({
          enabled: false,
          channelId: null,
          emoji: '⭐',
          threshold: 3,
          selfStar: false,
          ignoredChannels: [],
          allowNSFW: false,
          embedColor: '#FFD700'
        });
      }

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching starboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/starboard/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        onMessage('success', 'Starboard settings saved');
      } else {
        onMessage('error', 'Failed to save settings');
      }
    } catch (error) {
      onMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

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
            <Star className="w-6 h-6 text-yellow-400" />
            Starboard
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Highlight popular messages in a dedicated channel
          </p>
        </div>
        {config && (
          <span className={`badge ${config.enabled ? 'badge-success' : 'badge-error'}`}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-3">
        {[
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'entries', label: 'Starred Messages', icon: Star }
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

      {/* Settings Tab */}
      {activeTab === 'settings' && config && (
        <div className="card space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-discord-dark rounded-lg">
            <div>
              <p className="font-medium">Enable Starboard</p>
              <p className="text-sm text-gray-500">Messages that reach the star threshold will be posted to the starboard channel</p>
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

          {/* Starboard Channel */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Starboard Channel</label>
            <select
              value={config.channelId || ''}
              onChange={(e) => setConfig({ ...config, channelId: e.target.value || null })}
              className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
            >
              <option value="">Select a channel...</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Messages will be posted here when they reach the star threshold</p>
          </div>

          {/* Emoji & Threshold */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Star Emoji</label>
              <input
                type="text"
                value={config.emoji}
                onChange={(e) => setConfig({ ...config, emoji: e.target.value || '⭐' })}
                className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                maxLength={2}
              />
              <p className="text-xs text-gray-500 mt-1">The emoji users react with</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Star Threshold</label>
              <input
                type="number"
                value={config.threshold}
                onChange={(e) => setConfig({ ...config, threshold: parseInt(e.target.value) || 3 })}
                className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Reactions needed to post to starboard</p>
            </div>
          </div>

          {/* Embed Color */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Embed Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.embedColor}
                onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                className="w-12 h-10 bg-discord-dark border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={config.embedColor}
                onChange={(e) => setConfig({ ...config, embedColor: e.target.value })}
                className="flex-1 bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                placeholder="#FFD700"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm text-gray-400">Options</label>

            <div className="flex items-center justify-between p-3 bg-discord-dark rounded-lg">
              <div>
                <p className="text-sm font-medium">Allow Self-Star</p>
                <p className="text-xs text-gray-500">Users can star their own messages</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={config.selfStar}
                  onChange={(e) => setConfig({ ...config, selfStar: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-discord-dark rounded-lg">
              <div>
                <p className="text-sm font-medium">Allow NSFW Channels</p>
                <p className="text-xs text-gray-500">Include messages from NSFW channels</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={config.allowNSFW}
                  onChange={(e) => setConfig({ ...config, allowNSFW: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
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
            <p className="text-xs text-gray-500 mt-1">Messages from these channels won't be starred</p>
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

      {/* Starred Messages Tab */}
      {activeTab === 'entries' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent Starred Messages</h3>
            <button
              onClick={fetchData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry._id} className="p-4 bg-discord-dark rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{entry.authorUsername || 'Unknown User'}</span>
                        <span className="text-sm text-gray-500">in #{entry.channelName || 'unknown'}</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        {entry.content?.slice(0, 200)}{entry.content?.length > 200 ? '...' : ''}
                      </p>
                      {entry.attachments?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.attachments.length} attachment(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star size={16} fill="currentColor" />
                        {entry.starCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.starboardMessageId && (
                      <span className="badge badge-success text-xs">Posted to starboard</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No starred messages yet</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-700">
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
      )}
    </div>
  );
}
