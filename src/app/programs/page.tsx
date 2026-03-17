'use client';

import { useState, useEffect } from 'react';

// Types
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: 'M' | 'F';
  conditions: string[];
  sessionLength: 30 | 60;
  emphasize: string;
  email?: string;
  phone?: string;
  notes?: string;
  lastWorkoutWeek?: number;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  weight?: number;
}

interface Workout {
  id: string;
  clientId: string;
  type: 'full-body' | 'knee-friendly' | 'back-friendly' | 'shoulder-friendly' | 'wrist-friendly' | 'hip-friendly' | 'mobility-friendly' | 'heart-friendly' | 'emphasize';
  focusArea?: string;
  exercises: Exercise[];
  createdAt: string;
  weekNumber?: number;
}

interface Session {
  id: string;
  clientId: string;
  date: string;
  workout?: Workout;
  exercises?: { name: string; weight: number; reps: string }[];
  notes?: string;
  completed: boolean;
}

const PIN = '9855';

// Exercise pools - EXPANDED with Dallas Gym Equipment (March 17, 2026)
const EXERCISE_POOL = {
  fullBody: {
    standard: [
      { name: 'Goblet Squats', sets: 3, reps: '12', notes: 'Keep chest up, knees out' },
      { name: 'Romanian Deadlifts', sets: 3, reps: '12', notes: 'Hinge at hips, slight knee bend' },
      { name: 'Bench Press', sets: 3, reps: '10', notes: 'Lower slowly, press up powerfully' },
      { name: 'Seated Cable Row', sets: 3, reps: '12', notes: 'Squeeze shoulder blades' },
      { name: 'Overhead Press', sets: 3, reps: '10', notes: 'Core tight, no arching back' },
      { name: 'Lateral Raises', sets: 3, reps: '15', notes: 'Light weight, control the swing' },
      { name: 'Bicep Curls', sets: 2, reps: '12', notes: 'Full range of motion' },
      { name: 'Tricep Pushdowns', sets: 2, reps: '12', notes: 'Keep elbows at sides' },
      { name: 'Plank', sets: 3, reps: '30 sec', notes: 'Hold straight line' },
      { name: 'Leg Press', sets: 3, reps: '12', notes: 'Feet shoulder width' },
      { name: 'Walking Lunges', sets: 3, reps: '10 each', notes: 'Hold dumbbells' },
      { name: 'Lat Pulldown', sets: 3, reps: '12', notes: 'Pull to chest' },
      { name: 'Chest Press (Machine)', sets: 3, reps: '12', notes: 'Controlled' },
      { name: 'Face Pulls', sets: 3, reps: '15', notes: 'Rear delts and rotator cuff' },
      { name: 'Leg Curls', sets: 3, reps: '15', notes: 'Lying or seated' },
      { name: 'Hip Thrusts', sets: 3, reps: '12', notes: 'Glute focused' },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '12', notes: '30-45° angle' },
      { name: 'Dumbbell Rows', sets: 3, reps: '12 each', notes: 'One arm at a time' },
      { name: 'Shoulder Press (Machine)', sets: 3, reps: '12', notes: 'Supported back' },
      { name: 'Calf Raises', sets: 3, reps: '15-20', notes: 'Full stretch at bottom' },
      { name: 'Cable Flyes', sets: 3, reps: '15', notes: 'Squeeze at top' },
      { name: 'Hammer Curls', sets: 2, reps: '12', notes: 'Neutral grip' },
      { name: 'Overhead Tricep Extension', sets: 2, reps: '12', notes: 'Dumbbell behind head' },
      { name: 'Russian Twists', sets: 3, reps: '20', notes: 'Weighted' },
      { name: 'Leg Extensions', sets: 3, reps: '15', notes: 'Controlled' },
      { name: 'Reverse Crunches', sets: 3, reps: '15', notes: 'Lower back down' },
      { name: 'Pallof Press', sets: 3, reps: '10 each', notes: 'Anti-rotation' },
      { name: 'Pendlay Rows', sets: 3, reps: '10', notes: 'Explosive up' },
      { name: 'Dips (Assisted)', sets: 3, reps: '10', notes: 'Chest or tricep focus' },
      // NEW from Dallas Gym - Power Rack & Barbbell
      { name: 'Rack Pulls', sets: 3, reps: '10', notes: 'Partial deadlift from rack' },
      { name: 'Pin Squats', sets: 3, reps: '10', notes: 'Pause in squat rack' },
      { name: 'Safety Bar Squat', sets: 3, reps: '10', notes: 'Use safety bars' },
      { name: 'Pause Squats', sets: 3, reps: '8', notes: '2-3 sec pause at bottom' },
      { name: 'Barbell Lunges', sets: 3, reps: '10 each', notes: 'Walking or stationary' },
      { name: 'Barbell Shrugs', sets: 3, reps: '12', notes: 'Trap focus' },
      { name: 'Barbell Hip Thrusts', sets: 3, reps: '12', notes: 'Use bench' },
      { name: 'Floor Press', sets: 3, reps: '10', notes: 'Lying on floor' },
      // NEW - Olympic Lifts
      { name: 'Power Clean', sets: 3, reps: '8', notes: 'Explosive from floor' },
      { name: 'Hang Clean', sets: 3, reps: '8', notes: 'From hang position' },
      { name: 'Power Snatch', sets: 3, reps: '8', notes: 'Full body movement' },
      { name: 'Hang Snatch', sets: 3, reps: '8', notes: 'From knees' },
      { name: 'Split Jerk', sets: 3, reps: '6', notes: 'Olympic lift' },
    ],
    kneeFriendly: [
      { name: 'Hip Thrusts', sets: 3, reps: '12', notes: 'Focus on glute squeeze at top' },
      { name: 'Romanian Deadlifts', sets: 3, reps: '12', notes: 'Lighter weight, more hinge' },
      { name: 'Chest Press (Machine)', sets: 3, reps: '12', notes: 'Controlled movement' },
      { name: 'Seated Cable Row', sets: 3, reps: '12', notes: 'Squeeze shoulder blades together' },
      { name: 'Lat Pulldown', sets: 3, reps: '12', notes: 'Lean back slightly, pull to chest' },
      { name: 'Shoulder Press (Machine)', sets: 3, reps: '12', notes: 'Supported back' },
      { name: 'Lateral Raises', sets: 3, reps: '15', notes: 'Light weight only' },
      { name: 'Bicep Curls', sets: 2, reps: '12', notes: 'Full extension at bottom' },
      { name: 'Tricep Pushdowns', sets: 2, reps: '12', notes: 'Control the weight' },
      { name: 'Bird Dog', sets: 3, reps: '10 each', notes: 'Core stability, no spinal flexion' },
      { name: 'Glute Bridges', sets: 3, reps: '15', notes: 'Band optional' },
      { name: 'Leg Curls', sets: 3, reps: '15', notes: 'Seated or lying' },
      { name: 'Seated Leg Extensions', sets: 3, reps: '15', notes: 'Light weight' },
      { name: 'Step Ups', sets: 3, reps: '10 each', notes: 'Use box or bench' },
      { name: 'Cable Kickbacks', sets: 3, reps: '15 each', notes: 'Glute focused' },
      { name: 'Lateral Band Walks', sets: 3, reps: '20 steps', notes: 'Band above knees' },
      { name: 'Donkey Kicks', sets: 3, reps: '12 each', notes: 'Fire hydrant' },
      { name: 'Face Pulls', sets: 3, reps: '15', notes: 'Rear delts' },
      { name: 'Incline Lateral Raises', sets: 3, reps: '15', notes: 'Leaning forward' },
      { name: 'Preacher Curls', sets: 2, reps: '12', notes: 'Strict form' },
      { name: 'Skull Crushers', sets: 2, reps: '12', notes: 'EZ bar' },
      { name: 'Plank', sets: 3, reps: '30 sec', notes: 'Hold straight' },
      { name: 'Dead Bug', sets: 3, reps: '10 each', notes: 'Slow controlled' },
      { name: 'Pallof Press', sets: 3, reps: '10 each', notes: 'Anti-rotation' },
      { name: 'Calf Raises (Seated)', sets: 3, reps: '15', notes: 'Full range' },
      { name: 'Straight Arm Pulldown', sets: 3, reps: '12', notes: 'Lats' },
      { name: 'Cable Flyes', sets: 3, reps: '15', notes: 'Squeeze' },
      { name: 'Reverse Flyes', sets: 3, reps: '15', notes: 'Bent over' },
      { name: 'Hammer Curls', sets: 2, reps: '12', notes: 'Neutral grip' },
      // NEW - Machine & Cable (knee friendly)
      { name: 'Machine Hip Thrusts', sets: 3, reps: '12', notes: 'Glute Drive machine' },
      { name: 'Glute Kickbacks (Machine)', sets: 3, reps: '15 each', notes: 'Cable machine' },
      { name: 'Seated Hip Abduction', sets: 3, reps: '15', notes: 'Outer glutes' },
      { name: 'Seated Hip Adduction', sets: 3, reps: '15', notes: 'Inner thighs' },
      { name: 'Cable Lateral Raises', sets: 3, reps: '15', notes: 'Constant tension' },
      { name: 'Cable Face Pulls', sets: 3, reps: '15', notes: 'Rear delts' },
    ]
  },
  emphasize: {
    chest: [
      { name: 'Incline Dumbbell Press', sets: 3, reps: '12', notes: '30° incline' },
      { name: 'Chest Press (Machine)', sets: 3, reps: '12', notes: 'Controlled' },
      { name: 'Cable Flyes', sets: 3, reps: '15', notes: 'Squeeze at top' },
      { name: 'Push-Ups', sets: 3, reps: '12-15', notes: 'Full depth' },
      { name: 'Dips (Assisted)', sets: 3, reps: '10', notes: 'Forward lean' },
      { name: 'Pec Deck', sets: 3, reps: '15', notes: 'Squeeze' },
      { name: 'Plank', sets: 3, reps: '30 sec', notes: 'Core engaged' },
      { name: 'Flat Dumbbell Press', sets: 3, reps: '12', notes: 'Full range' },
      { name: 'Incline Cable Flyes', sets: 3, reps: '15', notes: 'Upper chest' },
      { name: 'Decline Press', sets: 3, reps: '12', notes: 'Machine or barbell' },
      { name: 'Landmine Press', sets: 3, reps: '12', notes: 'One arm at a time' },
      { name: 'Chest Press (Smith Machine)', sets: 3, reps: '12', notes: 'Controlled' },
      { name: 'Wide Grip Push-Ups', sets: 3, reps: '12', notes: 'More chest emphasis' },
      { name: 'Svend Press', sets: 3, reps: '12', notes: 'Holding weight plate' },
      { name: 'Incline Push-Ups', sets: 3, reps: '12', notes: 'Elevated feet' },
      { name: 'Cable Crossovers', sets: 3, reps: '15', notes: 'High to low' },
      { name: 'Dumbbell Pullover', sets: 3, reps: '12', notes: 'Chest and lats' },
      { name: 'Hex Press', sets: 3, reps: '12', notes: 'Dumbbells together' },
      { name: 'Iso Press', sets: 3, reps: '12', notes: 'One arm at a time' },
      { name: 'Speed Push-Ups', sets: 3, reps: '20', notes: 'Explosive' },
      // NEW from Dallas Gym - Cable & Machine
      { name: 'Cable Chest Press', sets: 3, reps: '12', notes: 'Standing press' },
      { name: 'Incline Cable Flyes', sets: 3, reps: '15', notes: 'Upper chest' },
      { name: 'Low-to-High Cable Flyes', sets: 3, reps: '15', notes: 'Upper chest' },
      { name: 'High-to-Low Cable Flyes', sets: 3, reps: '15', notes: 'Lower chest' },
      { name: 'Dual Cable Cross', sets: 3, reps: '15', notes: 'Both arms together' },
      { name: 'Machine Chest Press', sets: 3, reps: '12', notes: 'Guided path' },
      { name: 'Pec Deck', sets: 3, reps: '15', notes: 'Squeeze at top' },
      // NEW - Landmine & other
      { name: 'Landmine Press', sets: 3, reps: '12', notes: 'Single arm or double' },
      { name: 'Svend Press', sets: 3, reps: '12', notes: 'Plate press' },
    ],
    back: [
      { name: 'Lat Pulldown', sets: 3, reps: '12', notes: 'To chest' },
      { name: 'Seated Cable Row', sets: 3, reps: '12', notes: 'Squeeze blades' },
      { name: 'Dumbbell Rows', sets: 3, reps: '12 each', notes: 'Flat back' },
      { name: 'Face Pulls', sets: 3, reps: '15', notes: 'Rear delts' },
      { name: 'Straight Arm Pulldown', sets: 3, reps: '12', notes: 'Lats' },
      { name: 'Prone YTW', sets: 3, reps: '10 each', notes: 'Rhomboids' },
      { name: 'Plank', sets: 3, reps: '30 sec', notes: 'Core' },
      { name: 'T-Bar Rows', sets: 3, reps: '10', notes: 'Chest supported' },
      { name: 'Pendlay Rows', sets: 3, reps: '10', notes: 'Explosive up' },
      { name: 'Pull-Ups (Assisted)', sets: 3, reps: '8-10', notes: 'Full range' },
      { name: 'Chest Supported Rows', sets: 3, reps: '12', notes: 'Incline bench' },
      { name: 'Single Arm Cable Row', sets: 3, reps: '12 each', notes: 'Complete each side' },
      { name: 'Seal Rows', sets: 3, reps: '12', notes: 'Chest on bench' },
      { name: 'Meadows Rows', sets: 3, reps: '12 each', notes: 'Single arm landmine' },
      { name: 'Inverted Rows', sets: 3, reps: '12', notes: 'Bodyweight under bar' },
      { name: 'Cable Face Pulls', sets: 3, reps: '15', notes: 'Rope attachment' },
      { name: 'Batwings', sets: 3, reps: '12', notes: 'Dumbbells, bent over' },
      { name: 'Reverse Pec Deck', sets: 3, reps: '15', notes: 'Rear delts' },
      { name: 'Swiss Ball Back Extension', sets: 3, reps: '12', notes: 'Stability' },
      { name: 'Good Mornings', sets: 3, reps: '12', notes: 'Light weight' },
      // NEW from Dallas Gym - Pull-ups & Rig
      { name: 'Pull-Ups', sets: 3, reps: '8-12', notes: 'Full range of motion' },
      { name: 'Chin-Ups', sets: 3, reps: '8-12', notes: 'Underhand grip' },
      { name: 'Muscle-Ups', sets: 3, reps: '6', notes: 'Advanced' },
      { name: 'Hanging Leg Raises', sets: 3, reps: '12', notes: 'From pull-up bar' },
      { name: 'Toes-to-Bar', sets: 3, reps: '12', notes: 'Core and grip' },
      { name: 'Knee Tucks', sets: 3, reps: '12', notes: 'From pull-up bar' },
      // NEW - Ring Exercises
      { name: 'Ring Dips', sets: 3, reps: '10', notes: 'Turn rings out' },
      { name: 'Ring Rows', sets: 3, reps: '12', notes: 'Feet on floor' },
      { name: 'Ring Push-Ups', sets: 3, reps: '12', notes: 'Advanced push-up' },
      // NEW - Landmine
      { name: 'Landmine Rows', sets: 3, reps: '12', notes: 'Single arm' },
      { name: 'Meadows Rows', sets: 3, reps: '12 each', notes: 'Landmine single arm' },
    ],
    shoulders: [
      { name: 'Overhead Press', sets: 3, reps: '10', notes: 'Full range' },
      { name: 'Lateral Raises', sets: 3, reps: '15', notes: 'Light weight' },
      { name: 'Front Raises', sets: 3, reps: '12', notes: 'Alternating' },
      { name: 'Rear Delt Flyes', sets: 3, reps: '15', notes: 'Bent over' },
      { name: 'Arnold Press', sets: 3, reps: '10', notes: 'Controlled' },
      { name: 'Upright Rows', sets: 3, reps: '12', notes: 'Light' },
      { name: 'Face Pulls', sets: 3, reps: '15', notes: 'Rear delts' },
      { name: 'Seated Dumbbell Press', sets: 3, reps: '12', notes: 'Back supported' },
      { name: 'Machine Shoulder Press', sets: 3, reps: '12', notes: 'Controlled' },
      { name: 'Incline Lateral Raises', sets: 3, reps: '15', notes: 'Leaning forward' },
      { name: 'Cable Lateral Raises', sets: 3, reps: '15', notes: 'Constant tension' },
      { name: 'Reverse Cable Flyes', sets: 3, reps: '15', notes: 'Cable behind' },
      { name: 'Leaning Lateral Raises', sets: 3, reps: '15', notes: 'Lean to side' },
      { name: ' Cuban Press', sets: 3, reps: '12', notes: 'Rotation + press' },
      { name: 'Landmine Press', sets: 3, reps: '12', notes: 'One arm at a time' },
      { name: 'Machine Rear Delt', sets: 3, reps: '15', notes: 'Face chest pad' },
      { name: 'Smith Machine Press', sets: 3, reps: '12', notes: 'Stable' },
      { name: 'Z Press', sets: 3, reps: '10', notes: 'Seated on floor' },
      { name: 'Lying Rear Delt Raise', sets: 3, reps: '15', notes: 'Chest on incline' },
      { name: 'Seated Bent Over Raise', sets: 3, reps: '15', notes: 'Dumbbells' },
      // NEW from Dallas Gym
      { name: 'Cable Front Raises', sets: 3, reps: '15', notes: 'Constant tension' },
      { name: 'Cable Lateral Raises', sets: 3, reps: '15', notes: 'Side delts' },
      { name: 'Cable Overhead Press', sets: 3, reps: '10', notes: 'Standing' },
      { name: 'Machine Shoulder Press', sets: 3, reps: '12', notes: 'Seated' },
      { name: 'Cable Upright Rows', sets: 3, reps: '12', notes: 'Cable machine' },
      { name: 'Cable Face Pulls', sets: 3, reps: '15', notes: 'Rear delts' },
      { name: 'Rotator Cuff Internal Rotation', sets: 3, reps: '15', notes: 'Light band' },
      { name: 'Rotator Cuff External Rotation', sets: 3, reps: '15', notes: 'Light band' },
    ],
    biceps: [
      { name: 'Barbell Curls', sets: 3, reps: '12', notes: 'Full range' },
      { name: 'Dumbbell Curls', sets: 3, reps: '12', notes: 'Supinate wrist' },
      { name: 'Hammer Curls', sets: 3, reps: '12', notes: 'Neutral grip' },
      { name: 'Preacher Curls', sets: 3, reps: '12', notes: 'Strict form' },
      { name: 'Cable Curls', sets: 3, reps: '15', notes: 'Constant tension' },
      { name: 'Incline Dumbbell Curls', sets: 3, reps: '12', notes: 'Stretch at bottom' },
      { name: 'Concentration Curls', sets: 3, reps: '12 each', notes: 'One arm at a time' },
      { name: '21s (Barbell)', sets: 3, reps: '21', notes: '7 lower, 7 upper, 7 full' },
      { name: 'Cross Body Curls', sets: 3, reps: '12 each', notes: 'Across body' },
      { name: 'Machine Curls', sets: 3, reps: '15', notes: 'Controlled' },
      { name: 'Drag Curls', sets: 3, reps: '12', notes: 'Pull up body' },
      { name: 'High Curls', sets: 3, reps: '12', notes: 'Elbows back' },
      { name: 'EZ Bar Curls', sets: 3, reps: '12', notes: 'Easier on wrists' },
      { name: 'Reverse Curls', sets: 3, reps: '12', notes: 'Overhand grip' },
      { name: 'Plate Curls', sets: 3, reps: '12', notes: 'Using weight plates' },
      { name: 'Spider Curls', sets: 3, reps: '12', notes: 'Chest on bench' },
      { name: 'Cable Hammer Curls', sets: 3, reps: '15', notes: 'Rope attachment' },
      { name: 'Cheat Curls', sets: 3, reps: '10', notes: 'Slight swing' },
      { name: 'Iso Lat Curls', sets: 3, reps: '12', notes: 'Single arm cable' },
      { name: 'Zottman Curls', sets: 3, reps: '12', notes: 'Rotate grip' },
      // NEW from Dallas Gym - Cable
      { name: 'Cable Hammer Curls', sets: 3, reps: '15', notes: 'Rope attachment' },
      { name: 'Cable Concentration Curls', sets: 3, reps: '15', notes: 'Single arm' },
      { name: 'Cable 21s', sets: 3, reps: '21', notes: 'Partial reps' },
      { name: 'Single Arm Cable Curl', sets: 3, reps: '12 each', notes: 'Iso lat curl' },
      // NEW - Kettlebell
      { name: 'Kettlebell Curls', sets: 3, reps: '12', notes: 'KB handle' },
    ],
    triceps: [
      { name: 'Tricep Pushdowns', sets: 3, reps: '12', notes: 'Straight bar' },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '12', notes: 'Dumbbell' },
      { name: 'Skull Crushers', sets: 3, reps: '12', notes: 'EZ bar' },
      { name: 'Dips (Assisted)', sets: 3, reps: '10', notes: 'Upright' },
      { name: 'Close Grip Bench', sets: 3, reps: '10', notes: 'Light' },
      { name: 'Tricep Kickbacks', sets: 3, reps: '12', notes: 'Cable' },
      { name: 'Rope Pushdowns', sets: 3, reps: '15', notes: 'Spread rope at bottom' },
      { name: 'Overhead Rope Extension', sets: 3, reps: '12', notes: 'Both hands' },
      { name: 'Diamond Push-Ups', sets: 3, reps: '12', notes: 'Hands together' },
      { name: 'Bench Dips', sets: 3, reps: '12', notes: 'Behind back on bench' },
      { name: 'Cable Overhead Extension', sets: 3, reps: '12', notes: 'Single arm' },
      { name: 'JM Press', sets: 3, reps: '10', notes: 'Hybrid press/extension' },
      { name: ' Tate Press', sets: 3, reps: '12', notes: 'Dumbbells together' },
      { name: 'Reverse Grip Pushdowns', sets: 3, reps: '12', notes: 'Underhand' },
      { name: 'Weighted Dips', sets: 3, reps: '10', notes: 'Belt or dumbbell' },
      { name: 'Tricep Press Machine', sets: 3, reps: '15', notes: 'Guided movement' },
      { name: 'Close Grip Push-Ups', sets: 3, reps: '12', notes: 'Bodyweight' },
      { name: 'Rolling Tricep Extension', sets: 3, reps: '12', notes: 'EZ bar rolling' },
      { name: 'Behind Head Extension', sets: 3, reps: '12', notes: 'Dumbbell behind head' },
      { name: 'Cable Kickbacks', sets: 3, reps: '15', notes: 'Single arm' },
      // NEW from Dallas Gym - Cable & Machine
      { name: 'Tricep Rope Pushdowns', sets: 3, reps: '15', notes: 'Spread rope at bottom' },
      { name: 'Overhead Rope Extension', sets: 3, reps: '12', notes: 'Face away from machine' },
      { name: 'Single Arm Tricep Extension', sets: 3, reps: '12 each', notes: 'Cable overhead' },
      { name: 'Tricep Press Machine', sets: 3, reps: '15', notes: 'Guided machine' },
      { name: 'Weighted Dips', sets: 3, reps: '10', notes: 'Belt or dumbbell' },
      // NEW - Ring & Landmine
      { name: 'Ring Dips', sets: 3, reps: '10', notes: 'Turn rings out' },
      { name: 'JM Press', sets: 3, reps: '10', notes: 'Hybrid press/extension' },
    ],
    glutes: [
      { name: 'Hip Thrusts', sets: 4, reps: '12', notes: 'Glute squeeze' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10 each', notes: 'Use rack' },
      { name: 'Step Ups', sets: 3, reps: '12 each', notes: 'Drive through heel' },
      { name: 'Cable Kickbacks', sets: 3, reps: '15 each', notes: 'Squeeze at top' },
      { name: 'Glute Bridges', sets: 3, reps: '15', notes: 'Band around knees' },
      { name: 'Lateral Band Walks', sets: 3, reps: '20 steps', notes: 'Band above knees' },
      { name: 'Donkey Kicks', sets: 3, reps: '12 each', notes: 'Fire hydrant' },
      { name: 'Sumo Deadlifts', sets: 3, reps: '10', notes: 'Wide stance' },
      { name: 'Single Leg Hip Thrusts', sets: 3, reps: '12 each', notes: 'One leg at a time' },
      { name: 'Reverse Lunges', sets: 3, reps: '10 each', notes: 'Glute focused' },
      { name: 'Glute Ham Raise', sets: 3, reps: '10', notes: 'Use machine' },
      { name: 'Cable Pull Throughs', sets: 3, reps: '15', notes: 'Hinge at hips' },
      { name: 'Quadruped Hip Extension', sets: 3, reps: '12 each', notes: 'Knees bent 90°' },
      { name: 'Sumo Squats', sets: 3, reps: '12', notes: 'Wide stance' },
      { name: 'Monster Walks', sets: 3, reps: '20 steps', notes: 'Band at ankles' },
      { name: 'Clamshells', sets: 3, reps: '15 each', notes: 'Band above knees' },
      { name: 'Frog Pumps', sets: 3, reps: '15', notes: 'Heels together' },
      { name: 'Hip Circles', sets: 3, reps: '10 each', notes: 'Standing' },
      { name: 'Kurtosis Squats', sets: 3, reps: '12', notes: 'Wide stance, heels up' },
      { name: 'Reverse Hypers', sets: 3, reps: '15', notes: 'Machine or bench' },
      // NEW from Dallas Gym - Belt Squat & GHD
      { name: 'Belt Squats', sets: 3, reps: '12', notes: 'Use belt squat machine' },
      { name: 'Weighted Marches', sets: 3, reps: '20 steps', notes: 'Belt attach to weight' },
      { name: 'Glute Ham Raise (GHR)', sets: 3, reps: '10', notes: 'Use GHD machine' },
      { name: 'Hip Extensions', sets: 3, reps: '15', notes: 'GHD machine' },
      { name: 'Back Extensions', sets: 3, reps: '15', notes: 'GHD machine' },
      { name: 'GHD Sit-Ups', sets: 3, reps: '15', notes: 'Advanced core' },
      { name: 'GHD Side Bends', sets: 3, reps: '15 each', notes: 'Obliques' },
      { name: 'Isometric Holds', sets: 3, reps: '30 sec', notes: 'GHD horizontal hold' },
      // NEW - Machine
      { name: 'Machine Hip Thrusts', sets: 3, reps: '12', notes: 'Glute Drive machine' },
      { name: 'Glute Kickbacks (Machine)', sets: 3, reps: '15 each', notes: 'Cable machine' },
      // NEW - Prowler
      { name: 'Prowler Pushes', sets: 3, reps: '40 ft', notes: 'Heavy or light' },
      { name: 'Prowler Sled Pulls', sets: 3, reps: '40 ft', notes: 'Rope or harness' },
    ],
    quads: [
      { name: 'Leg Extensions', sets: 3, reps: '15', notes: 'Controlled' },
      { name: 'Goblet Squats', sets: 3, reps: '12', notes: 'Keep chest up' },
      { name: 'Leg Press', sets: 3, reps: '12', notes: 'Feet shoulder width' },
      { name: 'Hack Squats', sets: 3, reps: '12', notes: 'Machine' },
      { name: 'Front Squats', sets: 3, reps: '10', notes: 'Cross arms' },
      { name: 'Lunges', sets: 3, reps: '10 each', notes: 'Walking' },
      { name: 'Sissy Squats', sets: 3, reps: '12', notes: 'Hold support' },
      { name: ' Bulgarian Split Squats', sets: 3, reps: '10 each', notes: 'Elevated back foot' },
      { name: 'Step Ups', sets: 3, reps: '12 each', notes: 'Box or bench' },
      { name: 'Pendulum Squats', sets: 3, reps: '12', notes: 'Machine' },
      { name: 'Leg Press (Narrow)', sets: 3, reps: '12', notes: 'Feet higher on platform' },
      { name: 'Reverse Lunges', sets: 3, reps: '10 each', notes: 'Drop back' },
      { name: 'Goblet Split Squats', sets: 3, reps: '10 each', notes: 'One foot forward' },
      { name: 'Atlas Stone', sets: 3, reps: '8', notes: 'Hold at hip' },
      { name: 'Wall Sit', sets: 3, reps: '45 sec', notes: 'Hold position' },
      { name: 'Seated Leg Press', sets: 3, reps: '12', notes: 'Machine' },
      { name: 'Narrow Stance Squats', sets: 3, reps: '12', notes: 'Feet together' },
      { name: 'Helms Squats', sets: 3, reps: '12', notes: 'Dumbbells at sides' },
      { name: 'Quad Extensions', sets: 3, reps: '15', notes: 'Single leg' },
      { name: 'Walking Lunges', sets: 3, reps: '10 each', notes: 'Dumbbells' },
      // NEW from Dallas Gym - Leg Press Variations
      { name: 'High Foot Leg Press', sets: 3, reps: '12', notes: 'Feet high on platform' },
      { name: 'Low Foot Leg Press', sets: 3, reps: '12', notes: 'Feet low on platform' },
      { name: 'Wide Stance Leg Press', sets: 3, reps: '12', notes: 'Adductor focus' },
      { name: 'Narrow Stance Leg Press', sets: 3, reps: '12', notes: 'Quad focus' },
      { name: 'Single Leg Press', sets: 3, reps: '12 each', notes: 'One leg at a time' },
      { name: 'Calf Press on Leg Press', sets: 3, reps: '15', notes: 'Balls of feet on edge' },
      // NEW - Belt Squat & Box
      { name: 'Belt Squats', sets: 3, reps: '12', notes: 'Less spine load' },
      { name: 'Box Squats', sets: 3, reps: '10', notes: 'Pause on box' },
      { name: 'Box Jumps', sets: 3, reps: '10', notes: 'Explosive' },
      { name: 'Lateral Step-Ups', sets: 3, reps: '12 each', notes: 'Step to side' },
      // NEW - Kettlebell
      { name: 'Goblet Squats', sets: 3, reps: '12', notes: 'Hold KB at chest' },
      { name: 'Sumo Squats', sets: 3, reps: '12', notes: 'Wide stance' },
    ],
    hamstrings: [
      { name: 'Romanian Deadlifts', sets: 3, reps: '12', notes: 'Hinge' },
      { name: 'Leg Curls', sets: 3, reps: '15', notes: 'Lying down' },
      { name: 'Seated Leg Curls', sets: 3, reps: '15', notes: 'Fixed' },
      { name: 'Stiff Leg Deadlifts', sets: 3, reps: '12', notes: 'Light' },
      { name: 'Glute Ham Raise', sets: 3, reps: '10', notes: 'Use machine' },
      { name: 'Nordic Curls', sets: 3, reps: '8', notes: 'Assisted' },
      { name: 'Good Mornings', sets: 3, reps: '12', notes: 'Light' },
      { name: 'Single Leg RDL', sets: 3, reps: '10 each', notes: 'Dumbbell' },
      { name: 'Leg Curl (Single Leg)', sets: 3, reps: '12 each', notes: 'One at a time' },
      { name: 'Cable Pull Throughs', sets: 3, reps: '15', notes: 'Hinge at hips' },
      { name: 'Reverse Hypers', sets: 3, reps: '15', notes: 'Face down on bench' },
      { name: 'Ball Leg Curls', sets: 3, reps: '12', notes: 'Stability ball' },
      { name: 'Snatch Grip RDL', sets: 3, reps: '12', notes: 'Wide grip' },
      { name: 'Deficit RDL', sets: 3, reps: '10', notes: 'Elevated feet' },
      { name: 'Kettlebell Swing', sets: 3, reps: '15', notes: 'Hinge pattern' },
      { name: 'Cable Kickbacks', sets: 3, reps: '15 each', notes: 'Straight leg' },
      { name: 'Hip Extension Machine', sets: 3, reps: '15', notes: 'Glute ham' },
      { name: 'Walking Leg Curls', sets: 3, reps: '15 each', notes: 'Lying machine' },
      // NEW from Dallas Gym - GHD & Machine
      { name: 'Glute Ham Raise', sets: 3, reps: '10', notes: 'Use GHD machine' },
      { name: 'Hip Extensions', sets: 3, reps: '15', notes: 'GHD machine' },
      { name: 'Prone Leg Curls', sets: 3, reps: '15', notes: 'Lying curl machine' },
      { name: 'Seated Leg Curls', sets: 3, reps: '15', notes: 'Seated machine' },
      { name: 'Single Leg Curls', sets: 3, reps: '12 each', notes: 'One at a time' },
      // NEW - Cable
      { name: 'Cable Pull Throughs', sets: 3, reps: '15', notes: 'Hinge at hips' },
      { name: 'Cable Kickbacks', sets: 3, reps: '15 each', notes: 'Straight leg' },
      // NEW - Kettlebell
      { name: 'Kettlebell Swing', sets: 3, reps: '15', notes: 'Hinge pattern' },
      { name: 'Single Arm KB Snatch', sets: 3, reps: '10 each', notes: 'Explosive' },
    ],
    core: [
      { name: 'Plank', sets: 3, reps: '45 sec', notes: 'Hold straight' },
      { name: 'Crunches', sets: 3, reps: '20', notes: 'Feet up' },
      { name: 'Leg Raises', sets: 3, reps: '15', notes: 'Hanging or lying' },
      { name: 'Russian Twists', sets: 3, reps: '20', notes: 'Weighted' },
      { name: 'Mountain Climbers', sets: 3, reps: '20 each', notes: 'Fast' },
      { name: 'Dead Bug', sets: 3, reps: '10 each', notes: 'Slow' },
      { name: 'Pallof Press', sets: 3, reps: '10 each', notes: 'Anti-rotation' },
      { name: 'Ab Wheel', sets: 3, reps: '10', notes: 'Controlled' },
      { name: 'Hanging Leg Raises', sets: 3, reps: '12', notes: 'From pull-up bar' },
      { name: 'Cable Crunches', sets: 3, reps: '20', notes: 'Kneeling' },
      { name: 'Reverse Crunches', sets: 3, reps: '15', notes: 'Lower back down' },
      { name: 'Bicycle Crunches', sets: 3, reps: '20 each', notes: 'Elbow to knee' },
      { name: 'Flutter Kicks', sets: 3, reps: '30 sec', notes: 'Fast' },
      { name: 'Scissor Kicks', sets: 3, reps: '30 sec', notes: 'Alternate legs' },
      { name: 'Toe Touches', sets: 3, reps: '20', notes: 'Lying down, reach up' },
      { name: 'V-Ups', sets: 3, reps: '15', notes: 'Touch toes at top' },
      { name: 'Side Plank', sets: 3, reps: '30 sec each', notes: 'Hold straight' },
      { name: 'Bird Dog', sets: 3, reps: '10 each', notes: 'Core stability' },
      { name: 'Superman', sets: 3, reps: '15', notes: 'Lying face down' },
      { name: 'Rainbow Crunches', sets: 3, reps: '15 each', notes: 'Side to side' },
      { name: 'Plank with Leg Lift', sets: 3, reps: '10 each', notes: 'Alternate legs' },
      { name: 'T-Spine Rotation', sets: 3, reps: '10 each', notes: 'On all fours' },
      { name: 'Antepulsion', sets: 3, reps: '15', notes: 'Cable woodchop' },
      { name: 'Reverse Plank', sets: 3, reps: '30 sec', notes: 'Face up' },
      { name: 'Hollow Body Hold', sets: 3, reps: '30 sec', notes: 'Lying on back' },
      // NEW from Dallas Gym - Cable & Stability Ball
      { name: 'Cable Woodchops', sets: 3, reps: '15 each', notes: 'High to low' },
      { name: 'Cable Reverse Woodchops', sets: 3, reps: '15 each', notes: 'Low to high' },
      { name: 'Pallof Press', sets: 3, reps: '10 each', notes: 'Anti-rotation' },
      { name: 'Pallof Press with Rotation', sets: 3, reps: '10 each', notes: 'Add rotation' },
      { name: 'Kneeling Cable Crunches', sets: 3, reps: '20', notes: 'Kneeling at cable' },
      { name: 'Standing Cable Rotation', sets: 3, reps: '15 each', notes: 'Core stability' },
      { name: 'Stability Ball Crunches', sets: 3, reps: '20', notes: 'Ball under back' },
      { name: 'Stability Ball Plank', sets: 3, reps: '45 sec', notes: 'Elbows on ball' },
      { name: 'Stability Ball Hamstring Curls', sets: 3, reps: '12', notes: 'Heels on ball' },
      { name: 'Stability Ball Passes', sets: 3, reps: '12', notes: 'Pass ball overhead' },
      { name: 'Stability Ball Stir the Pot', sets: 3, reps: '12', notes: 'Circular motion' },
      { name: 'Stability Ball Pike', sets: 3, reps: '12', notes: 'Feet on ball' },
      // NEW - Medicine Ball
      { name: 'Medicine Ball Slams', sets: 3, reps: '15', notes: 'Explosive down' },
      { name: 'Wall Balls', sets: 3, reps: '15', notes: 'Squat and throw up' },
      { name: 'Russian Twists (Medicine Ball)', sets: 3, reps: '20', notes: 'Weighted rotation' },
      // NEW - Landmine
      { name: 'Landmine Rotations', sets: 3, reps: '15 each', notes: 'Core anti-rotation' },
      // NEW - Battle Ropes
      { name: 'Battle Rope Slams', sets: 3, reps: '30 sec', notes: 'Alternating arms' },
      { name: 'Battle Rope Waves', sets: 3, reps: '30 sec', notes: 'Side to side' },
    ]
  }
};

