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

// GET /api/workouts - List all workouts or get by clientId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const workouts = readJsonFile('workouts.json');
    
    if (clientId) {
      const filtered = workouts.filter((w: any) => w.clientId === clientId);
      return NextResponse.json(filtered);
    }
    
    return NextResponse.json(workouts);
  } catch (error) {
    console.error('Error reading workouts:', error);
    return NextResponse.json({ error: 'Failed to read workouts' }, { status: 500 });
  }
}

// POST /api/workouts - Create a new workout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workouts = readJsonFile('workouts.json');
    
    const newWorkout = {
      ...body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    workouts.push(newWorkout);
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json(newWorkout, { status: 201 });
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
  }
}

// PUT /api/workouts - Update a workout
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }
    
    const workouts = readJsonFile('workouts.json');
    const index = workouts.findIndex((w: any) => w.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }
    
    workouts[index] = {
      ...workouts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json(workouts[index]);
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 });
  }
}

// DELETE /api/workouts - Delete a workout
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }
    
    let workouts = readJsonFile('workouts.json');
    workouts = workouts.filter((w: any) => w.id !== id);
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}
