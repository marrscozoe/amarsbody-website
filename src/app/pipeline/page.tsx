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
          <div className="text-4xl mb-2">🔗</div>
          <h1 className="text-xl font-bold text-gray-900">Client Pipeline</h1>
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

interface PendingReply {
  to_email: string;
  to_name: string;
  subject: string;
  lead_email: string;
  lead_body: string;
  created_at: string;
  status: string;
}

const STAGES = [
  { key: 'new', label: 'New', color: 'bg-blue-50 border-blue-300', headerColor: 'bg-blue-600 text-white' },
  { key: 'contacted', label: 'Contacted', color: 'bg-yellow-50 border-yellow-300', headerColor: 'bg-yellow-600 text-white' },
  { key: 'consultation', label: 'Consultation', color: 'bg-purple-50 border-purple-300', headerColor: 'bg-purple-600 text-white' },
  { key: 'booked', label: 'Booked ✓', color: 'bg-green-50 border-green-300', headerColor: 'bg-green-600 text-white' },
  { key: 'lost', label: 'Lost', color: 'bg-gray-50 border-gray-300', headerColor: 'bg-gray-600 text-white' },
];

export default function PipelinePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pendingReplies, setPendingReplies] = useState<PendingReply[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState('');
  const [stats, setStats] = useState({ total: 0, booked: 0, thisWeek: 0, stale: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  async function fetchData() {
    try {
      // Fetch leads
      const leadsRes = await fetch('/api/leads');
      const leadsData = await leadsRes.json();
      if (Array.isArray(leadsData)) {
        setLeads(leadsData);
        
        // Calculate stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        
        const booked = leadsData.filter((l: Lead) => l.status === 'booked').length;
        const thisWeek = leadsData.filter((l: Lead) => new Date(l.created_at) >= weekAgo).length;
        const stale = leadsData.filter((l: Lead) => l.status === 'new' && new Date(l.created_at) < threeDaysAgo).length;
        
        setStats({ total: leadsData.length, booked, thisWeek, stale });
      }
      
      // Fetch pending replies
      const pendingRes = await fetch('/api/pending-replies');
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        if (Array.isArray(pendingData)) {
          setPendingReplies(pendingData);
        }
      }
    } catch (err) {
      console.error('fetchData error:', err);
    }
  }

  async function handleStatusChange(leadId: number, newStatus: string) {
    try {
      await fetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error('handleStatusChange error:', err);
    }
  }

  async function handleAddNote(lead: Lead) {
    const currentNotes = lead.notes || '';
    const newNotes = currentNotes + (currentNotes ? '\n' : '') + `[${new Date().toLocaleDateString()}] ${noteText}`;
    try {
      await fetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, notes: newNotes }),
      });
      setNoteText('');
      setEditingLead(null);
      fetchData();
    } catch (err) {
      console.error('handleAddNote error:', err);
    }
  }

  async function handleApproveReply(pending: PendingReply) {
    try {
      await fetch('/api/pending-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', lead_email: pending.lead_email }),
      });
      fetchData();
    } catch (err) {
      console.error('handleApproveReply error:', err);
    }
  }

  function isStale(lead: Lead): boolean {
    if (lead.status !== 'new') return false;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return new Date(lead.created_at) < threeDaysAgo;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getDaysOld(dateStr: string): number {
    const created = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
  }

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.source === filter);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Header - full width orange bar */}
      <header className="bg-orange-500 text-white shadow-lg w-full">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <a href="/" className="text-white hover:text-orange-200 text-sm">← Back to Site</a>
            <h1 className="text-xl md:text-2xl font-bold mt-1">🔗 Client Pipeline</h1>
          </div>
          <div className="text-right">
            <p className="text-orange-100 text-xs md:text-sm">All leads in one view</p>
          </div>
        </div>
      </header>

      {/* All content sections - same width */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
          <div className="bg-white rounded-xl p-3 md:p-4 shadow border-l-4 border-orange-500">
            <p className="text-gray-500 text-xs md:text-sm">Total Leads</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow border-l-4 border-green-500">
            <p className="text-gray-500 text-xs md:text-sm">Booked</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">{stats.booked}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs md:text-sm">This Week</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-xl p-3 md:p-4 shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-xs md:text-sm">Stale (3+ days)</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600">{stats.stale}</p>
          </div>
        </div>

        {/* Pending Replies */}
        {pendingReplies.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
            <h2 className="font-bold text-orange-800 mb-3">⏳ Pending Replies ({pendingReplies.length})</h2>
            <div className="grid gap-3">
              {pendingReplies.map((pending, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{pending.to_name}</p>
                    <p className="text-sm text-gray-500">{pending.lead_email}</p>
                    <p className="text-sm text-gray-600 mt-1 truncate max-w-xs md:max-w-md">{pending.lead_body?.substring(0, 80)}...</p>
                  </div>
                  <button
                    onClick={() => handleApproveReply(pending)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap"
                  >
                    ✓ Approve & Send
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter - full width row */}
        <div className="flex flex-wrap gap-2 mb-4 w-full">
          {['all', 'website', 'email', 'instagram', 'facebook', 'referral'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {f === 'all' ? 'All Sources' : f}
            </button>
          ))}
        </div>

        {/* Kanban Board - same width as everything else */}
        <div className="overflow-x-auto w-full">
          <div className="inline-flex gap-3 min-w-max">
          {STAGES.map(stage => (
            <div key={stage.key} className={`${stage.color} border-2 rounded-xl overflow-hidden flex-shrink-0 w-44`}>
              <div className={`${stage.headerColor} text-white px-3 py-2 font-semibold text-sm flex justify-between items-center`}>
                <span>{stage.label}</span>
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                  {filteredLeads.filter(l => l.status === stage.key).length}
                </span>
              </div>
              <div className="p-2 space-y-2 max-h-screen overflow-y-auto">
                {filteredLeads
                  .filter(l => l.status === stage.key)
                  .map(lead => (
                    <div 
                      key={lead.id} 
                      className={`bg-white rounded-lg p-3 shadow text-sm ${isStale(lead) ? 'ring-2 ring-red-400' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-gray-900">{lead.name}</p>
                        {isStale(lead) && <span className="text-red-500 text-xs">⚠️ {getDaysOld(lead.created_at)}d</span>}
                      </div>
                      {lead.email && <p className="text-gray-700 text-xs">{lead.email}</p>}
                      {lead.source && <p className="text-gray-500 text-xs capitalize">{lead.source}</p>}
                      <p className="text-gray-500 text-xs mt-1">{formatDate(lead.created_at)}</p>
                      
                      {lead.notes && (
                        <p className="text-gray-600 text-xs mt-2 bg-gray-50 rounded p-1 truncate">{lead.notes}</p>
                      )}
                      
                      <div className="flex gap-1 mt-2">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="text-xs border rounded px-1 py-0.5 w-full"
                        >
                          {STAGES.map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="w-full mt-2 text-xs text-orange-500 hover:text-orange-700 font-medium"
                      >
                        + Add Note
                      </button>
                    </div>
                  ))}
                {filteredLeads.filter(l => l.status === stage.key).length === 0 && (
                  <p className="text-gray-400 text-xs text-center py-4">No leads</p>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-xl mb-2">Add Note</h3>
            <p className="text-gray-500 text-sm mb-4">{editingLead.name}</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-orange-500 focus:outline-none"
              rows={4}
              placeholder="Add a note about this lead..."
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setEditingLead(null); setNoteText(''); }}
                className="flex-1 border-2 border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddNote(editingLead)}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}