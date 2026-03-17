// Exercise library data
export interface Exercise {
  id: string;
  name: string;
  bodyRegion: 'upper' | 'lower' | 'core' | 'full';
  equipment: 'dumbbells' | 'machines' | 'bodyweight' | 'both';
  kneeFriendly: boolean;
  description?: string;
}

export const exercises: Exercise[] = [
  // Upper Body - Dumbbells
  { id: 'db-press', name: 'Dumbbell Press', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-row', name: 'Dumbbell Row', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-shoulder-press', name: 'Shoulder Press', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-lateral-raise', name: 'Lateral Raise', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-curl', name: 'Bicep Curl', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-tricep-ext', name: 'Tricep Extension', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-fly', name: 'Chest Fly', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  { id: 'db-rear-delt', name: 'Rear Delt Fly', bodyRegion: 'upper', equipment: 'dumbbells', kneeFriendly: true },
  
  // Upper Body - Machines
  { id: 'machine-press', name: 'Machine Chest Press', bodyRegion: 'upper', equipment: 'machines', kneeFriendly: true },
  { id: 'machine-row', name: 'Seated Cable Row', bodyRegion: 'upper', equipment: 'machines', kneeFriendly: true },
  { id: 'machine-fly', name: 'Pec Deck Fly', bodyRegion: 'upper', equipment: 'machines', kneeFriendly: true },
  { id: 'machine-pull-down', name: 'Lat Pulldown', bodyRegion: 'upper', equipment: 'machines', kneeFriendly: true },
  
  // Lower Body - Knee Friendly
  { id: 'leg-press', name: 'Leg Press', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  { id: 'hip-ext', name: 'Hip Extension', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  { id: 'leg-extension', name: 'Leg Extension', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  { id: 'glute-drive', name: 'Glute Drive', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  { id: 'cable-kickback', name: 'Cable Kickback', bodyRegion: 'lower', equipment: 'machines', kneeFriendly: true },
  
  // Lower Body - Not Knee Friendly (squat/deadlift variations)
  { id: 'squat', name: 'Squat', bodyRegion: 'lower', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'lunge', name: 'Lunges', bodyRegion: 'lower', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'step-up', name: 'Step Ups', bodyRegion: 'lower', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'rdl', name: 'Romanian Deadlift', bodyRegion: 'lower', equipment: 'dumbbells', kneeFriendly: false },
  
  // Core
  { id: 'plank', name: 'Plank', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: true },
  { id: 'crunch', name: 'Crunches', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: true },
  { id: 'russian-twist', name: 'Russian Twist', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: true },
  { id: 'leg-raise', name: 'Leg Raises', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'cable-crunch', name: 'Cable Crunch', bodyRegion: 'core', equipment: 'machines', kneeFriendly: true },
  { id: 'ab-wheel', name: 'Ab Wheel', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: true },
  { id: 'pallof-press', name: 'Pallof Press', bodyRegion: 'core', equipment: 'machines', kneeFriendly: true },
  { id: 'dead-bug', name: 'Dead Bug', bodyRegion: 'core', equipment: 'bodyweight', kneeFriendly: true },
  
  // Full Body
  { id: 'thruster', name: 'Thrusters', bodyRegion: 'full', equipment: 'dumbbells', kneeFriendly: false },
  { id: 'burpee', name: 'Burpees', bodyRegion: 'full', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'mountain-climber', name: 'Mountain Climbers', bodyRegion: 'full', equipment: 'bodyweight', kneeFriendly: false },
  { id: 'kettlebell-swings', name: 'Kettlebell Swings', bodyRegion: 'full', equipment: 'both', kneeFriendly: false },
  { id: 'med-ball-slams', name: 'Med Ball Slams', bodyRegion: 'full', equipment: 'both', kneeFriendly: true },
];

export function getExercisesForClient(
  sessionLength: 30 | 60,
  hasKneeIssues: boolean,
  bodyFocus?: 'upper' | 'lower' | 'core' | 'full'
): Exercise[] {
  const numExercises = sessionLength === 60 ? 10 : 6;
  
  // Filter exercises based on conditions
  let available = exercises.filter(ex => 
    hasKneeIssues ? ex.kneeFriendly : true
  );
  
  // Ensure variety across body regions
  const regions: ('upper' | 'lower' | 'core' | 'full')[] = ['upper', 'lower', 'core'];
  let selected: Exercise[] = [];
  
  // Add exercises from each region
  for (const region of regions) {
    const regionExercises = available.filter(e => 
      e.bodyRegion === region && 
      (bodyFocus ? e.bodyRegion === bodyFocus : true)
    );
    
    if (regionExercises.length > 0) {
      const shuffled = regionExercises.sort(() => Math.random() - 0.5);
      const count = Math.ceil(numExercises / 3);
      selected.push(...shuffled.slice(0, count));
    }
  }
  
  // Fill remaining slots with full body or whatever's left
  while (selected.length < numExercises) {
    const remaining = available.filter(e => !selected.includes(e));
    if (remaining.length > 0) {
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    } else {
      break;
    }
  }
  
  return selected.slice(0, numExercises);
}

export function getTargetReps(gender: 'M' | 'F'): { min: number; max: number } {
  return gender === 'F' 
    ? { min: 15, max: 25 } 
    : { min: 10, max: 15 };
}