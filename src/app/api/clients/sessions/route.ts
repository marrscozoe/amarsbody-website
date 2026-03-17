import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile(filename: string): any[] {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return [];
  }
  const data = fs.readFileSync(filepath, 'utf-8');
  return data ? JSON.parse(data) : [];
}

function writeJsonFile(filename: string, data: any): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// GET /api/clients/sessions - List all sessions (optionally filter by clientId)
// POST /api/clients/sessions - Create a new session

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const sessions = readJsonFile('session-history.json');
    
    if (clientId) {
      const filtered = sessions
        .filter((s: any) => s.clientId === clientId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json(filtered);
    }
    
    // Return all sessions sorted by date
    const sorted = sessions.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error reading sessions:', error);
    return NextResponse.json({ error: 'Failed to read sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessions = readJsonFile('session-history.json');
    
    const newSession = {
      ...body,
      id: Date.now().toString(),
      date: body.date || new Date().toISOString(),
    };
    
    sessions.push(newSession);
    writeJsonFile('session-history.json', sessions);
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
