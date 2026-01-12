'use client';

import { useState, useEffect } from 'react';

export default function AnalyticsDashboard({ guildId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [guildId, range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/analytics?range=${range}`);
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-gray-400">Failed to load analytics</div>;
  }

  const { summary, byCategory, byPriority, byStatus, ticketsByDay, topStaff, byHour, peakHour } = analytics;

  // Convert ticketsByDay to sorted array for chart
  const chartData = Object.entries(ticketsByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14); // Last 14 days

  const maxTickets = Math.max(...chartData.map(d => d[1]), 1);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-sm ${
                range === r
                  ? 'bg-discord-accent text-white'
                  : 'bg-discord-dark text-gray-400 hover:text-white'
              }`}
            >
              {r === 'all' ? 'All Time' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-gray-400 text-sm">Total Tickets</p>
          <p className="text-3xl font-bold">{summary.totalTickets}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Open Tickets</p>
          <p className="text-3xl font-bold text-discord-green">{summary.openTickets}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Avg Response Time</p>
          <p className="text-3xl font-bold">{formatTime(summary.avgResponseTime)}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Avg Resolution Time</p>
          <p className="text-3xl font-bold">{formatTime(summary.avgResolutionTime)}</p>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-gray-400 text-sm">Closed Tickets</p>
          <p className="text-3xl font-bold">{summary.closedTickets}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">On Hold</p>
          <p className="text-3xl font-bold text-yellow-400">{summary.onHoldTickets}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Avg Feedback Rating</p>
          <p className="text-3xl font-bold">
            {summary.avgFeedback > 0 ? (
              <>
                {summary.avgFeedback} <span className="text-yellow-400 text-xl">★</span>
              </>
            ) : (
              'N/A'
            )}
          </p>
          <p className="text-xs text-gray-500">{summary.feedbackCount} ratings</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-sm">Peak Hour</p>
          <p className="text-3xl font-bold">
            {peakHour !== undefined ? `${peakHour}:00` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets Over Time Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Tickets Over Time</h3>
          {chartData.length > 0 ? (
            <div className="h-48">
              <div className="flex items-end justify-between h-40 gap-1">
                {chartData.map(([date, count]) => (
                  <div key={date} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-discord-accent rounded-t hover:bg-discord-accent/80 transition-all"
                      style={{ height: `${(count / maxTickets) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                      title={`${date}: ${count} tickets`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{chartData[0]?.[0]?.slice(5)}</span>
                <span>{chartData[chartData.length - 1]?.[0]?.slice(5)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No data for this period</p>
          )}
        </div>

        {/* Hourly Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Hourly Distribution</h3>
          <div className="h-48">
            <div className="flex items-end justify-between h-40 gap-0.5">
              {byHour.map((count, hour) => {
                const maxHour = Math.max(...byHour, 1);
                return (
                  <div key={hour} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        hour === peakHour ? 'bg-discord-green' : 'bg-discord-accent/60'
                      }`}
                      style={{ height: `${(count / maxHour) * 100}%`, minHeight: count > 0 ? '2px' : '0' }}
                      title={`${hour}:00 - ${count} tickets`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>0:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category and Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Category */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">By Category</h3>
          {Object.keys(byCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => {
                  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
                  const percent = Math.round((count / total) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat}</span>
                        <span className="text-gray-400">{count} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-discord-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-discord-accent"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No categories</p>
          )}
        </div>

        {/* By Priority */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">By Priority</h3>
          <div className="space-y-3">
            {[
              { key: 'urgent', label: 'Urgent', color: 'bg-red-500' },
              { key: 'high', label: 'High', color: 'bg-orange-500' },
              { key: 'medium', label: 'Medium', color: 'bg-yellow-500' },
              { key: 'low', label: 'Low', color: 'bg-gray-500' }
            ].map(({ key, label, color }) => {
              const count = byPriority[key] || 0;
              const total = Object.values(byPriority).reduce((a, b) => a + b, 0) || 1;
              const percent = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="text-gray-400">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-discord-dark rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Status */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">By Status</h3>
          <div className="space-y-3">
            {[
              { key: 'open', label: 'Open', color: 'bg-green-500' },
              { key: 'closed', label: 'Closed', color: 'bg-gray-500' },
              { key: 'on_hold', label: 'On Hold', color: 'bg-yellow-500' }
            ].map(({ key, label, color }) => {
              const count = byStatus[key] || 0;
              const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
              const percent = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="text-gray-400">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-discord-dark rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Staff */}
      {topStaff && topStaff.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Staff Member</th>
                  <th className="pb-3 pr-4 text-center">Claimed</th>
                  <th className="pb-3 pr-4 text-center">Closed</th>
                  <th className="pb-3 pr-4 text-center">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {topStaff.slice(0, 5).map((staff, index) => (
                  <tr key={staff.odId} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="py-3 pr-4 font-medium">{staff.odUsername}</td>
                    <td className="py-3 pr-4 text-center">{staff.claimed}</td>
                    <td className="py-3 pr-4 text-center">{staff.closed}</td>
                    <td className="py-3 pr-4 text-center">
                      {staff.avgFeedback > 0 ? (
                        <span className="text-yellow-400">{staff.avgFeedback} ★</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
