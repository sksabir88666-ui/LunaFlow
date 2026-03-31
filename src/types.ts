export interface UserProfile {
  uid: string;
  name: string;
  age?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  cycleLength?: number;
  periodLength?: number;
  sleepGoal?: number; // in hours
  waterGoal?: number; // in L
  isCycleRegular?: boolean;
  manualNextPeriod?: any;
  photoURL?: string;
  updatedAt?: any;
}

export interface PeriodEntry {
  id?: string;
  userId: string;
  startDate: any;
  endDate: any;
  duration: number;
  ovulationDate?: any;
  notes?: string;
}

export interface SubResult {
  name: string;
  value: number | string;
  unit: string;
  normalRange?: string;
}

export interface HealthReport {
  id?: string;
  userId: string;
  type: 'Blood' | 'USG' | 'Follicular' | 'Semen' | 'Urine' | 'Fertility Test' | 'Hormone Test';
  testName: string;
  result?: number; // Optional for USG/Follicular/Semen/Urine
  findings?: string; // For USG
  follicleSize?: number; // For Follicular Study (mm)
  endometrialThickness?: number; // For Follicular Study (mm)
  ovarySide?: 'Left' | 'Right' | 'Both'; // For Follicular Study
  unit?: string;
  normalRange?: string;
  status?: 'Normal' | 'High' | 'Low' | 'Critical' | 'Abnormal';
  analysis?: string;
  symptomsAtTime?: string;
  notes?: string;
  subResults?: SubResult[];
  date: any;
}

export interface SymptomEntry {
  id?: string;
  userId: string;
  date: any;
  mood: 'Happy' | 'Neutral' | 'Sad' | 'Anxious' | 'Irritated';
  energy: number; // 1-5
  pain: number; // 1-5
  flow?: 'None' | 'Light' | 'Medium' | 'Heavy';
  cramps?: boolean;
  headache?: boolean;
  notes?: string;
}

export interface DailyLog {
  id?: string;
  userId: string;
  date: any;
  weight?: number;
  sleepHours?: number;
  waterIntake?: number; // in L
}

export interface Insight {
  trends: string[];
  recommendations: string[];
  summary: string;
}
