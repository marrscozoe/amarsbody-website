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

// GET /api/clients/exercise-weights - List all exercise weights
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const weights = readJsonFile('exercise-weights.json');
    
    if (clientId) {
      const filtered = weights.filter((w: any) => w.clientId === clientId);
      return NextResponse.json(filtered);
    }
    
    return NextResponse.json(weights);
  } catch (error) {
    console.error('Error reading exercise weights:', error);
    return NextResponse.json({ error: 'Failed to read weights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const weights = readJsonFile('exercise-weights.json');
    
    const newEntry = {
      ...body,
      id: Date.now().toString(),
      date: body.date || new Date().toISOString(),
    };
    
    weights.push(newEntry);
    writeJsonFile('exercise-weights.json', weights);
    
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error saving exercise weight:', error);
    return NextResponse.json({ error: 'Failed to save weight' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Weight ID required' }, { status: 400 });
    }
    
    const weights = readJsonFile('exercise-weights.json');
    const index = weights.findIndex((w: any) => w.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Weight not found' }, { status: 404 });
    }
    
    weights[index] = {
      ...weights[index],
      ...updates,
    };
    
    writeJsonFile('exercise-weights.json', weights);
    
    return NextResponse.json(weights[index]);
  } catch (error) {
    console.error('Error updating exercise weight:', error);
    return NextResponse.json({ error: 'Failed to update weight' }, { status: 500 });
  }
}
