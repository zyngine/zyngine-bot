'use client';

import { useState, useEffect } from 'react';

export default function AuditLogs({ guildId }) {
  const [logs, setLogs] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    actionType: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [guildId, pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const res = await fetch(`/api/guilds/${guildId}/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setActionTypes(data.actionTypes || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    const icons = {
      ticket_create: '🎫',
      ticket_close: '📪',
      ticket_claim: '✋',
      ticket_unclaim: '👋',
      ticket_add_user: '➕',
      ticket_remove_user: '➖',
      ticket_priority: '🔥',
      ticket_rename: '✏️',
      ticket_escalate: '⬆️',
      ticket_tag_add: '🏷️',
      ticket_tag_remove: '🏷️',
      ticket_note_add: '📝',
      role_request: '📨',
      role_approve: '✅',
      role_deny: '❌',
      autorole_assign: '🤖',
      settings_update: '⚙️',
      panel_create: '🎛️',
      panel_update: '🎛️',
      panel_delete: '🗑️'
    };
    return icons[actionType] || '📋';
  };

  const getActionColor = (actionType) => {
    if (actionType.includes('create') || actionType.includes('approve') || actionType.includes('add')) {
      return 'text-green-400';
    }
    if (actionType.includes('delete') || actionType.includes('deny') || actionType.includes('remove') || actionType.includes('close')) {
      return 'text-red-400';
    }
    if (actionType.includes('update') || actionType.includes('claim') || actionType.includes('priority')) {
      return 'text-yellow-400';
    }
    return 'text-gray-400';
  };

  const formatActionType = (actionType) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <p className="text-sm text-gray-400">View all actions performed in your server</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => {
                setFilters({ ...filters, actionType: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="">All Actions</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{formatActionType(type)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => {
                setFilters({ ...filters, userId: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              placeholder="Filter by user"
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2 text-sm w-40"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>

          {(filters.actionType || filters.userId || filters.startDate || filters.endDate) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
        </div>
      ) : logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log._id} className="card hover:border-gray-600 transition">
              <div className="flex items-start gap-4">
                <span className="text-2xl">{getActionIcon(log.actionType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${getActionColor(log.actionType)}`}>
                      {formatActionType(log.actionType)}
                    </span>
                    {log.user && (
                      <span className="text-gray-400">
                        by <span className="text-white">{log.user.odUsername || log.user.odId}</span>
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <div className="text-sm text-gray-400 mt-1">
                      {log.details.ticketNumber && (
                        <span>Ticket #{log.details.ticketNumber} </span>
                      )}
                      {log.details.targetUser && (
                        <span>User: {log.details.targetUser} </span>
                      )}
                      {log.details.roleName && (
                        <span>Role: {log.details.roleName} </span>
                      )}
                      {log.details.reason && (
                        <span className="italic">"{log.details.reason}"</span>
                      )}
                      {log.details.oldValue && log.details.newValue && (
                        <span>
                          {log.details.oldValue} → {log.details.newValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-discord-dark rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-400">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-discord-dark rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">No audit logs found.</p>
          {(filters.actionType || filters.userId || filters.startDate || filters.endDate) && (
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
