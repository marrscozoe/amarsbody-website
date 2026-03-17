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

// Exercise database
const EXERCISE_DATABASE = {
  // Full body exercises
  fullBody: [
    { name: 'Goblet Squats', type: 'legs', equipment: 'dumbbell' },
    { name: 'Push-ups', type: 'chest', equipment: 'bodyweight' },
    { name: 'Dumbbell Rows', type: 'back', equipment: 'dumbbell' },
    { name: 'Shoulder Press', type: 'shoulders', equipment: 'dumbbell' },
    { name: 'Lunges', type: 'legs', equipment: 'bodyweight' },
    { name: 'Plank', type: 'core', equipment: 'bodyweight' },
    { name: 'Dumbbell Deadlifts', type: 'legs', equipment: 'dumbbell' },
    { name: 'Bent Over Rows', type: 'back', equipment: 'dumbbell' },
    { name: 'Chest Press', type: 'chest', equipment: 'dumbbell' },
    { name: 'Lateral Raises', type: 'shoulders', equipment: 'dumbbell' },
    { name: 'Bicep Curls', type: 'arms', equipment: 'dumbbell' },
    { name: 'Tricep Extensions', type: 'arms', equipment: 'dumbbell' },
    { name: 'Romanian Deadlifts', type: 'legs', equipment: 'dumbbell' },
    { name: 'Incline Dumbbell Press', type: 'chest', equipment: 'dumbbell' },
    { name: 'Face Pulls', type: 'shoulders', equipment: 'band' },
  ],
  // Knee-friendly exercises (low impact)
  kneeFriendly: [
    { name: 'Seated Leg Press', type: 'legs', equipment: 'machine' },
    { name: 'Leg Extensions', type: 'legs', equipment: 'machine' },
    { name: 'Seated Hamstring Curls', type: 'legs', equipment: 'machine' },
    { name: 'Glute Bridges', type: 'legs', equipment: 'bodyweight' },
    { name: 'Step-ups', type: 'legs', equipment: 'bodyweight' },
    { name: 'Wall Sits', type: 'legs', equipment: 'bodyweight' },
    { name: 'Seated Shoulder Press', type: 'shoulders', equipment: 'dumbbell' },
    { name: 'Push-ups (Modified)', type: 'chest', equipment: 'bodyweight' },
    { name: 'Seated Rows', type: 'back', equipment: 'band' },
    { name: 'Band Pull-Aparts', type: 'shoulders', equipment: 'band' },
    { name: 'Plank', type: 'core', equipment: 'bodyweight' },
    { name: 'Bird Dog', type: 'core', equipment: 'bodyweight' },
    { name: 'Bicep Curls (Seated)', type: 'arms', equipment: 'dumbbell' },
    { name: 'Tricep Pushdowns', type: 'arms', equipment: 'band' },
    { name: 'Side Lying Leg Lifts', type: 'legs', equipment: 'bodyweight' },
  ],
};

// GET /api/clients/workouts - List all workouts (optionally filter by clientId)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workouts = readJsonFile('workouts.json');
    const clients = readJsonFile('clients.json');
    const exerciseWeights = readJsonFile('exercise-weights.json');
    
    // Check if this is an auto-generate request
    if (body.autoGenerate && body.clientId) {
      const client = clients.find((c: any) => c.id === body.clientId);
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      
      const sessionLength = body.sessionLength || client.sessionLength || 60;
      const gender = client.gender || 'female';
      const conditions = client.conditions || [];
      
      // Determine number of exercises
      const numExercises = sessionLength >= 60 ? 8 : 5;
      
      // Determine which exercise set to use
      let exerciseSet = 'fullBody';
      const conditionLower = conditions.map((c: string) => c.toLowerCase());
      
      if (conditionLower.some((c: string) => c.includes('knee') || c.includes('bad knees'))) {
        exerciseSet = 'kneeFriendly';
      } else if (conditionLower.some((c: string) => c.includes('back') || c.includes('lower back'))) {
        exerciseSet = 'kneeFriendly';
      }
      
      // Get client's previous workout for rotation
      const clientWorkouts = workouts.filter((w: any) => w.clientId === body.clientId);
      const lastWorkout = clientWorkouts.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      // Get previous exercise names to rotate
      const previousExercises = lastWorkout?.exercises?.map((e: any) => e.name) || [];
      
      // Get available exercises
      let availableExercises = [...EXERCISE_DATABASE[exerciseSet as keyof typeof EXERCISE_DATABASE]];
      
      // Rotate: prioritize exercises not in previous workout
      if (previousExercises.length > 0) {
        const notInPrevious = availableExercises.filter(
          (e: any) => !previousExercises.includes(e.name)
        );
        const inPrevious = availableExercises.filter(
          (e: any) => previousExercises.includes(e.name)
        );
        availableExercises = [...notInPrevious, ...inPrevious];
      }
      
      // Shuffle and pick exercises
      availableExercises = availableExercises.sort(() => Math.random() - 0.5);
      const selectedExercises = availableExercises.slice(0, numExercises);
      
      // Determine reps based on gender
      const reps = gender === 'female' ? '15-25' : '10-15';
      
      // Get previous weights for each exercise
      const clientExerciseWeights = exerciseWeights.filter((w: any) => w.clientId === body.clientId);
      
      // Generate exercises with weights
      const exercisesWithWeights = selectedExercises.map((ex: any) => {
        const lastWeight = clientExerciseWeights
          .filter((w: any) => w.exerciseName === ex.name)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        return {
          name: ex.name,
          type: ex.type,
          equipment: ex.equipment,
          sets: 3,
          reps: reps,
          rest: sessionLength >= 60 ? '60s' : '45s',
          weight: lastWeight?.weight || '',
          weightUnit: 'lbs',
        };
      });
      
      const newWorkout = {
        id: Date.now().toString(),
        clientId: client.id,
        date: new Date().toISOString(),
        exercises: exercisesWithWeights,
        sessionLength: sessionLength,
        notes: `Auto-generated for ${client.name}. ${exerciseSet === 'kneeFriendly' ? 'Knee-friendly exercises.' : ''}`,
        isAutoGenerated: true,
      };
      
      workouts.push(newWorkout);
      writeJsonFile('workouts.json', workouts);
      
      return NextResponse.json(newWorkout, { status: 201 });
    }
    
    // Regular workout creation
    const newWorkout = {
      ...body,
      id: Date.now().toString(),
      date: body.date || new Date().toISOString(),
    };
    
    workouts.push(newWorkout);
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json(newWorkout, { status: 201 });
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
  }
}

// PUT /api/clients/workouts - Update workout (e.g., update weights)
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
    };
    
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json(workouts[index]);
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 });
  }
}

// DELETE /api/clients/workouts - Delete workout
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Workout ID required' }, { status: 400 });
    }
    
    let workouts = readJsonFile('workouts.json');
    const initialLength = workouts.length;
    workouts = workouts.filter((w: any) => w.id !== id);
    
    if (workouts.length === initialLength) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }
    
    writeJsonFile('workouts.json', workouts);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}
