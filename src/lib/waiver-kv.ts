import fs from 'fs';
import path from 'path';

export interface Waiver {
  id: number;
  clientName: string;
  email: string;
  phone: string | null;
  date: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  waiverType: string;
  agreedSections: string[];
  created_at: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'waivers.json');

function readWaivers(): Waiver[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[waiver-kv] Read error:', err);
    return [];
  }
}

function writeWaivers(waivers: Waiver[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(waivers, null, 2));
  } catch (err) {
    console.error('[waiver-kv] Write error:', err);
  }
}

export async function getWaivers(): Promise<Waiver[]> {
  return readWaivers().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getWaiver(id: number): Promise<Waiver | undefined> {
  return readWaivers().find(w => w.id === id);
}

export async function getWaiverByEmail(email: string): Promise<Waiver | undefined> {
  return readWaivers().find(
    w => w.email.toLowerCase() === email.toLowerCase()
  );
}

export async function addWaiver(data: {
  clientName: string;
  email: string;
  phone: string | null;
  date: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  waiverType: string;
  agreedSections: string[];
}): Promise<number> {
  const waivers = readWaivers();
  const maxId = waivers.reduce((max, w) => Math.max(max, w.id || 0), 0);
  const newWaiver: Waiver = {
    id: maxId + 1,
    ...data,
    created_at: new Date().toISOString(),
  };
  waivers.push(newWaiver);
  writeWaivers(waivers);
  return newWaiver.id;
}
