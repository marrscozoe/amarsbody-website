export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: 'M' | 'F';
  conditions: string[];
  sessionLength: 30 | 60;
  emphasize?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
  lastWorkout?: string;
  currentProgram?: WorkoutProgram;
  lastWorkoutWeek?: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  targetReps: string;
  actualWeight?: number;
  completed?: boolean;
}

export interface WorkoutProgram {
  id: string;
  weekNumber: number;
  exercises: WorkoutExercise[];
  generatedAt: string;
}

export interface Session {
  id: string;
  clientId: string;
  date: string;
  workout?: any;
  exercises?: { name: string; weight: number; reps: string }[];
  notes?: string;
  completed?: boolean;
}
