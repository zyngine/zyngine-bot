'use client';

import { useState, useEffect } from 'react';

// Helper to generate unique IDs
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Button style options
const BUTTON_STYLES = [
  { value: 'Primary', label: 'Blue', color: 'bg-[#5865F2]' },
  { value: 'Secondary', label: 'Gray', color: 'bg-[#4f545c]' },
  { value: 'Success', label: 'Green', color: 'bg-[#3ba55c]' },
  { value: 'Danger', label: 'Red', color: 'bg-[#ed4245]' }
];

// Default panel structure
const DEFAULT_PANEL = {
  name: '',
  description: '',
  channelId: '',
  embed: {
    title: 'Support Tickets',
    description: 'Click the button below to create a support ticket.',
    color: '#5865F2',
    thumbnail: '',
    image: '',
    footer: ''
  },
  button: {
    label: 'Create Ticket',
    emoji: '🎫',
    style: 'Primary'
  },
  categories: [],
  style: {
    type: 'channel',
    threadParentId: '',
    dropdownPlaceholder: 'Select a category...'
  },
  forms: [],
  automations: [],
  claiming: {
    enabled: true,
    autoClaimEnabled: false,
    staffOnlyClaimEnabled: true,
    unclaimEnabled: true,
    claimMessage: 'This ticket has been claimed by {user}.'
  },
  limits: {
    maxTicketsPerUser: 1,
    maxTotalTickets: 0,
    cooldownSeconds: 0,
    requireRoles: [],
    blacklistRoles: []
  },
  permissions: {
    supportRoles: [],
    adminRoles: [],
    canCloseRoles: [],
    canDeleteRoles: [],
    canViewAllTickets: []
  },
  settings: {
    categoryId: '',
    namingScheme: 'ticket-{number}',
    autoCloseHours: 0,
    autoCloseWarningHours: 0,
    deleteOnClose: false,
    deleteAfterHours: 0,
    closeConfirmation: true,
    feedbackEnabled: false,
    feedbackMessage: 'How would you rate your support experience?'
  },
  transcripts: {
    enabled: true,
    channelId: '',
    dmToUser: true,
    format: 'html',
    includeAttachments: true
  },
  logging: {
    enabled: true,
    channelId: '',
    logCreation: true,
    logClose: true,
    logClaim: true,
    logEscalation: true,
    logAddRemoveUser: true
  },
  escalation: {
    enabled: false,
    targetPanels: [],
    requireReason: true
  }
};

