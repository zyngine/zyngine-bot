'use client';

import { useState, useEffect } from 'react';

export default function StaffLeaderboard({ guildId }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');
  const [sortBy, setSortBy] = useState('closed');

  useEffect(() => {
    fetchStaffPerformance();
  }, [guildId, range, sortBy]);

  const fetchStaffPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/staff-performance?range=${range}&sortBy=${sortBy}`);
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  const sortOptions = [
    { value: 'closed', label: 'Tickets Closed' },
    { value: 'claimed', label: 'Tickets Claimed' },
    { value: 'rating', label: 'Rating' },
    { value: 'response', label: 'Response Time' },
    { value: 'resolution', label: 'Resolution Time' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-semibold">Staff Leaderboard</h2>
        <div className="flex gap-4">
          {/* Time Range */}
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
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-discord-dark border border-gray-600 rounded px-3 py-1 text-sm"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {staff.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Second Place */}
            <div className={`card text-center ${staff.length >= 2 ? '' : 'opacity-30'}`}>
              <div className="text-4xl mb-2">🥈</div>
              <p className="font-semibold truncate">{staff[1]?.odUsername || '-'}</p>
              <p className="text-2xl font-bold text-gray-300">{staff[1]?.ticketsClosed || 0}</p>
              <p className="text-xs text-gray-400">tickets closed</p>
            </div>

            {/* First Place */}
            <div className={`card text-center border-2 border-yellow-500/50 ${staff.length >= 1 ? '' : 'opacity-30'}`}>
              <div className="text-5xl mb-2">🥇</div>
              <p className="font-semibold text-lg truncate">{staff[0]?.odUsername || '-'}</p>
              <p className="text-3xl font-bold text-yellow-400">{staff[0]?.ticketsClosed || 0}</p>
              <p className="text-xs text-gray-400">tickets closed</p>
              {staff[0]?.avgRating > 0 && (
                <p className="text-sm text-yellow-400 mt-1">{staff[0].avgRating} ★</p>
              )}
            </div>

            {/* Third Place */}
            <div className={`card text-center ${staff.length >= 3 ? '' : 'opacity-30'}`}>
              <div className="text-4xl mb-2">🥉</div>
              <p className="font-semibold truncate">{staff[2]?.odUsername || '-'}</p>
              <p className="text-2xl font-bold text-orange-400">{staff[2]?.ticketsClosed || 0}</p>
              <p className="text-xs text-gray-400">tickets closed</p>
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3 px-2">Rank</th>
                    <th className="pb-3 px-2">Staff Member</th>
                    <th className="pb-3 px-2 text-center">Claimed</th>
                    <th className="pb-3 px-2 text-center">Closed</th>
                    <th className="pb-3 px-2 text-center">Close Rate</th>
                    <th className="pb-3 px-2 text-center">Avg Response</th>
                    <th className="pb-3 px-2 text-center">Avg Resolution</th>
                    <th className="pb-3 px-2 text-center">Rating</th>
                    <th className="pb-3 px-2 text-center">SLA Breaches</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.odId} className="border-b border-gray-700/50 hover:bg-discord-dark/50">
                      <td className="py-3 px-2 font-bold text-lg">{getRankBadge(member.rank)}</td>
                      <td className="py-3 px-2">
                        <span className="font-medium">{member.odUsername}</span>
                      </td>
                      <td className="py-3 px-2 text-center">{member.ticketsClaimed}</td>
                      <td className="py-3 px-2 text-center font-semibold">{member.ticketsClosed}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`${
                          member.closeRate >= 80 ? 'text-green-400' :
                          member.closeRate >= 50 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {member.closeRate}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400">
                        {formatTime(member.avgResponseTime)}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400">
                        {formatTime(member.avgResolutionTime)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {member.avgRating > 0 ? (
                          <span className="text-yellow-400">{member.avgRating} ★</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {member.slaBreaches > 0 ? (
                          <span className="text-red-400">{member.slaBreaches}</span>
                        ) : (
                          <span className="text-green-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">No staff performance data available.</p>
          <p className="text-sm text-gray-500 mt-1">Staff members who claim tickets will appear here.</p>
        </div>
      )}
    </div>
  );
}
