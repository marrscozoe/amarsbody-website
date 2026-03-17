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

// GET /api/clients/weights - List all weight entries (optionally filter by clientId)
// POST /api/clients/weights - Create a new weight entry

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const weights = readJsonFile('weight-entries.json');
    
    if (clientId) {
      const filtered = weights.filter((w: any) => w.clientId === clientId);
      return NextResponse.json(filtered);
    }
    
    return NextResponse.json(weights);
  } catch (error) {
    console.error('Error reading weights:', error);
    return NextResponse.json({ error: 'Failed to read weights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const weights = readJsonFile('weight-entries.json');
    
    const newEntry = {
      ...body,
      id: Date.now().toString(),
      date: body.date || new Date().toISOString(),
    };
    
    weights.push(newEntry);
    writeJsonFile('weight-entries.json', weights);
    
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating weight entry:', error);
    return NextResponse.json({ error: 'Failed to create weight entry' }, { status: 500 });
  }
}
