'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Users,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  MessageSquare,
  Shield,
  List,
  GripVertical,
  Copy
} from 'lucide-react';

export default function ApplicationsPanel({ guildId, channels, roles, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('applications'); // applications, submissions
  const [showCreate, setShowCreate] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState('pending');
  const [selectedApplication, setSelectedApplication] = useState('all');

  const [newApplication, setNewApplication] = useState({
    name: '',
    description: '',
    enabled: true,
    questions: [],
    logChannelId: '',
    staffThreads: false,
    completionMessage: 'Your application has been submitted successfully!',
    acceptMessage: 'Congratulations! Your application has been accepted.',
    denyMessage: 'Unfortunately, your application has been denied.',
    requiredRoles: [],
    restrictedRoles: [],
    managerRoles: [],
    pingRoles: [],
    acceptRoles: [],
    denyRoles: [],
    removeRolesOnAccept: [],
    removeRolesOnDeny: [],
    cooldown: 0,
    allowReapply: true,
    dmOnSubmit: true,
    dmOnDecision: true
  });

  const [newQuestion, setNewQuestion] = useState({
    label: '',
    type: 'text',
    placeholder: '',
    required: true,
    options: []
  });

  useEffect(() => {
    fetchApplications();
    fetchSubmissions();
  }, [guildId]);

  useEffect(() => {
    fetchSubmissions();
  }, [submissionFilter, selectedApplication]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      let url = `/api/guilds/${guildId}/applications/submissions?status=${submissionFilter}`;
      if (selectedApplication !== 'all') {
        url += `&applicationId=${selectedApplication}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const createApplication = async () => {
    if (!newApplication.name) {
      onMessage('error', 'Please enter an application name');
      return;
    }

    if (newApplication.questions.length === 0) {
      onMessage('error', 'Please add at least one question');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication)
      });

      if (res.ok) {
        const data = await res.json();
        setApplications([data.application, ...applications]);
        setShowCreate(false);
        resetNewApplication();
        onMessage('success', 'Application created! Members can now use /apply ' + data.application.name);
      } else {
        const error = await res.json();
        onMessage('error', error.error || 'Failed to create application');
      }
    } catch (error) {
      onMessage('error', 'Failed to create application');
    } finally {
      setSaving(false);
    }
  };

  const updateApplication = async () => {
    if (!editingApplication) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications/${editingApplication._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingApplication)
      });

      if (res.ok) {
        const data = await res.json();
        setApplications(applications.map(a =>
          a._id === editingApplication._id ? data.application : a
        ));
        setEditingApplication(null);
        onMessage('success', 'Application updated');
      } else {
        const error = await res.json();
        onMessage('error', error.error || 'Failed to update application');
      }
    } catch (error) {
      onMessage('error', 'Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  const deleteApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to delete this application? All submissions will also be deleted.')) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/applications/${applicationId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setApplications(applications.filter(a => a._id !== applicationId));
        onMessage('success', 'Application deleted');
      } else {
        onMessage('error', 'Failed to delete application');
      }
    } catch (error) {
      onMessage('error', 'Failed to delete application');
    }
  };

  const handleSubmission = async (submissionId, status, note = '') => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/applications/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote: note })
      });

      if (res.ok) {
        fetchSubmissions();
        setViewingSubmission(null);
        onMessage('success', `Application ${status}!`);
      } else {
        onMessage('error', 'Failed to process application');
      }
    } catch (error) {
      onMessage('error', 'Failed to process application');
    }
  };

  const resetNewApplication = () => {
    setNewApplication({
      name: '',
      description: '',
      enabled: true,
      questions: [],
      logChannelId: '',
      staffThreads: false,
      completionMessage: 'Your application has been submitted successfully!',
      acceptMessage: 'Congratulations! Your application has been accepted.',
      denyMessage: 'Unfortunately, your application has been denied.',
      requiredRoles: [],
      restrictedRoles: [],
      managerRoles: [],
      pingRoles: [],
      acceptRoles: [],
      denyRoles: [],
      removeRolesOnAccept: [],
      removeRolesOnDeny: [],
      cooldown: 0,
      allowReapply: true,
      dmOnSubmit: true,
      dmOnDecision: true
    });
  };

  const addQuestion = (target) => {
    if (!newQuestion.label) {
      onMessage('error', 'Please enter a question');
      return;
    }

    const question = {
      id: Date.now().toString(),
      ...newQuestion,
      options: newQuestion.type === 'multiple_choice' ? newQuestion.options : []
    };

    if (target === 'new') {
      setNewApplication({
        ...newApplication,
        questions: [...newApplication.questions, question]
      });
    } else {
      setEditingApplication({
        ...editingApplication,
        questions: [...editingApplication.questions, question]
      });
    }

    setNewQuestion({
      label: '',
      type: 'text',
      placeholder: '',
      required: true,
      options: []
    });
  };

  const removeQuestion = (questionId, target) => {
    if (target === 'new') {
      setNewApplication({
        ...newApplication,
        questions: newApplication.questions.filter(q => q.id !== questionId)
      });
    } else {
      setEditingApplication({
        ...editingApplication,
        questions: editingApplication.questions.filter(q => q.id !== questionId)
      });
    }
  };

  const textChannels = channels?.filter(c => c.type === 0) || [];

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
            <FileText className="w-7 h-7 text-discord-accent" />
            Applications
          </h2>
          <p className="text-gray-400 mt-1">Create and manage application forms for your server</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Application
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'applications'
              ? 'bg-discord-accent/20 text-discord-accent'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Applications ({applications.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'submissions'
              ? 'bg-discord-accent/20 text-discord-accent'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Submissions
            {submissions.filter(s => s.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-discord-accent text-white">
                {submissions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No applications created yet</p>
              <p className="text-gray-500 text-sm mt-1">Create your first application form to get started</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app._id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{app.name}</h3>
                      <span className={`badge ${app.enabled ? 'badge-success' : 'badge-danger'}`}>
                        {app.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    {app.description && (
                      <p className="text-gray-400 text-sm mt-1">{app.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        {app.questions?.length || 0} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash size={14} />
                        {textChannels.find(c => c.id === app.logChannelId)?.name || 'No channel'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {app.cooldown > 0 ? `${app.cooldown}s cooldown` : 'No cooldown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`/apply ${app.name}`);
                        onMessage('success', 'Command copied to clipboard!');
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                      title="Copy command"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => setEditingApplication(app)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => deleteApplication(app._id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-discord-red hover:bg-discord-red/10 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value)}
              className="input w-40"
            >
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="denied">Denied</option>
            </select>
            <select
              value={selectedApplication}
              onChange={(e) => setSelectedApplication(e.target.value)}
              className="input w-48"
            >
              <option value="all">All Applications</option>
              {applications.map(app => (
                <option key={app._id} value={app._id}>{app.name}</option>
              ))}
            </select>
          </div>

          {/* Submissions List */}
          {submissions.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No {submissionFilter} submissions</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div key={sub._id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {sub.userAvatar ? (
                      <img
                        src={`https://cdn.discordapp.com/avatars/${sub.userId}/${sub.userAvatar}.png`}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-discord-accent flex items-center justify-center">
                        {sub.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{sub.username || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">
                        {sub.applicationName} • {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      sub.status === 'pending' ? 'badge-warning' :
                      sub.status === 'accepted' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {sub.status}
                    </span>
                    <button
                      onClick={() => setViewingSubmission(sub)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Application Modal */}
      {(showCreate || editingApplication) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => {
            setShowCreate(false);
            setEditingApplication(null);
          }} />
          <div className="relative bg-discord-dark rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-discord-dark p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingApplication ? 'Edit Application' : 'Create Application'}
              </h3>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingApplication(null);
                }}
                className="p-2 rounded-lg hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Settings size={18} />
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editingApplication?.name || newApplication.name}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, name: e.target.value})
                        : setNewApplication({...newApplication, name: e.target.value})
                      }
                      className="input"
                      placeholder="e.g., Staff Application"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Log Channel</label>
                    <select
                      value={editingApplication?.logChannelId || newApplication.logChannelId}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, logChannelId: e.target.value})
                        : setNewApplication({...newApplication, logChannelId: e.target.value})
                      }
                      className="input"
                    >
                      <option value="">Select channel...</option>
                      {textChannels.map(c => (
                        <option key={c.id} value={c.id}>#{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={editingApplication?.description || newApplication.description}
                    onChange={(e) => editingApplication
                      ? setEditingApplication({...editingApplication, description: e.target.value})
                      : setNewApplication({...newApplication, description: e.target.value})
                    }
                    className="input"
                    rows={2}
                    placeholder="Brief description of this application..."
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingApplication?.enabled ?? newApplication.enabled}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, enabled: e.target.checked})
                        : setNewApplication({...newApplication, enabled: e.target.checked})
                      }
                    />
                    <span>Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingApplication?.staffThreads ?? newApplication.staffThreads}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, staffThreads: e.target.checked})
                        : setNewApplication({...newApplication, staffThreads: e.target.checked})
                      }
                    />
                    <span>Create threads for discussion</span>
                  </label>
                </div>
              </div>

              <div className="divider" />

              {/* Questions */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare size={18} />
                  Questions
                </h4>

                {/* Existing Questions */}
                <div className="space-y-2">
                  {(editingApplication?.questions || newApplication.questions).map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 bg-discord-lighter rounded-lg">
                      <GripVertical size={16} className="text-gray-500" />
                      <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium">{q.label}</p>
                        <p className="text-xs text-gray-500">
                          {q.type === 'text' ? 'Short Answer' : q.type === 'paragraph' ? 'Paragraph' : 'Multiple Choice'}
                          {q.required && ' • Required'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeQuestion(q.id, editingApplication ? 'edit' : 'new')}
                        className="p-1 rounded text-gray-400 hover:text-discord-red"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Question */}
                <div className="p-4 bg-discord-lighter rounded-lg space-y-3">
                  <p className="text-sm text-gray-400">Add Question</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newQuestion.label}
                      onChange={(e) => setNewQuestion({...newQuestion, label: e.target.value})}
                      className="input"
                      placeholder="Question text..."
                    />
                    <select
                      value={newQuestion.type}
                      onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value})}
                      className="input"
                    >
                      <option value="text">Short Answer</option>
                      <option value="paragraph">Paragraph</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>
                  {newQuestion.type === 'multiple_choice' && (
                    <div>
                      <input
                        type="text"
                        className="input"
                        placeholder="Options (comma-separated)"
                        onBlur={(e) => setNewQuestion({
                          ...newQuestion,
                          options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQuestion.required}
                        onChange={(e) => setNewQuestion({...newQuestion, required: e.target.checked})}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                    <button
                      onClick={() => addQuestion(editingApplication ? 'edit' : 'new')}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Question
                    </button>
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* Roles */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield size={18} />
                  Role Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Manager Roles (can accept/deny)</label>
                    <select
                      multiple
                      value={editingApplication?.managerRoles || newApplication.managerRoles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, o => o.value);
                        editingApplication
                          ? setEditingApplication({...editingApplication, managerRoles: values})
                          : setNewApplication({...newApplication, managerRoles: values});
                      }}
                      className="input h-24"
                    >
                      {roles?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Ping Roles (on new submission)</label>
                    <select
                      multiple
                      value={editingApplication?.pingRoles || newApplication.pingRoles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, o => o.value);
                        editingApplication
                          ? setEditingApplication({...editingApplication, pingRoles: values})
                          : setNewApplication({...newApplication, pingRoles: values});
                      }}
                      className="input h-24"
                    >
                      {roles?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Roles to Add on Accept</label>
                    <select
                      multiple
                      value={editingApplication?.acceptRoles || newApplication.acceptRoles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, o => o.value);
                        editingApplication
                          ? setEditingApplication({...editingApplication, acceptRoles: values})
                          : setNewApplication({...newApplication, acceptRoles: values});
                      }}
                      className="input h-24"
                    >
                      {roles?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Roles to Add on Deny</label>
                    <select
                      multiple
                      value={editingApplication?.denyRoles || newApplication.denyRoles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, o => o.value);
                        editingApplication
                          ? setEditingApplication({...editingApplication, denyRoles: values})
                          : setNewApplication({...newApplication, denyRoles: values});
                      }}
                      className="input h-24"
                    >
                      {roles?.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* Messages */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare size={18} />
                  Messages
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Completion Message</label>
                    <textarea
                      value={editingApplication?.completionMessage || newApplication.completionMessage}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, completionMessage: e.target.value})
                        : setNewApplication({...newApplication, completionMessage: e.target.value})
                      }
                      className="input"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Accept Message</label>
                    <textarea
                      value={editingApplication?.acceptMessage || newApplication.acceptMessage}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, acceptMessage: e.target.value})
                        : setNewApplication({...newApplication, acceptMessage: e.target.value})
                      }
                      className="input"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Deny Message</label>
                    <textarea
                      value={editingApplication?.denyMessage || newApplication.denyMessage}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, denyMessage: e.target.value})
                        : setNewApplication({...newApplication, denyMessage: e.target.value})
                      }
                      className="input"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="divider" />

              {/* Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Settings size={18} />
                  Additional Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Cooldown (seconds)</label>
                    <input
                      type="number"
                      value={editingApplication?.cooldown || newApplication.cooldown}
                      onChange={(e) => editingApplication
                        ? setEditingApplication({...editingApplication, cooldown: parseInt(e.target.value) || 0})
                        : setNewApplication({...newApplication, cooldown: parseInt(e.target.value) || 0})
                      }
                      className="input"
                      min={0}
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingApplication?.dmOnSubmit ?? newApplication.dmOnSubmit}
                        onChange={(e) => editingApplication
                          ? setEditingApplication({...editingApplication, dmOnSubmit: e.target.checked})
                          : setNewApplication({...newApplication, dmOnSubmit: e.target.checked})
                        }
                      />
                      <span className="text-sm">DM on Submit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingApplication?.dmOnDecision ?? newApplication.dmOnDecision}
                        onChange={(e) => editingApplication
                          ? setEditingApplication({...editingApplication, dmOnDecision: e.target.checked})
                          : setNewApplication({...newApplication, dmOnDecision: e.target.checked})
                        }
                      />
                      <span className="text-sm">DM on Decision</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-discord-dark p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingApplication(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingApplication ? updateApplication : createApplication}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : (editingApplication ? 'Save Changes' : 'Create Application')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Submission Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewingSubmission(null)} />
          <div className="relative bg-discord-dark rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-discord-dark p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {viewingSubmission.userAvatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${viewingSubmission.userId}/${viewingSubmission.userAvatar}.png`}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-discord-accent flex items-center justify-center text-lg">
                    {viewingSubmission.username?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{viewingSubmission.username}</h3>
                  <p className="text-sm text-gray-400">{viewingSubmission.applicationName}</p>
                </div>
              </div>
              <button onClick={() => setViewingSubmission(null)} className="p-2 rounded-lg hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {viewingSubmission.responses?.map((r, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-sm text-gray-400">{r.questionLabel}</p>
                  <p className="bg-discord-lighter p-3 rounded-lg">{r.answer || 'No answer'}</p>
                </div>
              ))}

              <div className="text-sm text-gray-500">
                Submitted: {new Date(viewingSubmission.createdAt).toLocaleString()}
              </div>

              {viewingSubmission.status !== 'pending' && (
                <div className="p-4 bg-discord-lighter rounded-lg">
                  <p className="text-sm text-gray-400">
                    {viewingSubmission.status === 'accepted' ? 'Accepted' : 'Denied'} by {viewingSubmission.reviewedByUsername}
                  </p>
                  {viewingSubmission.reviewNote && (
                    <p className="mt-2">{viewingSubmission.reviewNote}</p>
                  )}
                </div>
              )}
            </div>

            {viewingSubmission.status === 'pending' && (
              <div className="sticky bottom-0 bg-discord-dark p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => handleSubmission(viewingSubmission._id, 'denied')}
                  className="btn-danger flex items-center gap-2"
                >
                  <XCircle size={18} />
                  Deny
                </button>
                <button
                  onClick={() => handleSubmission(viewingSubmission._id, 'accepted')}
                  className="btn-success flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Accept
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
