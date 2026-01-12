'use client';

import { useState, useEffect } from 'react';

export default function SLAConfiguration({ guildId, onMessage }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [guildId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/sla`);
      if (res.ok) {
        setConfig(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch SLA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/sla`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        onMessage?.('success', 'SLA configuration saved');
      } else {
        onMessage?.('error', 'Failed to save SLA configuration');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to save SLA configuration');
    } finally {
      setSaving(false);
    }
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 1440)} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  if (!config) {
    return <div className="text-gray-400">Failed to load SLA configuration</div>;
  }

  const priorities = [
    { key: 'urgent', label: 'Urgent', color: 'bg-red-500' },
    { key: 'high', label: 'High', color: 'bg-orange-500' },
    { key: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { key: 'low', label: 'Low', color: 'bg-gray-500' }
  ];

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">SLA Configuration</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-5 h-5 rounded"
          />
          <span className="font-medium">Enable SLA Tracking</span>
        </label>
      </div>

      {/* Response Time Targets */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">First Response Targets</h3>
        <p className="text-sm text-gray-400 mb-4">
          Set the target time (in minutes) for staff to first respond to tickets based on priority.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priorities.map(({ key, label, color }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-sm mb-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                {label}
              </label>
              <input
                type="number"
                value={config.responseTargets?.[key] || 0}
                onChange={(e) => setConfig({
                  ...config,
                  responseTargets: {
                    ...config.responseTargets,
                    [key]: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatMinutes(config.responseTargets?.[key] || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Time Targets */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Resolution Targets</h3>
        <p className="text-sm text-gray-400 mb-4">
          Set the target time (in minutes) for tickets to be resolved based on priority.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priorities.map(({ key, label, color }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-sm mb-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                {label}
              </label>
              <input
                type="number"
                value={config.resolutionTargets?.[key] || 0}
                onChange={(e) => setConfig({
                  ...config,
                  resolutionTargets: {
                    ...config.resolutionTargets,
                    [key]: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatMinutes(config.resolutionTargets?.[key] || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={config.alerts?.enabled}
            onChange={(e) => setConfig({
              ...config,
              alerts: { ...config.alerts, enabled: e.target.checked }
            })}
            className="w-4 h-4"
          />
          <h3 className="text-lg font-semibold">SLA Breach Alerts</h3>
        </div>

        {config.alerts?.enabled && (
          <div className="space-y-4 ml-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Alert Channel ID</label>
              <input
                type="text"
                value={config.alerts?.channelId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  alerts: { ...config.alerts, channelId: e.target.value }
                })}
                className="w-full max-w-md bg-discord-dark border border-gray-600 rounded px-3 py-2"
                placeholder="Enter channel ID for alerts"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Warn At (%)</label>
              <input
                type="number"
                value={config.alerts?.warnAtPercent || 80}
                onChange={(e) => setConfig({
                  ...config,
                  alerts: { ...config.alerts, warnAtPercent: parseInt(e.target.value) || 80 }
                })}
                className="w-32 bg-discord-dark border border-gray-600 rounded px-3 py-2"
                min="50"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Send warning when this % of SLA time has elapsed</p>
            </div>
          </div>
        )}
      </div>

      {/* Business Hours */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={config.businessHours?.enabled}
            onChange={(e) => setConfig({
              ...config,
              businessHours: { ...config.businessHours, enabled: e.target.checked }
            })}
            className="w-4 h-4"
          />
          <h3 className="text-lg font-semibold">Business Hours</h3>
        </div>

        {config.businessHours?.enabled && (
          <div className="space-y-4 ml-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Timezone</label>
              <select
                value={config.businessHours?.timezone || 'UTC'}
                onChange={(e) => setConfig({
                  ...config,
                  businessHours: { ...config.businessHours, timezone: e.target.value }
                })}
                className="bg-discord-dark border border-gray-600 rounded px-3 py-2"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Denver">Mountain Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London (UK)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (Japan)</option>
                <option value="Australia/Sydney">Sydney (Australia)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-3">Schedule</label>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const schedule = config.businessHours?.schedule?.find(s => s.day === day);
                  const isEnabled = !!schedule;
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <label className="w-24 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const newSchedule = [...(config.businessHours?.schedule || [])];
                            if (e.target.checked) {
                              newSchedule.push({ day, start: '09:00', end: '17:00' });
                            } else {
                              const idx = newSchedule.findIndex(s => s.day === day);
                              if (idx !== -1) newSchedule.splice(idx, 1);
                            }
                            setConfig({
                              ...config,
                              businessHours: { ...config.businessHours, schedule: newSchedule }
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{days[day]}</span>
                      </label>
                      {isEnabled && (
                        <>
                          <input
                            type="time"
                            value={schedule?.start || '09:00'}
                            onChange={(e) => {
                              const newSchedule = config.businessHours.schedule.map(s =>
                                s.day === day ? { ...s, start: e.target.value } : s
                              );
                              setConfig({
                                ...config,
                                businessHours: { ...config.businessHours, schedule: newSchedule }
                              });
                            }}
                            className="bg-discord-dark border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={schedule?.end || '17:00'}
                            onChange={(e) => {
                              const newSchedule = config.businessHours.schedule.map(s =>
                                s.day === day ? { ...s, end: e.target.value } : s
                              );
                              setConfig({
                                ...config,
                                businessHours: { ...config.businessHours, schedule: newSchedule }
                              });
                            }}
                            className="bg-discord-dark border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={config.businessHours?.pauseSlaOutsideHours !== false}
                onChange={(e) => setConfig({
                  ...config,
                  businessHours: { ...config.businessHours, pauseSlaOutsideHours: e.target.checked }
                })}
                className="w-4 h-4"
              />
              <label className="text-sm">Pause SLA timer outside business hours</label>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="btn-primary px-8"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
