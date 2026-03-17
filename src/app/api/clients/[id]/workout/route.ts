import { NextRequest, NextResponse } from 'next/server';
import { getClient, updateClient, generateId } from '@/lib/clients';
import { getExercisesForClient, getTargetReps } from '@/lib/exercises';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClient(id);
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    const hasKneeIssues = client.conditions.some(c => 
      ['bad knees', 'knee pain', 'knee injury', 'knee issues'].includes(c.toLowerCase())
    );
    
    const exercises = getExercisesForClient(client.sessionLength, hasKneeIssues);
    const gender = client.gender || 'F'; // Default to female if not specified
    const reps = getTargetReps(gender);
    
    const program = {
      id: generateId(),
      weekNumber: 1,
      exercises: exercises.map(ex => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        targetReps: `${reps.min}-${reps.max}`,
      })),
      generatedAt: new Date().toISOString(),
    };
    
    await updateClient(id, { currentProgram: program });
    
    return NextResponse.json(program);
  } catch (error) {
    console.error('Error generating workout:', error);
    return NextResponse.json({ error: 'Failed to generate workout' }, { status: 500 });
  }
}
