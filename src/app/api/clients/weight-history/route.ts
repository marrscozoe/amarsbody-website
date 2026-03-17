import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readClientsFile(): any[] {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, 'clients.json');
  if (!fs.existsSync(filepath)) {
    return [];
  }
  const data = fs.readFileSync(filepath, 'utf-8');
  return data ? JSON.parse(data) : [];
}

function writeClientsFile(data: any[]): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, 'clients.json');
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// GET /api/clients/weight-history - Get weight history for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }
    
    const clients = readClientsFile();
    const client = clients.find((c: any) => c.id === clientId);
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    return NextResponse.json(client.weightHistory || []);
  } catch (error) {
    console.error('Error reading weight history:', error);
    return NextResponse.json({ error: 'Failed to read weight history' }, { status: 500 });
  }
}

// POST /api/clients/weight-history - Add weight entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, weight, date } = body;
    
    if (!clientId || !weight) {
      return NextResponse.json({ error: 'Client ID and weight required' }, { status: 400 });
    }
    
    const clients = readClientsFile();
    const index = clients.findIndex((c: any) => c.id === clientId);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    const weightEntry = {
      date: date || new Date().toISOString(),
      weight: parseFloat(weight)
    };
    
    clients[index].weightHistory = [
      ...(clients[index].weightHistory || []),
      weightEntry
    ];
    
    writeClientsFile(clients);
    
    return NextResponse.json(weightEntry, { status: 201 });
  } catch (error) {
    console.error('Error adding weight:', error);
    return NextResponse.json({ error: 'Failed to add weight' }, { status: 500 });
  }
}