const CONDITIONS = [
  'Bad knees',
  'Bad back',
  'Shoulder issues',
  'Wrist issues',
  'Hip tightness',
  'Limited mobility',
  'Heart condition',
  'High blood pressure',
  'Recovery from injury'
];

const EMPHASIZE_OPTIONS = [
  { value: '', label: 'No emphasis (full body)' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'core', label: 'Core' },
];

export default function ProgramsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'clients' | 'workout' | 'history'>('clients');
  
  // Workout generation state
  const [generatedWorkout, setGeneratedWorkout] = useState<Workout | null>(null);
  const [workoutWeights, setWorkoutWeights] = useState<{ [key: string]: number }>({});
  const [showWorkoutActive, setShowWorkoutActive] = useState(false);
  const [shuffleWorkout, setShuffleWorkout] = useState(false);
  const [quickEmphasize, setQuickEmphasize] = useState('');
  
  // New client form
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'F' as 'M' | 'F',
    conditions: [] as string[],
    sessionLength: 60 as 30 | 60,
    emphasize: '',
    email: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Persist selectedClient to localStorage (only save if we have a valid client with id)
  useEffect(() => {
    if (selectedClient && selectedClient.id) {
      localStorage.setItem('selectedClient', JSON.stringify(selectedClient));
      console.log('Saved selectedClient to localStorage:', selectedClient.firstName, selectedClient.lastName);
    }
  }, [selectedClient]);

  // Load selectedClient from localStorage on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const saved = localStorage.getItem('selectedClient');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            setSelectedClient(parsed);
            console.log('Loaded selectedClient from localStorage:', parsed.firstName, parsed.lastName);
          }
        } catch (e) {
          console.error('Failed to parse saved client:', e);
        }
      }
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [clientsRes, sessionsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/sessions')
      ]);
      const clientsData = await clientsRes.json();
      const sessionsData = await sessionsRes.json();
      setClients(clientsData);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
  };

  const getRepsForClient = (client: Client): string => {
    // Reps: 15-25 for women, 10-15 for men
    if (client.gender === 'M') {
      return '10-15';
    }
    return '15-25';
  };

  const hasBadKnees = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('knee'));
  };
  
  const hasBadBack = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('back'));
  };
  
  const hasShoulderIssues = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('shoulder'));
  };
  
  const hasWristIssues = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('wrist'));
  };
  
  const hasHipTightness = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('hip'));
  };
  
  const hasLimitedMobility = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('mobility'));
  };
  
  const hasHeartCondition = (conditions: string[]): boolean => {
    return conditions.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('blood pressure') || c.toLowerCase().includes('blood pressure'));
  };

  // Filter functions for conditions
  const filterForBackIssues = (exercises: Exercise[]): Exercise[] => {
    const avoid = ['squat', 'deadlift', 'heavy', 'barbell', 'bending', 'bent', 'good morning', 'reverse crunch', 'sit-up', 'crunch', 'upright row', 'bench press', 'lunge', 'walking lunge'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      return !avoid.some(bad => name.includes(bad)) && !ex.notes?.toLowerCase().includes('heavy');
    });
  };

  const filterForShoulderIssues = (exercises: Exercise[]): Exercise[] => {
    const avoid = ['overhead press', 'military press', 'upright row', 'lateral raise', 'front raise', 'arnold', 'dips', 'pull-up', 'pullup', 'chin-up', 'chinup', 'bench press', 'lat pulldown', 'seated row'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      return !avoid.some(bad => name.includes(bad));
    });
  };

  const filterForWristIssues = (exercises: Exercise[]): Exercise[] => {
    const avoid = ['push-up', 'pushup', 'plank', 'dip', 'handstand', 'wrist'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      return !avoid.some(bad => name.includes(bad));
    });
  };

  const filterForHipTightness = (exercises: Exercise[]): Exercise[] => {
    const avoid = ['squat', 'lunge', 'hip thrust', 'bridge', 'good morning', 'rdl', 'romanian', 'deadlift'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      return !avoid.some(bad => name.includes(bad));
    });
  };

  const filterForMobility = (exercises: Exercise[]): Exercise[] => {
    // Prefer machine exercises, seated, or supported movements
    const prefer = ['machine', 'seated', 'cable', 'leg curl', 'leg extension', 'chest press', 'lat pulldown', 'row', 'fly', 'curl', 'pushdown', 'extension'];
    const avoid = ['squat', 'lunge', 'deadlift', 'pull-up', 'pullup', 'dip', 'plank', 'burpee'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      return !avoid.some(bad => name.includes(bad));
    });
  };

  const filterForHeartConditions = (exercises: Exercise[]): Exercise[] => {
    // Low intensity - avoid explosive movements, heavy weights, extended holds
    const avoid = ['explosive', 'plyometric', 'plyo', 'box jump', 'burpee', 'sprint', 'heavy', 'nordic', 'isometric hold', '30 sec', '45 sec', '60 sec'];
    return exercises.filter(ex => {
      const name = ex.name.toLowerCase();
      const notes = (ex.notes || '').toLowerCase();
      return !avoid.some(bad => name.includes(bad) || notes.includes(bad));
    });
  };

  const rotateArray = <T,>(arr: T[], times: number): T[] => {
    const result = [...arr];
    for (let i = 0; i < times; i++) {
      result.unshift(result.pop()!);
    }
    return result;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const generateWorkout = (client: Client) => {
    try {
      const weekNum = getWeekNumber(new Date());
      const reps = getRepsForClient(client);
      let exercises: Exercise[] = [];
      let type: 'full-body' | 'knee-friendly' | 'back-friendly' | 'shoulder-friendly' | 'wrist-friendly' | 'hip-friendly' | 'mobility-friendly' | 'heart-friendly' | 'emphasize' = 'full-body';

      // Determine conditions
      const useKneeFriendly = hasBadKnees(client.conditions);
      const useBackFriendly = hasBadBack(client.conditions);
      const useShoulderFriendly = hasShoulderIssues(client.conditions);
      const useWristFriendly = hasWristIssues(client.conditions);
      const useHipFriendly = hasHipTightness(client.conditions);
      const useMobilityFriendly = hasLimitedMobility(client.conditions);
      const useHeartFriendly = hasHeartCondition(client.conditions);

      // Determine number of exercises based on session length
      const numExercises = client.sessionLength === 60 ? 10 : 7;
      
      // Get last workout from this client's history (sorted by most recent)
      const clientSessions = (sessions?.filter(s => s.clientId === client.id) || [])
        .sort((a, b) => {
          const dateA = new Date(a.workout?.createdAt || a.date).getTime();
          const dateB = new Date(b.workout?.createdAt || b.date).getTime();
          return dateB - dateA;
        });
      const lastWorkout = clientSessions.length > 0 ? clientSessions[0] : null;
      const lastExerciseNames = lastWorkout?.exercises?.map((e: any) => e.name) || [];
      
      // Check if conditions or focus changed - if so, generate fresh workout
      const lastWorkoutType = lastWorkout?.workout?.type || '';
      const lastWorkoutFocus = lastWorkout?.workout?.focusArea || '';
      // Use quickEmphasize if set, otherwise use client's default
      const effectiveEmphasize = quickEmphasize || client.emphasize || '';
      const currentFocus = effectiveEmphasize;
      
      // Check if any condition changed
      const conditionsChanged = 
        useKneeFriendly !== (lastWorkoutType === 'knee-friendly') ||
        useBackFriendly !== (lastWorkoutType === 'back-friendly') ||
        useShoulderFriendly !== (lastWorkoutType === 'shoulder-friendly') ||
        useWristFriendly !== (lastWorkoutType === 'wrist-friendly') ||
        useHipFriendly !== (lastWorkoutType === 'hip-friendly') ||
        useMobilityFriendly !== (lastWorkoutType === 'mobility-friendly') ||
        useHeartFriendly !== (lastWorkoutType === 'heart-friendly');
      const focusChanged = currentFocus !== lastWorkoutFocus;
      const shouldUseHistory = lastWorkout && !conditionsChanged && !focusChanged;
      
      // Determine exercise pools - apply conditions in order of priority
      let pool: Exercise[] = [];
      if (effectiveEmphasize && effectiveEmphasize !== '') {
        type = 'emphasize';
        pool = ((EXERCISE_POOL as any).emphasize[effectiveEmphasize] || []) as Exercise[];
      } else if (useHeartFriendly) {
        // Heart conditions - low intensity, controlled movements
        type = 'heart-friendly';
        pool = filterForHeartConditions(EXERCISE_POOL.fullBody.standard);
      } else if (useWristFriendly) {
        // Wrist issues - avoid putting weight on wrists
        type = 'wrist-friendly';
        pool = filterForWristIssues(EXERCISE_POOL.fullBody.standard);
      } else if (useShoulderFriendly) {
        // Shoulder issues - avoid overhead pressing
        type = 'shoulder-friendly';
        pool = filterForShoulderIssues(EXERCISE_POOL.fullBody.standard);
      } else if (useBackFriendly) {
        // Back issues - avoid heavy spinal loading
        type = 'back-friendly';
        pool = filterForBackIssues(EXERCISE_POOL.fullBody.standard);
      } else if (useHipFriendly) {
        // Hip tightness - avoid deep hip flexion
        type = 'hip-friendly';
        pool = filterForHipTightness(EXERCISE_POOL.fullBody.standard);
      } else if (useMobilityFriendly) {
        // Limited mobility - seated machine exercises
        type = 'mobility-friendly';
        pool = filterForMobility(EXERCISE_POOL.fullBody.standard);
      } else if (useKneeFriendly) {
        type = 'knee-friendly';
        pool = EXERCISE_POOL.fullBody.kneeFriendly;
      } else {
        type = 'full-body';
        pool = EXERCISE_POOL.fullBody.standard;
      }

      // If no history, no exercises, pool small, or conditions/focus changed → generate fresh
      // Otherwise use history rotation (keep 7, replace 3)
      if (!shouldUseHistory || lastExerciseNames.length === 0 || pool.length < numExercises) {
        exercises = shuffleWorkout
          ? shuffleArray([...pool]).slice(0, numExercises).map(ex => ({ ...ex, reps }))
          : [...pool].slice(0, numExercises).map(ex => ({ ...ex, reps }));
      } else {
        // Filter out exercises from last workout to get new ones
        const newExercises = pool.filter(e => !lastExerciseNames.includes(e.name));
        
        // If no new exercises left (all exercises from pool already used),
        // wrap around and pick random exercises from entire pool
        let newFromPool;
        if (newExercises.length === 0) {
          newFromPool = shuffleArray([...pool]).slice(0, 3).map(ex => ({ ...ex, reps }));
        } else {
          newFromPool = newExercises.slice(0, 3).map(ex => ({ ...ex, reps }));
        }
        
        // Build workout: keep some from last workout + add new ones
        // For 10 exercises: keep 7, replace 3 with new
        // For 7 exercises: keep 4, replace 3 with new
        const keepCount = numExercises - 3;
        // Find the kept exercises from last workout
        const keepFromLast = lastExerciseNames.slice(0, keepCount).map(name => {
          const existingEx = lastWorkout?.exercises?.find((e: any) => e.name === name);
          return { name, sets: (existingEx as any)?.sets || 3, reps: existingEx?.reps || reps, notes: (existingEx as any)?.notes || '' };
        });
        
        // Combine - shuffle only if shuffle is enabled
        exercises = shuffleWorkout 
          ? shuffleArray([...keepFromLast, ...newFromPool])
          : [...keepFromLast, ...newFromPool];
      }

    const workout: Workout = {
      id: Date.now().toString(),
      clientId: client.id,
      type,
      focusArea: effectiveEmphasize || undefined,
      exercises,
      createdAt: new Date().toString(),
      weekNumber: weekNum
    };

    setGeneratedWorkout(workout);
    setWorkoutWeights({});
    setShowWorkoutActive(true);
    } catch (error) {
      console.error('Error generating workout:', error);
    }
  };

  const handlePinSubmit = () => {
    if (enteredPin === PIN) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect PIN');
      setEnteredPin('');
    }
  };

  const handleAddClient = async () => {
    if (!newClient.firstName || !newClient.lastName) {
      alert('Please enter at least first and last name');
      return;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newClient.firstName,
          lastName: newClient.lastName,
          age: newClient.age ? parseInt(newClient.age) : undefined,
          gender: newClient.gender,
          conditions: newClient.conditions,
          sessionLength: newClient.sessionLength,
          emphasize: newClient.emphasize,
          email: newClient.email,
          phone: newClient.phone,
          notes: newClient.notes
        })
      });
      const added = await res.json();
      setClients([...clients, added]);
      setNewClient({
        firstName: '',
        lastName: '',
        age: '',
        gender: 'F',
        conditions: [],
        sessionLength: 60,
        emphasize: '',
        email: '',
        phone: '',
        notes: ''
      });
      setShowAddClient(false);
    } catch (err) {
      console.error('Failed to add client:', err);
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      });
      setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
      setEditingClient(null);
    } catch (err) {
      console.error('Failed to update client:', err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      setClients(clients.filter(c => c.id !== id));
      if (selectedClient?.id === id) {
        setSelectedClient(null);
        localStorage.removeItem('selectedClient');
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  const handleCompleteSession = async () => {
    if (!generatedWorkout || !selectedClient) return;

    const exercisesWithWeights = generatedWorkout.exercises.map(ex => ({
      name: ex.name,
      weight: workoutWeights[ex.name] || 0,
      reps: ex.reps
    }));

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          workout: generatedWorkout,
          exercises: exercisesWithWeights,
          completed: true,
          date: new Date().toISOString()
        })
      });

      // Update client's last workout week
      const weekNum = getWeekNumber(new Date());
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedClient,
          lastWorkoutWeek: weekNum
        })
      });

      await fetchData();
      setShowWorkoutActive(false);
      setGeneratedWorkout(null);
      setActiveTab('history');
      alert('Session completed and saved!');
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const repeatWorkout = (session: Session) => {
    if (!selectedClient) return;
    
    if (session.workout) {
      setGeneratedWorkout(session.workout);
      // Load previous weights
      const weights: { [key: string]: number } = {};
      session.exercises?.forEach(ex => {
        weights[ex.name] = ex.weight;
      });
      setWorkoutWeights(weights);
      setShowWorkoutActive(true);
    }
  };

  // Helper to get client sessions
  const getClientSessions = (clientId: string) => {
    return sessions
      .filter(s => s.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await fetch(`/api/sessions?id=${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  // Get exercise category based on keywords
  const getExerciseCategory = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('squat') || n.includes('leg press') || n.includes('leg extension') || n.includes('leg curl') || n.includes('lung') || n.includes('calf') || n.includes('quad') || n.includes('hamstring') || n.includes('hip thrust') || n.includes('glute')) return 'legs';
    if (n.includes('bench press') || n.includes('push-up') || n.includes('pushup') || n.includes('chest press') || n.includes('flye') || n.includes('incline') || n.includes('chest')) return 'chest';
    if (n.includes('row') || n.includes('pull') || n.includes('lat') || n.includes('back') || n.includes('deadlift') || n.includes('pendlay')) return 'back';
    if (n.includes('shoulder') || n.includes('press') || n.includes('raise') || n.includes('face pull') || n.includes('shrug') || n.includes('overhead')) return 'shoulders';
    if (n.includes('curl') || n.includes('bicep') || n.includes('hammer')) return 'biceps';
    if (n.includes('tricep') || n.includes('dip') || n.includes('pushdown') || n.includes('extension')) return 'triceps';
    if (n.includes('plank') || n.includes('crunch') || n.includes('russian twist') || n.includes('pallof') || n.includes('core') || n.includes('ab')) return 'core';
    return 'other';
  };

  // Get replacement exercise from same category
  const getReplacementExercise = (removedName: string, currentExercises: any[]): any => {
    const category = getExerciseCategory(removedName);
    const currentNames = currentExercises.map(e => e.name);
    
    // Search in fullBody standard pool first
    const pool = EXERCISE_POOL.fullBody?.standard || [];
    const candidates = pool.filter(ex => 
      getExerciseCategory(ex.name) === category && 
      !currentNames.includes(ex.name)
    );
    
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    // If no candidates, return a default from the pool
    const others = pool.filter(ex => !currentNames.includes(ex.name));
    if (others.length > 0) {
      return others[Math.floor(Math.random() * others.length)];
    }
    
    return null;
  };

  // Remove exercise and add replacement
  const removeAndReplaceExercise = (index: number) => {
    if (!generatedWorkout) return;
    
    const removedExercise = generatedWorkout.exercises[index];
    const newExercises = [...generatedWorkout.exercises];
    newExercises.splice(index, 1);
    
    const replacement = getReplacementExercise(removedExercise.name, newExercises);
    if (replacement) {
      newExercises.push({ ...replacement });
    }
    
    setGeneratedWorkout({ ...generatedWorkout, exercises: newExercises });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💪</span>
            </div>
            <h1 className="text-2xl font-bold text-white">AMarsBody</h1>
            <p className="text-orange-400 font-semibold">Client Programs</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 mb-2 text-sm">Enter PIN</label>
              <input
                type="password"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                className="w-full bg-gray-700 text-white px-4 py-4 rounded-xl text-center text-2xl tracking-widest border border-gray-600 focus:border-orange-500 focus:outline-none"
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
            </div>
            <button
              onClick={handlePinSubmit}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">AMarsBody</h1>
            <p className="text-gray-400 text-sm">Client Programs</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-gray-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'clients' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            👥 Clients
          </button>
          <button
            onClick={() => setActiveTab('workout')}
            disabled={!selectedClient}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'workout' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            } ${!selectedClient && 'opacity-50 cursor-not-allowed'}`}
          >
            🏋️ Workout
          </button>
          <button
            onClick={() => setActiveTab('history')}
            disabled={!selectedClient}
            className={`px-5 py-3 rounded-xl font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'history' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            } ${!selectedClient && 'opacity-50 cursor-not-allowed'}`}
          >
            📊 History
          </button>
        </div>

        {/* Active Workout Modal */}
        {showWorkoutActive && generatedWorkout && selectedClient && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Today&apos;s Workout</h2>
                  <p className="text-orange-400 text-sm">{selectedClient.firstName} {selectedClient.lastName}</p>
                  <p className="text-gray-400 text-xs">
                    {generatedWorkout.type === 'emphasize' 
                      ? `Emphasize: ${generatedWorkout.focusArea}` 
                      : generatedWorkout.type === 'knee-friendly'
                      ? 'Knee-Friendly Full Body'
                      : generatedWorkout.type === 'back-friendly'
                      ? 'Back-Friendly Full Body'
                      : generatedWorkout.type === 'shoulder-friendly'
                      ? 'Shoulder-Friendly Full Body'
                      : generatedWorkout.type === 'wrist-friendly'
                      ? 'Wrist-Friendly Full Body'
                      : generatedWorkout.type === 'hip-friendly'
                      ? 'Hip-Friendly Full Body'
                      : generatedWorkout.type === 'mobility-friendly'
                      ? 'Mobility-Friendly Full Body'
                      : generatedWorkout.type === 'heart-friendly'
                      ? 'Heart-Friendly Full Body'
                      : 'Full Body Circuit'} • {generatedWorkout.exercises.length} exercises
                  </p>
                </div>
                <button 
                  onClick={() => setShowWorkoutActive(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {generatedWorkout.exercises.map((ex, i) => (
                  <div key={i} className="bg-gray-700 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-orange-400 font-bold mr-2">#{i + 1}</span>
                        <span className="font-semibold">{ex.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">{ex.sets} × {ex.reps}</span>
                        <button
                          onClick={() => removeAndReplaceExercise(i)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                          title="Replace with similar exercise"
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{ex.notes}</p>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Weight:</label>
                      <input
                        type="number"
                        value={workoutWeights[ex.name] || ''}
                        onChange={(e) => setWorkoutWeights({
                          ...workoutWeights,
                          [ex.name]: parseFloat(e.target.value) || 0
                        })}
                        placeholder="0"
                        className="w-16 bg-gray-600 text-white px-2 py-1 rounded-lg text-center text-sm"
                      />
                      <span className="text-gray-400 text-sm">lbs</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleCompleteSession}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg mt-6 transition-colors"
              >
                ✅ Complete Session
              </button>
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Client List</h2>
              <button
                onClick={() => setShowAddClient(true)}
                className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                + Add Client
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400">No clients yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.sort((a, b) => a.firstName.localeCompare(b.firstName)).map(client => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`bg-gray-800 p-5 rounded-xl cursor-pointer hover:bg-gray-750 hover:border-orange-500/50 border-2 border-transparent transition-all ${
                      selectedClient?.id === client.id ? 'border-orange-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{client.firstName} {client.lastName}</h3>
                      <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded-full">
                        {client.sessionLength} min
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {client.age && (
                        <p className="text-gray-400">
                          {client.age} years old • {client.gender === 'M' ? 'Male' : 'Female'}
                        </p>
                      )}
                      {client.conditions.length > 0 && (
                        <p className="text-yellow-400 text-xs">
                          ⚠️ {client.conditions.join(', ')}
                        </p>
                      )}
                      {client.emphasize && (
                        <p className="text-blue-400 text-xs capitalize">
                          Focus: {client.emphasize}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setActiveTab('history');
                      }}
                      className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      📋 History
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setActiveTab('workout');
                      }}
                      className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      💪 Generate Workout
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === 'workout' && (
          <div>
            {!selectedClient ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">Select a client from the Clients tab first.</p>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-orange-400 hover:text-orange-300"
                >
                  ← Go to Clients
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selectedClient.firstName} {selectedClient.lastName}</h2>
                    <p className="text-gray-400 text-sm">
                      {selectedClient.sessionLength} min • {selectedClient.gender === 'M' ? '10-15 reps' : '15-25 reps'}
                      {hasBadKnees(selectedClient.conditions) && ' • Knee-friendly'}
                      {hasBadBack(selectedClient.conditions) && ' • Back-friendly'}
                      {hasShoulderIssues(selectedClient.conditions) && ' • Shoulder-friendly'}
                      {hasWristIssues(selectedClient.conditions) && ' • Wrist-friendly'}
                      {hasHipTightness(selectedClient.conditions) && ' • Hip-friendly'}
                      {hasLimitedMobility(selectedClient.conditions) && ' • Mobility-friendly'}
                      {hasHeartCondition(selectedClient.conditions) && ' • Heart-friendly'}
                      {selectedClient.emphasize && ` • ${selectedClient.emphasize}`}
                    </p>
                  </div>
                </div>

                {selectedClient.conditions.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <p className="text-yellow-400 font-semibold mb-2">⚠️ Conditions to consider:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.conditions.map((cond, i) => (
                        <span key={i} className="bg-yellow-500/20 text-yellow-300 text-sm px-3 py-1 rounded-full">
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-100 rounded-lg">
                  <input
                    type="checkbox"
                    id="shuffleWorkout"
                    checked={shuffleWorkout}
                    onChange={(e) => setShuffleWorkout(e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded"
                  />
                  <label htmlFor="shuffleWorkout" className="text-gray-700 font-medium">
                    Shuffle exercise order
                  </label>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2">Quick Focus Override (optional)</label>
                  <select
                    value={quickEmphasize}
                    onChange={(e) => setQuickEmphasize(e.target.value)}
                    className="w-full bg-gray-100 text-gray-800 px-4 py-3 rounded-lg font-medium"
                  >
                    <option value="">Use client's default focus</option>
                    {EMPHASIZE_OPTIONS.filter(o => o.value !== '').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { generateWorkout(selectedClient); setQuickEmphasize(''); }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg transition-colors"
                >
                  🏋️ Generate Workout
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {!selectedClient ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-4">Select a client from the Clients tab first.</p>
                <button
                  onClick={() => setActiveTab('clients')}
                  className="text-orange-400 hover:text-orange-300"
                >
                  ← Go to Clients
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                  <h2 className="text-lg font-bold">{selectedClient.firstName}&apos;s Session History</h2>
                  <p className="text-gray-400 text-sm">
                    {getClientSessions(selectedClient.id).length} total sessions
                  </p>
                </div>

                {getClientSessions(selectedClient.id).length === 0 ? (
                  <div className="bg-gray-800 rounded-xl p-8 text-center">
                    <p className="text-gray-400">No sessions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getClientSessions(selectedClient.id).map(session => (
                      <div key={session.id} className="bg-gray-800 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">
                              {new Date(session.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {session.workout?.type === 'emphasize' 
                                ? `Emphasize: ${session.workout.focusArea}`
                                : session.workout?.type === 'knee-friendly'
                                ? 'Knee-Friendly Full Body'
                                : session.workout?.type === 'back-friendly'
                                ? 'Back-Friendly Full Body'
                                : session.workout?.type === 'shoulder-friendly'
                                ? 'Shoulder-Friendly Full Body'
                                : session.workout?.type === 'wrist-friendly'
                                ? 'Wrist-Friendly Full Body'
                                : session.workout?.type === 'hip-friendly'
                                ? 'Hip-Friendly Full Body'
                                : session.workout?.type === 'mobility-friendly'
                                ? 'Mobility-Friendly Full Body'
                                : session.workout?.type === 'heart-friendly'
                                ? 'Heart-Friendly Full Body'
                                : 'Full Body Circuit'} • {session.workout?.exercises.length} exercises
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">
                              Completed
                            </span>
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        {session.exercises && session.exercises.length > 0 && (
                          <div className="bg-gray-700 rounded-lg p-3 mb-3">
                            <p className="text-gray-400 text-xs mb-2">Exercises:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {session.exercises.map((ex, i) => (
                                <div key={i} className="text-sm flex justify-between">
                                  <span className="text-gray-300">{ex.name}</span>
                                  <span className="text-white">{ex.weight}lbs × {ex.reps}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => repeatWorkout(session)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          🔄 Repeat Workout
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Client Detail Modal - only show on Clients tab */}
        {selectedClient && activeTab === 'clients' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-gray-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedClient.firstName} {selectedClient.lastName}</h2>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-white text-2xl">×</button>
              </div>

              {/* Client Info */}
              <div className="space-y-3 mb-6">
                {selectedClient.age && (
                  <p><span className="text-gray-400">Age:</span> {selectedClient.age} years old</p>
                )}
                {selectedClient.gender && (
                  <p><span className="text-gray-400">Gender:</span> {selectedClient.gender === 'M' ? 'Male' : 'Female'}</p>
                )}
                <p><span className="text-gray-400">Session Length:</span> {selectedClient.sessionLength} minutes</p>
                {selectedClient.emphasize && (
                  <p><span className="text-gray-400">Focus:</span> <span className="capitalize text-orange-400">{selectedClient.emphasize}</span></p>
                )}
                {selectedClient.conditions.length > 0 && (
                  <div>
                    <span className="text-gray-400">Conditions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedClient.conditions.map((c, i) => (
                        <span key={i} className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedClient.email && <p><span className="text-gray-400">Email:</span> {selectedClient.email}</p>}
                {selectedClient.phone && <p><span className="text-gray-400">Phone:</span> {selectedClient.phone}</p>}
                {selectedClient.notes && <p><span className="text-gray-400">Notes:</span> {selectedClient.notes}</p>}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveTab('workout');
                  }}
                  className="bg-orange-500 hover:bg-orange-600 py-2 rounded-lg font-semibold transition-colors"
                >
                  🏋️ Workout
                </button>
                <button
                  onClick={() => {
                    setActiveTab('history');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-semibold transition-colors"
                >
                  📊 History
                </button>
                <button
                  onClick={() => setEditingClient(selectedClient)}
                  className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Client Modal */}
        {showAddClient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Add New Client</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newClient.firstName}
                      onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newClient.lastName}
                      onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Age</label>
                    <input
                      type="number"
                      value={newClient.age}
                      onChange={(e) => setNewClient({ ...newClient, age: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Gender</label>
                    <select
                      value={newClient.gender}
                      onChange={(e) => setNewClient({ ...newClient, gender: e.target.value as 'M' | 'F' })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Session Length</label>
                  <select
                    value={newClient.sessionLength}
                    onChange={(e) => setNewClient({ ...newClient, sessionLength: parseInt(e.target.value) as 30 | 60 })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    <option value={60}>60 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Focus/Emphasize</label>
                  <select
                    value={newClient.emphasize}
                    onChange={(e) => setNewClient({ ...newClient, emphasize: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    {EMPHASIZE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Conditions (select all that apply)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITIONS.map(cond => (
                      <label key={cond} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newClient.conditions.includes(cond)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewClient({ ...newClient, conditions: [...newClient.conditions, cond] });
                            } else {
                              setNewClient({ ...newClient, conditions: newClient.conditions.filter(c => c !== cond) });
                            }
                          }}
                          className="rounded"
                        />
                        <span>{cond}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Notes</label>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAddClient}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Add Client
                  </button>
                  <button
                    onClick={() => setShowAddClient(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Client Modal */}
        {editingClient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Edit Client</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">First Name *</label>
                    <input
                      type="text"
                      value={editingClient.firstName}
                      onChange={(e) => setEditingClient({ ...editingClient, firstName: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={editingClient.lastName}
                      onChange={(e) => setEditingClient({ ...editingClient, lastName: e.target.value })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Age</label>
                    <input
                      type="number"
                      value={editingClient.age || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, age: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Gender</label>
                    <select
                      value={editingClient.gender || 'F'}
                      onChange={(e) => setEditingClient({ ...editingClient, gender: e.target.value as 'M' | 'F' })}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Session Length</label>
                  <select
                    value={editingClient.sessionLength || 60}
                    onChange={(e) => setEditingClient({ ...editingClient, sessionLength: parseInt(e.target.value) as 30 | 60 })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    <option value={60}>60 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Focus/Emphasize</label>
                  <select
                    value={editingClient.emphasize || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, emphasize: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    {EMPHASIZE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Conditions (select all that apply)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CONDITIONS.map(cond => (
                      <label key={cond} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(editingClient.conditions || []).includes(cond)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingClient({ ...editingClient, conditions: [...(editingClient.conditions || []), cond] });
                            } else {
                              setEditingClient({ ...editingClient, conditions: (editingClient.conditions || []).filter(c => c !== cond) });
                            }
                          }}
                          className="rounded"
                        />
                        <span>{cond}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingClient.phone || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">Notes</label>
                  <textarea
                    value={editingClient.notes || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpdateClient}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingClient(null)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}