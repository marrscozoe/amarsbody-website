'use client';

import { useState, useEffect } from 'react';

const CORRECT_PIN = '9855';

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      onSuccess();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Lead Pipeline Access</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your PIN to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            maxLength={10}
            className={`w-full text-center text-3xl tracking-widest border-2 rounded-xl py-4 px-6 mb-4 focus:outline-none focus:ring-2 transition-colors ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-orange-200 focus:border-orange-400'}`}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm text-center mb-4">Incorrect PIN. Try again.</p>}
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  event_date: string | null;
  event_type: string | null;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: string;
}

const STAGES = [
  { key: 'new', label: 'New', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-500' },
  { key: 'consultation', label: 'Consultation', color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-500' },
  { key: 'booked', label: 'Booked ✓', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-500' },
  { key: 'lost', label: 'Lost', color: 'bg-gray-50 border-gray-200', headerColor: 'bg-gray-500' },
];

const SOURCES = [
  'Website Contact Form',
  'Facebook',
  'Instagram',
  'Wedding Venue Referral',
  'Google Search',
  'Friend Referral',
  'Wedding Show/Expo',
  'Other',
];

const EVENT_TYPES = [
  'Wedding',
  'Beach Trip',
  'Reunion',
  'Photoshoot',
  'Graduation',
  'Other Event',
  'General Fitness',
];

export default function LeadsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'pipeline' | 'nb-waitlist'>('pipeline');
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({
    new: [],
    contacted: [],
    consultation: [],
    booked: [],
    lost: [],
  });
  const [nbWaitlist, setNbWaitlist] = useState<{name: string; email: string; timestamp: string}[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [draggedLead, setDraggedLead] = useState<{id: number, fromStage: string} | null>(null);
  const [filterSource, setFilterSource] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    event_date: '',
    event_type: '',
    notes: '',
    follow_up_date: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLeads();
      fetchStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && view === 'nb-waitlist') {
      fetchNbWaitlist();
    }
  }, [isAuthenticated, view]);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads?type=byStatus');
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      if (data && typeof data === 'object') {
        setLeadsByStage(data);
      }
    } catch (err) {
      console.error('fetchLeads error:', err);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/leads?type=stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      if (data && typeof data === 'object') {
        setStats(data);
      }
    } catch (err) {
      console.error('fetchStats error:', err);
    }
  }

  async function fetchNbWaitlist() {
    try {
      const res = await fetch('/api/new-braunfels-waitlist');
      if (!res.ok) throw new Error('Failed to fetch NB waitlist');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNbWaitlist(data);
      }
    } catch (err) {
      console.error('fetchNbWaitlist error:', err);
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4" suppressHydrationWarning>
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2" suppressHydrationWarning>🔒</div>
            <h1 className="text-xl font-bold text-gray-900" suppressHydrationWarning>Lead Pipeline Access</h1>
            <p className="text-gray-500 text-sm mt-1" suppressHydrationWarning>Enter your PIN to continue</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        source: formData.source,
        eventDate: formData.event_date,
        eventType: formData.event_type,
        notes: formData.notes,
        followUpDate: formData.follow_up_date,
      }),
    });
    setShowAddLead(false);
    setFormData({ name: '', email: '', phone: '', source: '', event_date: '', event_type: '', notes: '', follow_up_date: '' });
    fetchLeads();
    fetchStats();
  }

  async function handleUpdateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLead) return;
    
    const payload = {
      id: editingLead.id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      source: formData.source || null,
      event_date: formData.event_date || null,
      event_type: formData.event_type || null,
      notes: formData.notes || null,
      follow_up_date: formData.follow_up_date || null,
    };
    
    await fetch('/api/leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingLead(null);
    setFormData({ name: '', email: '', phone: '', source: '', event_date: '', event_type: '', notes: '', follow_up_date: '' });
    fetchLeads();
    fetchStats();
  }

  async function handleDeleteLead(id: number) {
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    fetchLeads();
    fetchStats();
  }

  async function handleStatusChange(leadId: number, newStatus: string) {
    await fetch('/api/leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    fetchLeads();
    fetchStats();
  }

  function openEditLead(lead: Lead) {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || '',
      event_date: lead.event_date || '',
      event_type: lead.event_type || '',
      notes: lead.notes || '',
      follow_up_date: lead.follow_up_date || '',
    });
  }

  function openAddLead() {
    setEditingLead(null);
    setFormData({ name: '', email: '', phone: '', source: '', event_date: '', event_type: '', notes: '', follow_up_date: '' });
    setShowAddLead(true);
  }

  function handleDragStart(leadId: number, stage: string) {
    setDraggedLead({ id: leadId, fromStage: stage });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, toStage: string) {
    e.preventDefault();
    if (!draggedLead || draggedLead.fromStage === toStage) {
      setDraggedLead(null);
      return;
    }
    
    await handleStatusChange(draggedLead.id, toStage);
    setDraggedLead(null);
  }

  function isTodayOrPast(dateStr: string | null) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr + 'T00:00:00');
    return date <= today;
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const filteredLeadsByStage = Object.fromEntries(
    Object.entries(leadsByStage).map(([stage, leads]) => [
      stage,
      filterSource ? leads.filter(l => l.source === filterSource) : leads
    ])
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - AMarsBody Orange Theme */}
      <header className="bg-orange-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <a href="/" className="text-white hover:text-orange-200">← Back to Site</a>
            </div>
            <h1 className="text-2xl font-bold mt-1">📈 Lead Pipeline</h1>
            <p className="text-orange-100 text-sm">Track & convert more clients</p>
          </div>
          <div className="flex gap-3">
            {/* Tab Switcher */}
            <button
              onClick={() => { setView('pipeline'); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${view === 'pipeline' ? 'bg-white text-orange-500' : 'text-white hover:bg-orange-400'}`}
            >
              Dallas Pipeline
            </button>
            <button
              onClick={() => { setView('nb-waitlist'); fetchNbWaitlist(); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${view === 'nb-waitlist' ? 'bg-white text-orange-500' : 'text-white hover:bg-orange-400'}`}
            >
              🚀 NB Waitlist {nbWaitlist.length > 0 && `(${nbWaitlist.length})`}
            </button>
          </div>
        </div>
      </header>

      {/* NB Waitlist View */}
      {view === 'nb-waitlist' && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">🚀 New Braunfels Waitlist</h2>
                <p className="text-slate-300 text-sm">Pre-launch interest from NB residents</p>
              </div>
              <a
                href="https://amarsbody.com/new-braunfels"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                View Landing Page →
              </a>
            </div>

            {nbWaitlist.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">No waitlist entries yet</h3>
                <p className="text-sm">Share the NB landing page to start collecting leads!</p>
                <a
                  href="https://amarsbody.com/new-braunfels"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                  Open Landing Page
                </a>
              </div>
            ) : (
              <div className="divide-y">
                {nbWaitlist.map((entry, i) => (
                  <div key={i} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-lg">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{entry.name}</div>
                        <a href={`mailto:${entry.email}`} className="text-sm text-orange-500 hover:text-orange-600">
                          {entry.email}
                        </a>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <a href={`mailto:${entry.email}`} className="text-xs text-orange-500 hover:text-orange-600">
                        Send Email →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach CTA */}
          <div className="mt-6 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white text-center">
            <h3 className="text-lg font-bold mb-2">Start Outreach to Wedding Venues</h3>
            <p className="text-sm text-orange-100 mb-4">
              Share the landing page with New Braunfels wedding venues for cross-promotion. Best targets: Willow Ridge, Hidden Gem of Gruene, Gruene Estate Event Venue.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a
                href="https://amarsbody.com/new-braunfels"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-orange-500 px-5 py-2 rounded-full font-bold hover:bg-orange-100 transition-colors text-sm"
              >
                Copy Landing Page Link
              </a>
              <a
                href="https://mail.google.com/mail/u/0/#inbox"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-white text-white px-5 py-2 rounded-full font-bold hover:bg-white/10 transition-colors text-sm"
              >
                Email Venues via Gmail
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline View */}
      {view === 'pipeline' && (<>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total Leads</div>
              </div>
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-blue-600">{stats.byStatus.new || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">New</div>
              </div>
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-yellow-600">{stats.byStatus.contacted || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Contacted</div>
              </div>
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-purple-600">{stats.byStatus.consultation || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Consultation</div>
              </div>
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-green-600">{stats.byStatus.booked || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Booked</div>
              </div>
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-red-600">{stats.byStatus.lost || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Lost</div>
              </div>
              <div className="text-center px-6 border-l">
                <div className="text-3xl font-bold text-orange-600">{stats.conversionRate}%</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Conversion</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source Filter */}
      <div className="bg-gray-50 border-b p-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filter by Source:</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {filterSource && (
            <button onClick={() => setFilterSource('')} className="text-sm text-red-600 hover:underline">
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              className={`w-72 flex-shrink-0 ${stage.color} border-2 rounded-xl flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              {/* Stage Header */}
              <div className={`${stage.headerColor} text-white px-4 py-3 rounded-t-lg flex justify-between items-center`}>
                <span className="font-bold">{stage.label}</span>
                <span className="bg-white text-gray-800 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow">
                  {filteredLeadsByStage[stage.key]?.length || 0}
                </span>
              </div>
              
              {/* Leads */}
              <div className="p-2 space-y-2 flex-1 min-h-[250px]">
                {(filteredLeadsByStage[stage.key] || []).map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id, stage.key)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="font-bold text-gray-900 text-lg">{lead.name}</div>
                    
                    {lead.email && (
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        ✉️ {lead.email}
                      </div>
                    )}
                    
                    {lead.phone && (
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        📞 {lead.phone}
                      </div>
                    )}
                    
                    {lead.event_type && (
                      <div className="text-xs text-purple-600 mt-2 font-medium flex items-center gap-1">
                        🎯 {lead.event_type}
                      </div>
                    )}
                    
                    {lead.event_date && (
                      <div className="text-xs text-pink-600 mt-1 flex items-center gap-1">
                        📅 {formatDate(lead.event_date)}
                      </div>
                    )}
                    
                    {lead.source && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        📍 {lead.source}
                      </div>
                    )}
                    
                    {lead.follow_up_date && isTodayOrPast(lead.follow_up_date) && lead.status !== 'booked' && lead.status !== 'lost' && (
                      <div className="text-xs text-red-600 mt-2 font-bold bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                        ⏰ OVERDUE: {formatDate(lead.follow_up_date)}
                      </div>
                    )}
                    
                    {lead.notes && (
                      <div className="text-xs text-gray-500 mt-2 line-clamp-2 italic">
                        &ldquo;{lead.notes}&rdquo;
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-3 pt-2 border-t text-xs">
                      <button
                        onClick={() => openEditLead(lead)}
                        className="text-orange-500 hover:text-orange-700 font-medium"
                      >
                        Edit
                      </button>
                      {stage.key !== 'lost' && lead.status !== 'lost' && (
                        <button
                          onClick={() => handleStatusChange(lead.id, 'lost')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Mark Lost
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(lead.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                
                {(!filteredLeadsByStage[stage.key] || filteredLeadsByStage[stage.key].length === 0) && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {stage.key === 'new' ? '📥 Drop leads here' : 'No leads in this stage'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Lead Modal */}
      {(showAddLead || editingLead) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-bold text-xl mb-4 text-gray-900">
              {editingLead ? '✏️ Edit Lead' : '➕ Add New Lead'}
            </h3>
            <form onSubmit={editingLead ? handleUpdateLead : handleAddLead}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="Jane Smith"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="jane@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="(830) 555-1234"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select source...</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors bg-white"
                  >
                    <option value="">Select...</option>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none transition-colors"
                  rows={3}
                  placeholder="Interested in 8-week package, prefers morning sessions..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddLead(false); setEditingLead(null); }}
                  className="flex-1 border-2 border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors">
                  {editingLead ? 'Save Changes' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-xl mb-2">Delete Lead?</h3>
            <p className="mb-6 text-gray-600">This will permanently remove this lead. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border-2 border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLead(confirmDelete)}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
        💡 Drag leads between columns to update their status • Click lead to edit details
      </div>
      </>)}
    </div>
  );
}
