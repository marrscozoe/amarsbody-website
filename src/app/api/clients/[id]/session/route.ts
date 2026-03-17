import { NextRequest, NextResponse } from 'next/server';
import { getClient, addSession, rotateProgram } from '@/lib/clients';

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
    
    const body = await request.json();
    const { exercises, notes } = body;
    
    if (!exercises || !Array.isArray(exercises)) {
      return NextResponse.json(
        { error: 'Exercises array is required' },
        { status: 400 }
      );
    }
    
    const session = await addSession({
      clientId: id,
      date: new Date().toISOString(),
      exercises,
      notes,
    });
    
    // Rotate exercises for next week (after completing a session)
    await rotateProgram(id);
    
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
