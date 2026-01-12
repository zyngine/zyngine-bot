'use client';

import { useState, useEffect } from 'react';

export default function TicketSearch({ guildId, onMessage }) {
  const [tickets, setTickets] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkData, setBulkData] = useState({});
  const [processing, setProcessing] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    priority: '',
    category: '',
    search: '',
    claimedBy: '',
    tag: ''
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  useEffect(() => {
    fetchTickets();
    fetchTags();
  }, [guildId]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`);
      if (res.ok) {
        setTickets(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tags`);
      if (res.ok) {
        setTags(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  // Apply filters
  const filteredTickets = tickets.filter(ticket => {
    if (filters.status !== 'all' && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.category && ticket.category !== filters.category) return false;
    if (filters.claimedBy && ticket.claimedBy !== filters.claimedBy) return false;
    if (filters.tag && !ticket.tags?.includes(filters.tag)) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        ticket.ticketNumber?.toString().includes(search) ||
        ticket.username?.toLowerCase().includes(search) ||
        ticket.subject?.toLowerCase().includes(search) ||
        ticket.creatorId?.includes(search)
      );
    }
    return true;
  });

  // Paginate
  const startIndex = (pagination.page - 1) * pagination.limit;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + pagination.limit);
  const totalPages = Math.ceil(filteredTickets.length / pagination.limit);

  // Get unique values for filters
  const categories = [...new Set(tickets.map(t => t.category).filter(Boolean))];
  const staffMembers = [...new Set(tickets.filter(t => t.claimedBy).map(t => ({
    id: t.claimedBy,
    name: t.claimedByUsername || t.claimedBy
  })))];

  // Select handlers
  const toggleSelectAll = () => {
    if (selectedTickets.length === paginatedTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(paginatedTickets.map(t => t._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedTickets.includes(id)) {
      setSelectedTickets(selectedTickets.filter(t => t !== id));
    } else {
      setSelectedTickets([...selectedTickets, id]);
    }
  };

  // Bulk action handler
  const handleBulkAction = async () => {
    if (!bulkAction || selectedTickets.length === 0) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          action: bulkAction,
          data: bulkData
        })
      });

      if (res.ok) {
        const result = await res.json();
        onMessage?.('success', `Bulk action completed: ${result.affected} tickets affected`);
        setSelectedTickets([]);
        setShowBulkModal(false);
        setBulkAction('');
        setBulkData({});
        fetchTickets(); // Refresh
      } else {
        const error = await res.json();
        onMessage?.('error', error.error || 'Bulk action failed');
      }
    } catch (error) {
      onMessage?.('error', 'Failed to perform bulk action');
    } finally {
      setProcessing(false);
    }
  };

  // Export handler
  const handleExport = async (format = 'csv') => {
    const params = new URLSearchParams({
      format,
      status: filters.status,
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    });

    window.open(`/api/guilds/${guildId}/tickets/export?${params}`, '_blank');
    onMessage?.('success', 'Export started');
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400';
      case 'closed': return 'bg-gray-500/20 text-gray-400';
      case 'on_hold': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-discord-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ticket Search</h2>
          <p className="text-sm text-gray-400">{filteredTickets.length} tickets found</p>
        </div>
        <div className="flex gap-2">
          {selectedTickets.length > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-discord-accent hover:bg-discord-accent/80 px-4 py-2 rounded-lg transition"
            >
              Bulk Actions ({selectedTickets.length})
            </button>
          )}
          <button
            onClick={() => handleExport('csv')}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              placeholder="Search by ticket #, user, or subject..."
              className="w-full bg-discord-dark border border-gray-600 rounded px-4 py-2"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
            className="bg-discord-dark border border-gray-600 rounded px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="on_hold">On Hold</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => {
              setFilters({ ...filters, priority: e.target.value });
              setPagination({ ...pagination, page: 1 });
            }}
            className="bg-discord-dark border border-gray-600 rounded px-3 py-2"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {categories.length > 0 && (
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters({ ...filters, category: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {tags.length > 0 && (
            <select
              value={filters.tag}
              onChange={(e) => {
                setFilters({ ...filters, tag: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="bg-discord-dark border border-gray-600 rounded px-3 py-2"
            >
              <option value="">All Tags</option>
              {tags.map(tag => (
                <option key={tag._id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      {paginatedTickets.length > 0 ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 pr-2">
                  <input
                    type="checkbox"
                    checked={selectedTickets.length === paginatedTickets.length && paginatedTickets.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Priority</th>
                <th className="pb-3 pr-4">Creator</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Assigned To</th>
                <th className="pb-3 pr-4">Tags</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.map(ticket => (
                <tr key={ticket._id} className="border-b border-gray-700/50 hover:bg-discord-dark/50">
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      checked={selectedTickets.includes(ticket._id)}
                      onChange={() => toggleSelect(ticket._id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="py-3 pr-4 font-medium">#{ticket.ticketNumber}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityClass(ticket.priority)}`}>
                      {ticket.priority || 'medium'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm">{ticket.username || ticket.creatorId}</td>
                  <td className="py-3 pr-4 text-sm text-gray-400">{ticket.category || '-'}</td>
                  <td className="py-3 pr-4 text-sm">
                    {ticket.claimedByUsername || (ticket.claimedBy ? ticket.claimedBy : '-')}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags?.slice(0, 2).map(tag => {
                        const tagObj = tags.find(t => t.name === tag);
                        return (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: (tagObj?.color || '#6366f1') + '33',
                              color: tagObj?.color || '#6366f1'
                            }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                      {ticket.tags?.length > 2 && (
                        <span className="text-xs text-gray-500">+{ticket.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-400">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(startIndex + pagination.limit, filteredTickets.length)} of {filteredTickets.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 bg-discord-dark rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= totalPages}
                  className="px-3 py-1 bg-discord-dark rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-400">No tickets found matching your criteria.</p>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              Bulk Action ({selectedTickets.length} tickets)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Action</label>
                <select
                  value={bulkAction}
                  onChange={(e) => {
                    setBulkAction(e.target.value);
                    setBulkData({});
                  }}
                  className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                >
                  <option value="">Select action...</option>
                  <option value="close">Close Tickets</option>
                  <option value="reopen">Reopen Tickets</option>
                  <option value="set_priority">Set Priority</option>
                  <option value="assign">Assign to Staff</option>
                  <option value="add_tag">Add Tag</option>
                  <option value="remove_tag">Remove Tag</option>
                </select>
              </div>

              {bulkAction === 'set_priority' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Priority</label>
                  <select
                    value={bulkData.priority || ''}
                    onChange={(e) => setBulkData({ ...bulkData, priority: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Select priority...</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}

              {bulkAction === 'assign' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Staff ID (leave empty to unassign)</label>
                  <input
                    type="text"
                    value={bulkData.staffId || ''}
                    onChange={(e) => setBulkData({ ...bulkData, staffId: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter staff member ID"
                  />
                </div>
              )}

              {(bulkAction === 'add_tag' || bulkAction === 'remove_tag') && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tag</label>
                  <select
                    value={bulkData.tag || ''}
                    onChange={(e) => setBulkData({ ...bulkData, tag: e.target.value })}
                    className="w-full bg-discord-dark border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="">Select tag...</option>
                    {tags.map(tag => (
                      <option key={tag._id} value={tag.name}>{tag.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkAction('');
                  setBulkData({});
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || processing}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
