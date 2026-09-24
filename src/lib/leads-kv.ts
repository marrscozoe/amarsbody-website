import fs from 'fs';
import path from 'path';

export interface Lead {
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
  subject?: string | null;
  body?: string | null;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');

function readLeads(): Lead[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[leads-kv] Read error:', err);
    return [];
  }
}

function writeLeads(leads: Lead[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
  } catch (err) {
    console.error('[leads-kv] Write error:', err);
  }
}

export async function getLeads(): Promise<Lead[]> {
  const leads = readLeads();
  return leads.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getLead(id: number): Promise<Lead | undefined> {
  const leads = readLeads();
  return leads.find(l => l.id === id);
}

export async function getLeadsByStatus(): Promise<Record<string, Lead[]>> {
  const leads = await getLeads();
  const stages = ['new', 'contacted', 'consultation', 'booked', 'lost'];
  const result: Record<string, Lead[]> = {};
  for (const stage of stages) {
    result[stage] = leads.filter(l => l.status === stage);
  }
  return result;
}

export async function addLead(
  name: string,
  email: string | null,
  phone: string | null,
  source: string | null,
  eventDate: string | null,
  eventType: string | null,
  notes: string | null,
  followUpDate: string | null
): Promise<number> {
  const leads = readLeads();
  const maxId = leads.reduce((max, l) => Math.max(max, l.id || 0), 0);
  const newId = maxId + 1;
  const now = new Date().toISOString();
  
  const newLead: Lead = {
    id: newId,
    name,
    email: email || null,
    phone: phone || null,
    source: source || null,
    event_date: eventDate || null,
    event_type: eventType || null,
    status: 'new',
    notes: notes || null,
    follow_up_date: followUpDate || null,
    created_at: now,
    updated_at: now,
  };

  leads.push(newLead);
  writeLeads(leads);
  return newId;
}

export async function updateLead(
  id: number,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    event_date?: string | null;
    event_type?: string | null;
    status?: string;
    notes?: string | null;
    follow_up_date?: string | null;
  }
): Promise<boolean> {
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return false;

  const lead = leads[index];
  if (data.name !== undefined) lead.name = data.name;
  if (data.email !== undefined) lead.email = data.email;
  if (data.phone !== undefined) lead.phone = data.phone;
  if (data.source !== undefined) lead.source = data.source;
  if (data.event_date !== undefined) lead.event_date = data.event_date;
  if (data.event_type !== undefined) lead.event_type = data.event_type;
  if (data.status !== undefined) lead.status = data.status;
  if (data.notes !== undefined) lead.notes = data.notes;
  if (data.follow_up_date !== undefined) lead.follow_up_date = data.follow_up_date;
  lead.updated_at = new Date().toISOString();

  leads[index] = lead;
  writeLeads(leads);
  return true;
}

export async function deleteLead(id: number): Promise<boolean> {
  const leads = readLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return false;
  leads.splice(index, 1);
  writeLeads(leads);
  return true;
}

export async function getLeadStats() {
  const leads = await getLeads();
  const total = leads.length;
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const lead of leads) {
    byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    if (lead.source) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    }
  }

  const conversionRate = total > 0 ? ((byStatus['booked'] || 0) / total * 100).toFixed(1) : '0';

  return { total, byStatus, bySource, conversionRate };
}