export default function TicketPanelBuilder({
  panel: initialPanel,
  onSave,
  onCancel,
  channels,
  roles,
  categories: discordCategories,
  allPanels = [],
  saving = false
}) {
  const [panel, setPanel] = useState({ ...DEFAULT_PANEL, ...initialPanel });
  const [activeSection, setActiveSection] = useState('general');
  const [errors, setErrors] = useState({});

  // Update panel when initialPanel changes
  useEffect(() => {
    if (initialPanel) {
      setPanel({ ...DEFAULT_PANEL, ...initialPanel });
    }
  }, [initialPanel]);

  // Deep update helper
  const updatePanel = (path, value) => {
    setPanel(prev => {
      const newPanel = { ...prev };
      const parts = path.split('.');
      let current = newPanel;

      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
          current[parts[i]] = {};
        }
        current[parts[i]] = { ...current[parts[i]] };
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
      return newPanel;
    });
  };

  // Category management
  const addCategory = () => {
    const newCategory = {
      id: generateId(),
      name: `Category ${(panel.categories?.length || 0) + 1}`,
      description: '',
      emoji: '📝',
      buttonLabel: '',
      buttonStyle: 'Primary',
      staffRoles: [],
      pingRoles: [],
      welcomeMessage: 'Thank you for creating a ticket! A staff member will be with you shortly.',
      forms: []
    };
    setPanel(prev => ({
      ...prev,
      categories: [...(prev.categories || []), newCategory]
    }));
  };

  const updateCategory = (index, field, value) => {
    setPanel(prev => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === index ? { ...cat, [field]: value } : cat
      )
    }));
  };

  const removeCategory = (index) => {
    setPanel(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  // Form field management
  const addFormField = (categoryIndex = null) => {
    const newField = {
      id: generateId(),
      label: 'New Question',
      placeholder: 'Enter your answer...',
      style: 'short',
      required: false,
      minLength: null,
      maxLength: null
    };

    if (categoryIndex !== null) {
      setPanel(prev => ({
        ...prev,
        categories: prev.categories.map((cat, i) =>
          i === categoryIndex
            ? { ...cat, forms: [...(cat.forms || []), newField] }
            : cat
        )
      }));
    } else {
      setPanel(prev => ({
        ...prev,
        forms: [...(prev.forms || []), newField]
      }));
    }
  };

  const updateFormField = (fieldIndex, field, value, categoryIndex = null) => {
    if (categoryIndex !== null) {
      setPanel(prev => ({
        ...prev,
        categories: prev.categories.map((cat, i) =>
          i === categoryIndex
            ? {
                ...cat,
                forms: cat.forms.map((f, fi) =>
                  fi === fieldIndex ? { ...f, [field]: value } : f
                )
              }
            : cat
        )
      }));
    } else {
      setPanel(prev => ({
        ...prev,
        forms: prev.forms.map((f, i) =>
          i === fieldIndex ? { ...f, [field]: value } : f
        )
      }));
    }
  };

  const removeFormField = (fieldIndex, categoryIndex = null) => {
    if (categoryIndex !== null) {
      setPanel(prev => ({
        ...prev,
        categories: prev.categories.map((cat, i) =>
          i === categoryIndex
            ? { ...cat, forms: cat.forms.filter((_, fi) => fi !== fieldIndex) }
            : cat
        )
      }));
    } else {
      setPanel(prev => ({
        ...prev,
        forms: prev.forms.filter((_, i) => i !== fieldIndex)
      }));
    }
  };

  // Automation management
  const addAutomation = () => {
    const newAutomation = {
      id: generateId(),
      name: 'New Automation',
      enabled: true,
      trigger: { type: 'ticket_created', value: null },
      actions: [{ type: 'send_message', value: '' }]
    };
    setPanel(prev => ({
      ...prev,
      automations: [...(prev.automations || []), newAutomation]
    }));
  };

  const updateAutomation = (index, updates) => {
    setPanel(prev => ({
      ...prev,
      automations: prev.automations.map((auto, i) =>
        i === index ? { ...auto, ...updates } : auto
      )
    }));
  };

  const removeAutomation = (index) => {
    setPanel(prev => ({
      ...prev,
      automations: prev.automations.filter((_, i) => i !== index)
    }));
  };

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!panel.name?.trim()) newErrors.name = 'Panel name is required';
    if (!panel.channelId) newErrors.channelId = 'Please select a channel';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validate()) {
      onSave(panel);
    }
  };

  // Section navigation
  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'embed', label: 'Embed', icon: '🎨' },
    { id: 'categories', label: 'Categories', icon: '📁' },
    { id: 'forms', label: 'Forms', icon: '📝' },
    { id: 'style', label: 'Style', icon: '🎯' },
    { id: 'claiming', label: 'Claiming', icon: '🙋' },
    { id: 'limits', label: 'Limits', icon: '🚫' },
    { id: 'permissions', label: 'Permissions', icon: '🔐' },
    { id: 'automations', label: 'Automations', icon: '⚡' },
    { id: 'transcripts', label: 'Transcripts', icon: '📄' },
    { id: 'logging', label: 'Logging', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '🔧' }
  ];

  // Multi-select component for roles
  const RoleMultiSelect = ({ value = [], onChange, label }) => (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="bg-discord-dark border border-gray-600 rounded-lg p-2 max-h-32 overflow-y-auto">
        {roles?.length > 0 ? (
          roles.filter(r => r.name !== '@everyone').map(role => (
            <label key={role.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-700 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(role.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...value, role.id]);
                  } else {
                    onChange(value.filter(id => id !== role.id));
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm" style={{ color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'inherit' }}>
                {role.name}
              </span>
            </label>
          ))
        ) : (
          <p className="text-gray-500 text-sm p-2">No roles available</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-discord-darker rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">
            {initialPanel?._id ? 'Edit Ticket Panel' : 'Create Ticket Panel'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-discord-dark border-r border-gray-700 overflow-y-auto">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-2 transition ${
                  activeSection === section.id
                    ? 'bg-discord-accent text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{section.icon}</span>
                <span className="text-sm">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">General Settings</h3>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Panel Name *</label>
                  <input
                    type="text"
                    value={panel.name}
                    onChange={(e) => updatePanel('name', e.target.value)}
                    className={`w-full bg-discord-dark border rounded-lg px-4 py-2 ${errors.name ? 'border-red-500' : 'border-gray-600'}`}
                    placeholder="Support Tickets"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={panel.description}
                    onChange={(e) => updatePanel('description', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    rows={2}
                    placeholder="A brief description of this panel"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Panel Channel *</label>
                  <select
                    value={panel.channelId}
                    onChange={(e) => updatePanel('channelId', e.target.value)}
                    className={`w-full bg-discord-dark border rounded-lg px-4 py-2 ${errors.channelId ? 'border-red-500' : 'border-gray-600'}`}
                  >
                    <option value="">Select a channel...</option>
                    {channels?.filter(c => c.type === 0).map(channel => (
                      <option key={channel.id} value={channel.id}>#{channel.name}</option>
                    ))}
                  </select>
                  {errors.channelId && <p className="text-red-500 text-xs mt-1">{errors.channelId}</p>}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ticket Category (Discord)</label>
                  <select
                    value={panel.settings?.categoryId || ''}
                    onChange={(e) => updatePanel('settings.categoryId', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="">No category (root)</option>
                    {channels?.filter(c => c.type === 4).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Where ticket channels will be created</p>
                </div>
              </div>
            )}

            {/* Embed Section */}
            {activeSection === 'embed' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Panel Embed</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Embed Title</label>
                      <input
                        type="text"
                        value={panel.embed?.title || ''}
                        onChange={(e) => updatePanel('embed.title', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="Support Tickets"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Embed Description</label>
                      <textarea
                        value={panel.embed?.description || ''}
                        onChange={(e) => updatePanel('embed.description', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        rows={3}
                        placeholder="Click the button below to create a support ticket."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Embed Color</label>
                      <input
                        type="color"
                        value={panel.embed?.color || '#5865F2'}
                        onChange={(e) => updatePanel('embed.color', e.target.value)}
                        className="w-full h-10 bg-discord-dark border border-gray-600 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Footer Text</label>
                      <input
                        type="text"
                        value={panel.embed?.footer || ''}
                        onChange={(e) => updatePanel('embed.footer', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="Powered by Zyngine"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Thumbnail URL</label>
                      <input
                        type="text"
                        value={panel.embed?.thumbnail || ''}
                        onChange={(e) => updatePanel('embed.thumbnail', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Preview</label>
                    <div className="bg-[#2f3136] rounded-lg overflow-hidden">
                      <div
                        className="w-1 h-full float-left"
                        style={{ backgroundColor: panel.embed?.color || '#5865F2' }}
                      />
                      <div className="p-4 pl-5">
                        {panel.embed?.title && (
                          <h4 className="font-semibold text-white mb-2">{panel.embed.title}</h4>
                        )}
                        {panel.embed?.description && (
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{panel.embed.description}</p>
                        )}
                        {panel.embed?.footer && (
                          <p className="text-xs text-gray-500 mt-3">{panel.embed.footer}</p>
                        )}
                      </div>
                    </div>

                    {/* Button preview */}
                    <div className="mt-3">
                      <button
                        className={`px-4 py-2 rounded text-sm font-medium ${
                          BUTTON_STYLES.find(s => s.value === panel.button?.style)?.color || 'bg-[#5865F2]'
                        }`}
                      >
                        {panel.button?.emoji} {panel.button?.label || 'Create Ticket'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-medium mb-3">Button Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Button Label</label>
                      <input
                        type="text"
                        value={panel.button?.label || ''}
                        onChange={(e) => updatePanel('button.label', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="Create Ticket"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Button Emoji</label>
                      <input
                        type="text"
                        value={panel.button?.emoji || ''}
                        onChange={(e) => updatePanel('button.emoji', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="🎫"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Button Style</label>
                      <select
                        value={panel.button?.style || 'Primary'}
                        onChange={(e) => updatePanel('button.style', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      >
                        {BUTTON_STYLES.map(style => (
                          <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories Section */}
            {activeSection === 'categories' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ticket Categories</h3>
                  <button onClick={addCategory} className="btn-primary text-sm">
                    + Add Category
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  Categories allow users to select the type of support they need. If you have multiple categories,
                  users will be shown a selection menu.
                </p>

                {panel.categories?.length > 0 ? (
                  <div className="space-y-4">
                    {panel.categories.map((cat, index) => (
                      <div key={cat.id} className="bg-discord-dark border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">{cat.emoji} {cat.name}</h4>
                          <button
                            onClick={() => removeCategory(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Category Name</label>
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => updateCategory(index, 'name', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Emoji</label>
                            <input
                              type="text"
                              value={cat.emoji || ''}
                              onChange={(e) => updateCategory(index, 'emoji', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm text-gray-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={cat.description || ''}
                            onChange={(e) => updateCategory(index, 'description', e.target.value)}
                            className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            placeholder="Brief description shown to users"
                          />
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm text-gray-400 mb-1">Welcome Message</label>
                          <textarea
                            value={cat.welcomeMessage || ''}
                            onChange={(e) => updateCategory(index, 'welcomeMessage', e.target.value)}
                            className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            rows={2}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <RoleMultiSelect
                            value={cat.staffRoles || []}
                            onChange={(val) => updateCategory(index, 'staffRoles', val)}
                            label="Staff Roles (can view tickets)"
                          />
                          <RoleMultiSelect
                            value={cat.pingRoles || []}
                            onChange={(val) => updateCategory(index, 'pingRoles', val)}
                            label="Ping Roles (on ticket creation)"
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Button Label</label>
                            <input
                              type="text"
                              value={cat.buttonLabel || ''}
                              onChange={(e) => updateCategory(index, 'buttonLabel', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                              placeholder={cat.name}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Button Style</label>
                            <select
                              value={cat.buttonStyle || 'Primary'}
                              onChange={(e) => updateCategory(index, 'buttonStyle', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            >
                              {BUTTON_STYLES.map(style => (
                                <option key={style.value} value={style.value}>{style.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Category-specific forms */}
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-gray-400">Category Forms</label>
                            <button
                              onClick={() => addFormField(index)}
                              className="text-discord-accent text-sm hover:underline"
                            >
                              + Add Question
                            </button>
                          </div>
                          {cat.forms?.length > 0 ? (
                            <div className="space-y-2">
                              {cat.forms.map((form, fi) => (
                                <div key={form.id} className="bg-discord-darker p-3 rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                    <input
                                      type="text"
                                      value={form.label}
                                      onChange={(e) => updateFormField(fi, 'label', e.target.value, index)}
                                      className="bg-transparent border-none text-sm font-medium focus:outline-none"
                                      placeholder="Question"
                                    />
                                    <button
                                      onClick={() => removeFormField(fi, index)}
                                      className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <select
                                      value={form.style}
                                      onChange={(e) => updateFormField(fi, 'style', e.target.value, index)}
                                      className="bg-discord-dark border border-gray-600 rounded px-2 py-1 text-xs"
                                    >
                                      <option value="short">Short</option>
                                      <option value="paragraph">Paragraph</option>
                                    </select>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={form.required}
                                        onChange={(e) => updateFormField(fi, 'required', e.target.checked, index)}
                                      />
                                      Required
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-xs">No forms for this category</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No categories configured.</p>
                    <p className="text-sm mt-1">A default "General" category will be used.</p>
                  </div>
                )}
              </div>
            )}

            {/* Forms Section */}
            {activeSection === 'forms' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Pre-Ticket Forms</h3>
                  <button onClick={() => addFormField(null)} className="btn-primary text-sm">
                    + Add Question
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  These questions will be shown to users before creating a ticket.
                  Category-specific forms override these global forms.
                </p>

                {panel.forms?.length > 0 ? (
                  <div className="space-y-3">
                    {panel.forms.map((form, index) => (
                      <div key={form.id} className="bg-discord-dark border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 mr-4">
                            <label className="block text-sm text-gray-400 mb-1">Question Label</label>
                            <input
                              type="text"
                              value={form.label}
                              onChange={(e) => updateFormField(index, 'label', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2"
                              placeholder="What is your issue?"
                            />
                          </div>
                          <button
                            onClick={() => removeFormField(index)}
                            className="text-red-400 hover:text-red-300 text-sm mt-6"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Placeholder</label>
                            <input
                              type="text"
                              value={form.placeholder || ''}
                              onChange={(e) => updateFormField(index, 'placeholder', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                              placeholder="Enter your answer..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Input Style</label>
                            <select
                              value={form.style}
                              onChange={(e) => updateFormField(index, 'style', e.target.value)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="short">Short (single line)</option>
                              <option value="paragraph">Paragraph (multi-line)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.required}
                              onChange={(e) => updateFormField(index, 'required', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label className="text-sm">Required</label>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Min Length</label>
                            <input
                              type="number"
                              value={form.minLength || ''}
                              onChange={(e) => updateFormField(index, 'minLength', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Max Length</label>
                            <input
                              type="number"
                              value={form.maxLength || ''}
                              onChange={(e) => updateFormField(index, 'maxLength', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No pre-ticket forms configured.</p>
                    <p className="text-sm mt-1">Tickets will be created without asking questions first.</p>
                  </div>
                )}
              </div>
            )}

            {/* Style Section */}
            {activeSection === 'style' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Ticket Style</h3>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ticket Type</label>
                  <select
                    value={panel.style?.type || 'channel'}
                    onChange={(e) => updatePanel('style.type', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="channel">Channel (Private text channel)</option>
                    <option value="thread">Thread (Private thread)</option>
                    <option value="dropdown">Dropdown (Category dropdown menu)</option>
                  </select>
                </div>

                {panel.style?.type === 'thread' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Thread Parent Channel</label>
                    <select
                      value={panel.style?.threadParentId || ''}
                      onChange={(e) => updatePanel('style.threadParentId', e.target.value)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    >
                      <option value="">Select a channel...</option>
                      {channels?.filter(c => c.type === 0).map(channel => (
                        <option key={channel.id} value={channel.id}>#{channel.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Threads will be created in this channel</p>
                  </div>
                )}

                {panel.style?.type === 'dropdown' && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Dropdown Placeholder</label>
                    <input
                      type="text"
                      value={panel.style?.dropdownPlaceholder || ''}
                      onChange={(e) => updatePanel('style.dropdownPlaceholder', e.target.value)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="Select a category..."
                    />
                  </div>
                )}

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-medium mb-3">Naming Scheme</h4>
                  <input
                    type="text"
                    value={panel.settings?.namingScheme || 'ticket-{number}'}
                    onChange={(e) => updatePanel('settings.namingScheme', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{number}'}, {'{user}'}, {'{category}'}
                  </p>
                </div>
              </div>
            )}

            {/* Claiming Section */}
            {activeSection === 'claiming' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Ticket Claiming</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.claiming?.enabled !== false}
                      onChange={(e) => updatePanel('claiming.enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Enable ticket claiming</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.claiming?.staffOnlyClaimEnabled !== false}
                      onChange={(e) => updatePanel('claiming.staffOnlyClaimEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Only staff can claim tickets</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.claiming?.unclaimEnabled !== false}
                      onChange={(e) => updatePanel('claiming.unclaimEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Allow unclaiming tickets</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.claiming?.autoClaimEnabled || false}
                      onChange={(e) => updatePanel('claiming.autoClaimEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Auto-claim when staff sends first message</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-1">Claim Message</label>
                  <input
                    type="text"
                    value={panel.claiming?.claimMessage || ''}
                    onChange={(e) => updatePanel('claiming.claimMessage', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    placeholder="This ticket has been claimed by {user}."
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: {'{user}'}</p>
                </div>
              </div>
            )}

            {/* Limits Section */}
            {activeSection === 'limits' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Ticket Limits</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Tickets Per User</label>
                    <input
                      type="number"
                      value={panel.limits?.maxTicketsPerUser || 1}
                      onChange={(e) => updatePanel('limits.maxTicketsPerUser', parseInt(e.target.value) || 1)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Max Total Tickets (0 = unlimited)</label>
                    <input
                      type="number"
                      value={panel.limits?.maxTotalTickets || 0}
                      onChange={(e) => updatePanel('limits.maxTotalTickets', parseInt(e.target.value) || 0)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Cooldown Between Tickets (seconds)</label>
                  <input
                    type="number"
                    value={panel.limits?.cooldownSeconds || 0}
                    onChange={(e) => updatePanel('limits.cooldownSeconds', parseInt(e.target.value) || 0)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                    min="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <RoleMultiSelect
                    value={panel.limits?.requireRoles || []}
                    onChange={(val) => updatePanel('limits.requireRoles', val)}
                    label="Required Roles (to create tickets)"
                  />
                  <RoleMultiSelect
                    value={panel.limits?.blacklistRoles || []}
                    onChange={(val) => updatePanel('limits.blacklistRoles', val)}
                    label="Blacklisted Roles (cannot create tickets)"
                  />
                </div>
              </div>
            )}

            {/* Permissions Section */}
            {activeSection === 'permissions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Staff Permissions</h3>

                <div className="grid grid-cols-2 gap-4">
                  <RoleMultiSelect
                    value={panel.permissions?.supportRoles || []}
                    onChange={(val) => updatePanel('permissions.supportRoles', val)}
                    label="Support Roles (can view/respond)"
                  />
                  <RoleMultiSelect
                    value={panel.permissions?.adminRoles || []}
                    onChange={(val) => updatePanel('permissions.adminRoles', val)}
                    label="Admin Roles (full access)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RoleMultiSelect
                    value={panel.permissions?.canCloseRoles || []}
                    onChange={(val) => updatePanel('permissions.canCloseRoles', val)}
                    label="Can Close Tickets"
                  />
                  <RoleMultiSelect
                    value={panel.permissions?.canDeleteRoles || []}
                    onChange={(val) => updatePanel('permissions.canDeleteRoles', val)}
                    label="Can Delete Tickets"
                  />
                </div>

                <RoleMultiSelect
                  value={panel.permissions?.canViewAllTickets || []}
                  onChange={(val) => updatePanel('permissions.canViewAllTickets', val)}
                  label="Can View All Tickets"
                />
              </div>
            )}

            {/* Automations Section */}
            {activeSection === 'automations' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Automations</h3>
                  <button onClick={addAutomation} className="btn-primary text-sm">
                    + Add Automation
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  Automations allow you to automatically perform actions based on triggers.
                </p>

                {panel.automations?.length > 0 ? (
                  <div className="space-y-4">
                    {panel.automations.map((auto, index) => (
                      <div key={auto.id} className="bg-discord-dark border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={auto.enabled}
                              onChange={(e) => updateAutomation(index, { enabled: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <input
                              type="text"
                              value={auto.name}
                              onChange={(e) => updateAutomation(index, { name: e.target.value })}
                              className="bg-transparent border-none font-medium focus:outline-none"
                              placeholder="Automation Name"
                            />
                          </div>
                          <button
                            onClick={() => removeAutomation(index)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Trigger</label>
                            <select
                              value={auto.trigger?.type || 'ticket_created'}
                              onChange={(e) => updateAutomation(index, { trigger: { type: e.target.value, value: null } })}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="ticket_created">Ticket Created</option>
                              <option value="ticket_claimed">Ticket Claimed</option>
                              <option value="inactivity">Inactivity (hours)</option>
                              <option value="keyword">Keyword Match</option>
                              <option value="time_elapsed">Time Elapsed (hours)</option>
                            </select>
                          </div>
                          {['inactivity', 'time_elapsed'].includes(auto.trigger?.type) && (
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Hours</label>
                              <input
                                type="number"
                                value={auto.trigger?.value || ''}
                                onChange={(e) => updateAutomation(index, { trigger: { ...auto.trigger, value: parseInt(e.target.value) || 0 } })}
                                className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                                min="1"
                              />
                            </div>
                          )}
                          {auto.trigger?.type === 'keyword' && (
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Keyword</label>
                              <input
                                type="text"
                                value={auto.trigger?.value || ''}
                                onChange={(e) => updateAutomation(index, { trigger: { ...auto.trigger, value: e.target.value } })}
                                className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                                placeholder="Enter keyword..."
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm text-gray-400 mb-1">Action</label>
                          <select
                            value={auto.actions?.[0]?.type || 'send_message'}
                            onChange={(e) => updateAutomation(index, { actions: [{ type: e.target.value, value: '' }] })}
                            className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="send_message">Send Message</option>
                            <option value="close_ticket">Close Ticket</option>
                            <option value="claim_ticket">Claim Ticket</option>
                            <option value="ping_role">Ping Role</option>
                            <option value="set_priority">Set Priority</option>
                          </select>
                        </div>

                        {auto.actions?.[0]?.type === 'send_message' && (
                          <div className="mt-3">
                            <label className="block text-sm text-gray-400 mb-1">Message</label>
                            <textarea
                              value={auto.actions?.[0]?.value || ''}
                              onChange={(e) => updateAutomation(index, { actions: [{ ...auto.actions[0], value: e.target.value }] })}
                              className="w-full bg-discord-darker border border-gray-600 rounded-lg px-3 py-2 text-sm"
                              rows={2}
                              placeholder="Enter message to send..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No automations configured.</p>
                  </div>
                )}
              </div>
            )}

            {/* Transcripts Section */}
            {activeSection === 'transcripts' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Transcript Settings</h3>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={panel.transcripts?.enabled !== false}
                    onChange={(e) => updatePanel('transcripts.enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Enable transcripts</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Transcript Channel</label>
                  <select
                    value={panel.transcripts?.channelId || ''}
                    onChange={(e) => updatePanel('transcripts.channelId', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="">None</option>
                    {channels?.filter(c => c.type === 0).map(channel => (
                      <option key={channel.id} value={channel.id}>#{channel.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Transcript Format</label>
                  <select
                    value={panel.transcripts?.format || 'html'}
                    onChange={(e) => updatePanel('transcripts.format', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="html">HTML (styled)</option>
                    <option value="text">Plain Text</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.transcripts?.dmToUser !== false}
                      onChange={(e) => updatePanel('transcripts.dmToUser', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>DM transcript to ticket creator</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.transcripts?.includeAttachments !== false}
                      onChange={(e) => updatePanel('transcripts.includeAttachments', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Include attachments in transcript</span>
                  </label>
                </div>
              </div>
            )}

            {/* Logging Section */}
            {activeSection === 'logging' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Logging Settings</h3>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={panel.logging?.enabled !== false}
                    onChange={(e) => updatePanel('logging.enabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Enable logging</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Log Channel</label>
                  <select
                    value={panel.logging?.channelId || ''}
                    onChange={(e) => updatePanel('logging.channelId', e.target.value)}
                    className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                  >
                    <option value="">None</option>
                    {channels?.filter(c => c.type === 0).map(channel => (
                      <option key={channel.id} value={channel.id}>#{channel.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 mt-4">
                  <p className="text-sm text-gray-400">Log Events:</p>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.logging?.logCreation !== false}
                      onChange={(e) => updatePanel('logging.logCreation', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Ticket creation</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.logging?.logClose !== false}
                      onChange={(e) => updatePanel('logging.logClose', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Ticket close</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.logging?.logClaim !== false}
                      onChange={(e) => updatePanel('logging.logClaim', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Ticket claim/unclaim</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.logging?.logEscalation !== false}
                      onChange={(e) => updatePanel('logging.logEscalation', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Ticket escalation</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.logging?.logAddRemoveUser !== false}
                      onChange={(e) => updatePanel('logging.logAddRemoveUser', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Add/remove users</span>
                  </label>
                </div>
              </div>
            )}

            {/* Settings Section */}
            {activeSection === 'settings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Auto-Close After (hours, 0 = disabled)</label>
                    <input
                      type="number"
                      value={panel.settings?.autoCloseHours || 0}
                      onChange={(e) => updatePanel('settings.autoCloseHours', parseInt(e.target.value) || 0)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Warning Before Auto-Close (hours)</label>
                    <input
                      type="number"
                      value={panel.settings?.autoCloseWarningHours || 0}
                      onChange={(e) => updatePanel('settings.autoCloseWarningHours', parseInt(e.target.value) || 0)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.settings?.closeConfirmation !== false}
                      onChange={(e) => updatePanel('settings.closeConfirmation', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Require confirmation before closing</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={panel.settings?.deleteOnClose || false}
                      onChange={(e) => updatePanel('settings.deleteOnClose', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Delete channel on close</span>
                  </label>
                </div>

                {!panel.settings?.deleteOnClose && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Delete After Close (hours, 0 = never)</label>
                    <input
                      type="number"
                      value={panel.settings?.deleteAfterHours || 0}
                      onChange={(e) => updatePanel('settings.deleteAfterHours', parseInt(e.target.value) || 0)}
                      className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                      min="0"
                    />
                  </div>
                )}

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-medium mb-3">Feedback</h4>

                  <label className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={panel.settings?.feedbackEnabled || false}
                      onChange={(e) => updatePanel('settings.feedbackEnabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Enable feedback on ticket close</span>
                  </label>

                  {panel.settings?.feedbackEnabled && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Feedback Message</label>
                      <input
                        type="text"
                        value={panel.settings?.feedbackMessage || ''}
                        onChange={(e) => updatePanel('settings.feedbackMessage', e.target.value)}
                        className="w-full bg-discord-dark border border-gray-600 rounded-lg px-4 py-2"
                        placeholder="How would you rate your support experience?"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="font-medium mb-3">Escalation</h4>

                  <label className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={panel.escalation?.enabled || false}
                      onChange={(e) => updatePanel('escalation.enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Enable ticket escalation</span>
                  </label>

                  {panel.escalation?.enabled && (
                    <>
                      <label className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          checked={panel.escalation?.requireReason !== false}
                          onChange={(e) => updatePanel('escalation.requireReason', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Require reason for escalation</span>
                      </label>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Panels</label>
                        <div className="bg-discord-dark border border-gray-600 rounded-lg p-2 max-h-32 overflow-y-auto">
                          {allPanels?.filter(p => p._id !== panel._id).map(p => (
                            <label key={p._id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-700 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={panel.escalation?.targetPanels?.includes(p._id) || false}
                                onChange={(e) => {
                                  const current = panel.escalation?.targetPanels || [];
                                  if (e.target.checked) {
                                    updatePanel('escalation.targetPanels', [...current, p._id]);
                                  } else {
                                    updatePanel('escalation.targetPanels', current.filter(id => id !== p._id));
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                          {(!allPanels || allPanels.filter(p => p._id !== panel._id).length === 0) && (
                            <p className="text-gray-500 text-sm p-2">No other panels available</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-2"
          >
            {saving ? 'Saving...' : (initialPanel?._id ? 'Save Changes' : 'Create Panel')}
          </button>
        </div>
      </div>
    </div>
  );
}
