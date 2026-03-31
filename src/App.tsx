import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  auth, db, handleFirestoreError, OperationType 
} from './firebase';
import { 
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User 
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, deleteDoc, Timestamp, orderBy, writeBatch, updateDoc 
} from 'firebase/firestore';
import { 
  Calendar, User as UserIcon, Activity, FileText, Download, Plus, Trash2, LogOut, Info, ChevronLeft, ChevronRight, Heart, Droplets, Scale,
  Smile, Meh, Frown, Zap, AlertCircle, Sparkles, Lightbulb, TrendingUp, Edit2, FileSpreadsheet, Camera, Image as ImageIcon,
  ShieldCheck, Upload, Mail, Filter, ArrowUpCircle, ArrowDownCircle, Sun, Moon, Check, X, Edit3, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, differenceInDays, addDays, parseISO, isAfter, isBefore, isSameDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, 
  eachDayOfInterval, isWithinInterval 
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { UserProfile, PeriodEntry, HealthReport, SymptomEntry, Insight, DailyLog, SubResult } from './types';

const COMMON_UNITS = [
  'g/dL', 'mg/dL', 'mIU/L', 'mIU/mL', 'uIU/mL', '/mcL', 'ng/mL', 'ng/dL', 'mm', 'pg/mL', 'nmol/L', 'million/mL', '%', 'cells/hpf', 'mg/day', 'mcg/dL', 'IU/L', 'Normal/Abnormal'
];

const COMMON_TESTS = [
  { name: 'Hemoglobin (Hb)', unit: 'g/dL', normal: '12-16', type: 'Blood' },
  { name: 'Fasting Blood Sugar', unit: 'mg/dL', normal: '70-100', type: 'Blood' },
  { name: 'Post Prandial (PP) Sugar', unit: 'mg/dL', normal: '<140', type: 'Blood' },
  { name: 'TSH', unit: 'mIU/L', normal: '0.4-4.0', type: 'Blood' },
  { name: 'Platelets', unit: '/mcL', normal: '150,000-450,000', type: 'Blood' },
  { name: 'Creatinine', unit: 'mg/dL', normal: '0.6-1.1', type: 'Blood' },
  { name: 'Prolactin', unit: 'ng/mL', normal: '4.8-23.3', type: 'Blood' },
  { name: 'Testosterone (Total)', unit: 'ng/dL', normal: '15-70', type: 'Blood' },
  { name: '17-OH Progesterone', unit: 'ng/dL', normal: '20-100', type: 'Blood' },
  { name: 'LH', unit: 'mIU/mL', normal: '2.0-10.0', type: 'Blood' },
  { name: 'FSH', unit: 'mIU/mL', normal: '3.0-10.0', type: 'Blood' },
  { name: 'AMH', unit: 'ng/mL', normal: '1.5-4.0', type: 'Blood' },
  { name: 'Progesterone', unit: 'ng/mL', normal: '0.1-1.5', type: 'Blood' },
  { name: 'Vitamin D (25-OH)', unit: 'ng/mL', normal: '30-100', type: 'Blood' },
  { name: 'Vitamin D3', unit: 'ng/mL', normal: '30-100', type: 'Blood' },
  { name: 'Vitamin B12', unit: 'pg/mL', normal: '200-900', type: 'Blood' },
  { name: 'CBC (Complete Blood Count)', unit: 'Normal/Abnormal', normal: 'Normal', type: 'Blood' },
  { name: 'T3 (Total)', unit: 'ng/dL', normal: '80-200', type: 'Blood' },
  { name: 'T4 (Total)', unit: 'mcg/dL', normal: '5.0-12.0', type: 'Blood' },
  { name: 'Calcium', unit: 'mg/dL', normal: '8.5-10.2', type: 'Blood' },
  { name: 'Iron (Serum)', unit: 'mcg/dL', normal: '60-170', type: 'Blood' },
  { name: 'Ferritin', unit: 'ng/mL', normal: '10-150', type: 'Blood' },
  { name: 'SGPT (ALT)', unit: 'IU/L', normal: '7-55', type: 'Blood' },
  { name: 'SGOT (AST)', unit: 'IU/L', normal: '8-48', type: 'Blood' },
  { name: 'Bilirubin (Total)', unit: 'mg/dL', normal: '0.1-1.2', type: 'Blood' },
  { name: 'USG Pelvis', unit: '', normal: 'Normal findings', type: 'USG' },
  { name: 'USG Whole Abdomen', unit: '', normal: 'Normal findings', type: 'USG' },
  { name: 'Follicular Study (Day 10)', unit: 'mm', normal: '18-24mm', type: 'Follicular' },
  { name: 'Follicular Study (Day 12)', unit: 'mm', normal: '18-24mm', type: 'Follicular' },
  { name: 'Follicular Study (Day 14)', unit: 'mm', normal: '18-24mm', type: 'Follicular' },
  { name: 'Semen Analysis', unit: 'million/mL', normal: '>15', type: 'Semen' },
  { name: 'Semen Analysis (Full)', unit: 'Multiple', normal: 'See details', type: 'Semen' },
  { name: 'Urine Analysis', unit: 'Normal/Abnormal', normal: 'Normal', type: 'Urine' },
  { name: 'HSG (Hysterosalpingography)', unit: '', normal: 'Normal', type: 'Fertility Test' },
  { name: 'Anti-Sperm Antibody', unit: 'U/mL', normal: '<60', type: 'Fertility Test' },
  { name: 'Estradiol (E2)', unit: 'pg/mL', normal: '30-400', type: 'Hormone Test' },
  { name: 'Cortisol (Morning)', unit: 'mcg/dL', normal: '5-23', type: 'Hormone Test' },
  { name: 'DHEA-S', unit: 'mcg/dL', normal: '35-430', type: 'Hormone Test' },
];

// Gemini AI Setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorInfo: '' };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-purple-50 p-4 text-center">
          <div className="neo-card p-8 max-w-md w-full">
            <h2 className="text-xl font-bold text-rose-600 mb-4">Oops! Something went wrong.</h2>
            <p className="text-gray-600 mb-6 text-xs">Sorry, there was a problem with the app. Please try again.</p>
            <pre className="text-[10px] bg-gray-50 p-4 rounded-2xl mb-6 overflow-auto max-h-40 text-left border border-purple-100">
              {this.state.errorInfo}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 text-white py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-purple-700 transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [periods, setPeriods] = useState<PeriodEntry[]>([]);
  const [bloodReports, setBloodReports] = useState<HealthReport[]>([]);
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'profile' | 'reports' | 'insights'>('tracker');
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [showAdjustPrediction, setShowAdjustPrediction] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Blood' | 'USG' | 'Follicular' | 'Semen' | 'Urine' | 'Fertility Test' | 'Hormone Test'>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [reportType, setReportType] = useState<'Blood' | 'USG' | 'Follicular' | 'Semen' | 'Urine' | 'Fertility Test' | 'Hormone Test'>('Blood');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formNormalRange, setFormNormalRange] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTrendMarker, setSelectedTrendMarker] = useState<string>('');
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const pdfRef = useRef<HTMLDivElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [subResults, setSubResults] = useState<SubResult[]>([]);

  const addSubResult = () => {
    setSubResults([...subResults, { name: '', value: 0, unit: '', normalRange: '' }]);
  };

  const updateSubResult = (index: number, field: keyof SubResult, value: any) => {
    const updated = [...subResults];
    updated[index] = { ...updated[index], [field]: value };
    setSubResults(updated);
  };

  const removeSubResult = (index: number) => {
    setSubResults(subResults.filter((_, i) => i !== index));
  };

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddReport) {
      if (reportType === 'Semen') {
        setSubResults([
          { name: 'Semen Volume', value: 0, unit: 'mL', normalRange: '1.5-5.0' },
          { name: 'Sperm Count', value: 0, unit: 'million/mL', normalRange: '>15' },
          { name: 'Motility', value: 0, unit: '%', normalRange: '>40' },
          { name: 'Morphology', value: 0, unit: '%', normalRange: '>4' },
          { name: 'pH Level', value: 0, unit: '', normalRange: '7.2-7.8' },
          { name: 'Liquefaction Time', value: 0, unit: 'min', normalRange: '<30' },
          { name: 'White Blood Cells (WBC)', value: 0, unit: 'cells/hpf', normalRange: '<1' },
          { name: 'Viscosity', value: 0, unit: '', normalRange: 'Normal' },
        ]);
        setSelectedTestName('Semen Analysis (Full)');
        setFormUnit('Multiple');
        setFormNormalRange('See details');
      } else if (reportType === 'USG') {
        setSubResults([
          { name: 'Liver', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Gall Bladder', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Pancreas', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Spleen', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Right Kidney', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Left Kidney', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Urinary Bladder', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Uterus', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Endometrial Thickness (ET)', value: 0, unit: 'mm', normalRange: '6-12mm' },
          { name: 'Right Ovary', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'Left Ovary', value: 'Normal', unit: '', normalRange: 'Normal' },
          { name: 'POD (Free Fluid)', value: 'None', unit: '', normalRange: 'None' },
        ]);
        setSelectedTestName('USG Whole Abdomen/Pelvis');
        setFormUnit('Multiple');
        setFormNormalRange('See details');
      } else if (reportType === 'Urine') {
        setSubResults([
          { name: 'Color', value: 'Pale Yellow', unit: '', normalRange: 'Pale Yellow' },
          { name: 'Appearance', value: 'Clear', unit: '', normalRange: 'Clear' },
          { name: 'Specific Gravity', value: 1.020, unit: '', normalRange: '1.005-1.030' },
          { name: 'pH', value: 6.0, unit: '', normalRange: '4.5-8.0' },
          { name: 'Protein', value: 'Nil', unit: '', normalRange: 'Nil' },
          { name: 'Glucose', value: 'Nil', unit: '', normalRange: 'Nil' },
          { name: 'Ketones', value: 'Nil', unit: '', normalRange: 'Nil' },
          { name: 'Bilirubin', value: 'Nil', unit: '', normalRange: 'Nil' },
          { name: 'Blood', value: 'Nil', unit: '', normalRange: 'Nil' },
          { name: 'Nitrite', value: 'Negative', unit: '', normalRange: 'Negative' },
          { name: 'Pus Cells', value: '0-2', unit: '/hpf', normalRange: '0-5' },
          { name: 'RBCs', value: 'Nil', unit: '/hpf', normalRange: 'Nil' },
          { name: 'Epithelial Cells', value: '1-2', unit: '/hpf', normalRange: 'Few' },
        ]);
        setSelectedTestName('Urine Analysis (Routine)');
        setFormUnit('Multiple');
        setFormNormalRange('See details');
      } else {
        setSubResults([]);
        setSelectedTestName('');
        setFormUnit('');
        setFormNormalRange('');
      }
    }
  }, [showAddReport, reportType]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchProfile(u.uid);
        subscribeToData(u.uid);
      } else {
        setProfile(null);
        setPeriods([]);
        setBloodReports([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile: UserProfile = {
          uid,
          name: auth.currentUser?.displayName || 'ব্যবহারকারী',
          cycleLength: 28,
          periodLength: 5,
          updatedAt: Timestamp.now()
        };
        await setDoc(docRef, initialProfile);
        setProfile(initialProfile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  };

  const subscribeToData = (uid: string) => {
    const userDoc = doc(db, 'users', uid);
    const periodQuery = query(collection(db, 'periods'), where('userId', '==', uid), orderBy('startDate', 'desc'));
    const reportQuery = query(collection(db, 'blood_reports'), where('userId', '==', uid), orderBy('date', 'desc'));
    const symptomQuery = query(collection(db, 'symptoms'), where('userId', '==', uid), orderBy('date', 'desc'));
    const dailyLogQuery = query(collection(db, 'daily_logs'), where('userId', '==', uid), orderBy('date', 'desc'));

    const unsubProfile = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`));

    const unsubPeriods = onSnapshot(periodQuery, (snapshot) => {
      setPeriods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PeriodEntry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'periods'));

    const unsubReports = onSnapshot(reportQuery, (snapshot) => {
      setBloodReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthReport)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'blood_reports'));

    const unsubSymptoms = onSnapshot(symptomQuery, (snapshot) => {
      setSymptoms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SymptomEntry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'symptoms'));

    const unsubDailyLogs = onSnapshot(dailyLogQuery, (snapshot) => {
      setDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'daily_logs'));

    return () => {
      unsubProfile();
      unsubPeriods();
      unsubReports();
      unsubSymptoms();
      unsubDailyLogs();
    };
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const generateInsights = async () => {
    if (!user || periods.length === 0) return;
    setLoadingInsights(true);
    try {
      const periodsData = periods.slice(0, 5).map(p => ({
        start: format(p.startDate.toDate(), 'yyyy-MM-dd'),
        duration: p.duration
      }));
      const symptomsData = symptoms.slice(0, 14).map(s => ({
        date: format(s.date.toDate(), 'yyyy-MM-dd'),
        mood: s.mood,
        energy: s.energy,
        pain: s.pain
      }));
      const reportsData = bloodReports.slice(0, 3).map(r => ({
        test: r.testName,
        result: r.result,
        unit: r.unit,
        status: r.status
      }));

      const prompt = `Analyze this health data for a female user and provide personalized insights in Bengali.
      Periods (last 5): ${JSON.stringify(periodsData)}
      Symptoms (last 14 days): ${JSON.stringify(symptomsData)}
      Blood Reports (last 3): ${JSON.stringify(reportsData)}
      
      Provide:
      1. Trends (e.g., "Your period cycle is regular", "You feel low energy before periods").
      2. Health Recommendations (e.g., "Increase iron intake", "Try light exercise").
      3. A brief summary.
      
      Return the response as JSON: { "trends": ["...", "..."], "recommendations": ["...", "..."], "summary": "..." }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const text = response.text;
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        setInsights(JSON.parse(jsonMatch[0]));
      }
    } catch (error) {
      console.error("Failed to generate insights", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'insights' && !insights) {
      generateInsights();
    }
  }, [activeTab]);

  const handleLogout = () => signOut(auth);

  const calculateBMI = (w: number, h: number) => {
    if (!w || !h || isNaN(w) || isNaN(h)) return 0;
    const heightInMeters = h / 100;
    return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Use the latest profile state and merge
    const currentProfile = profile || { 
      uid: user.uid, 
      name: user.displayName || 'ব্যবহারকারী',
      cycleLength: 28,
      periodLength: 5
    };
    
    const newProfile = { ...currentProfile, ...data, uid: user.uid };
    
    // Recalculate BMI if weight or height is present
    if (newProfile.weight && newProfile.height) {
      newProfile.bmi = calculateBMI(newProfile.weight, newProfile.height);
    } else {
      newProfile.bmi = 0;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      // setProfile will be handled by onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const addPeriod = async (start: string, end: string, notes: string) => {
    if (!user) return;
    const startDate = Timestamp.fromDate(new Date(start));
    const endDate = Timestamp.fromDate(new Date(end));
    const duration = differenceInDays(new Date(end), new Date(start)) + 1;
    
    // Ovulation is typically 14 days before next period. 
    // Assuming 28 day cycle for prediction if not specified.
    const ovulationDate = Timestamp.fromDate(addDays(new Date(start), 14));

    try {
      await addDoc(collection(db, 'periods'), {
        userId: user.uid,
        startDate,
        endDate,
        duration,
        ovulationDate,
        notes: notes || ''
      });
      setShowAddPeriod(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'periods');
    }
  };

  const getPredictedDates = () => {
    if (periods.length === 0 || !profile) return { nextPeriod: null, ovulation: null };
    
    const lastPeriod = periods[0];
    const lastStartDate = lastPeriod.startDate.toDate();
    
    // 1. Calculate average cycle length from history
    let cycleLength = profile.cycleLength || 28;
    if (periods.length >= 2) {
      const gaps = [];
      // Look at last 6 cycles for average
      for (let i = 0; i < Math.min(periods.length - 1, 6); i++) {
        const current = periods[i].startDate.toDate();
        const prev = periods[i+1].startDate.toDate();
        const gap = differenceInDays(current, prev);
        if (gap > 15 && gap < 60) { // Filter out outliers
          gaps.push(gap);
        }
      }
      if (gaps.length > 0) {
        cycleLength = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }
    }

    // 2. Initial prediction
    let nextPeriodStart = addDays(lastStartDate, cycleLength);
    
    // 3. Manual override
    if (profile.manualNextPeriod) {
      const manualDate = profile.manualNextPeriod.toDate();
      // Only use manual date if it's after the last period and not too far in the future
      if (manualDate > lastStartDate && differenceInDays(manualDate, lastStartDate) < 60) {
        nextPeriodStart = manualDate;
      }
    }

    const nextPeriodEnd = addDays(nextPeriodStart, profile.periodLength || 5);
    const ovulationDate = addDays(nextPeriodStart, -14);
    
    return {
      nextPeriod: { start: nextPeriodStart, end: nextPeriodEnd },
      ovulation: ovulationDate
    };
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const { nextPeriod, ovulation } = getPredictedDates();

    const rows = [];
    let days = [];

    calendarDays.forEach((day, i) => {
      const isPeriod = periods.some(p => 
        isWithinInterval(day, { start: p.startDate.toDate(), end: p.endDate.toDate() })
      );
      const isPredictedPeriod = nextPeriod && isWithinInterval(day, { start: nextPeriod.start, end: nextPeriod.end });
      const isOvulation = ovulation && isSameDay(day, ovulation);
      const isFertile = ovulation && isWithinInterval(day, { start: addDays(ovulation, -5), end: ovulation });
      const isToday = isSameDay(day, new Date());

      days.push(
        <div 
          key={day.toString()} 
          className={`relative h-14 flex flex-col items-center justify-center text-sm rounded-2xl transition-all duration-300 ${
            !isSameMonth(day, monthStart) ? 'opacity-20' : 'opacity-100'
          } ${isToday ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-900' : ''} ${
            isPeriod ? 'bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/20' : 
            isPredictedPeriod ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-200 dark:border-rose-800 border-dashed' : 
            isOvulation ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/20' :
            isFertile ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <span className="z-10">{format(day, 'd')}</span>
          {isToday && <div className="absolute bottom-2 w-1 h-1 bg-current rounded-full" />}
          {isOvulation && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(<div key={i} className="grid grid-cols-7 gap-2">{days}</div>);
        days = [];
      }
    });

    return (
      <div className="neo-card p-6 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight font-display">
            {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-2xl transition-all">
              <ChevronLeft size={20} className="text-purple-500" />
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-2xl transition-all">
              <ChevronRight size={20} className="text-purple-500" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="space-y-2">
          {rows}
        </div>
        <div className="flex flex-wrap gap-4 pt-4 border-t border-rose-50 dark:border-gray-800 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2 text-rose-500">
            <div className="w-3 h-3 bg-rose-500 rounded-md" /> পিরিয়ড
          </div>
          <div className="flex items-center gap-2 text-rose-400">
            <div className="w-3 h-3 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 border-dashed rounded-md" /> সম্ভাব্য পিরিয়ড
          </div>
          <div className="flex items-center gap-2 text-purple-500">
            <div className="w-3 h-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-md" /> উর্বর সময়
          </div>
          <div className="flex items-center gap-2 text-purple-600">
            <div className="w-3 h-3 bg-purple-500 rounded-md" /> ওভুলেশন
          </div>
        </div>
      </div>
    );
  };

  const addHealthReport = async (
    type: 'Blood' | 'USG' | 'Follicular' | 'Semen' | 'Urine' | 'Fertility Test' | 'Hormone Test', 
    testName: string, 
    result?: number, 
    unit?: string, 
    normalRange?: string, 
    findings?: string, 
    dateStr?: string,
    follicleSize?: number,
    endometrialThickness?: number,
    ovarySide?: 'Left' | 'Right' | 'Both',
    status?: 'Normal' | 'High' | 'Low' | 'Critical' | 'Abnormal',
    notes?: string,
    subResults?: SubResult[]
  ) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'blood_reports'), {
        userId: user.uid,
        type,
        testName,
        result: (typeof result === 'number' && !isNaN(result)) ? result : null,
        findings: findings || null,
        follicleSize: (typeof follicleSize === 'number' && !isNaN(follicleSize)) ? follicleSize : null,
        endometrialThickness: (typeof endometrialThickness === 'number' && !isNaN(endometrialThickness)) ? endometrialThickness : null,
        ovarySide: ovarySide || null,
        unit: unit || '',
        normalRange: normalRange || '',
        status: status || 'Normal',
        notes: notes || '',
        subResults: subResults || [],
        analysis: '', // AI analysis removed
        date: dateStr ? Timestamp.fromDate(new Date(dateStr)) : Timestamp.now()
      });
      setShowAddReport(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'blood_reports');
    }
  };

  const addSymptom = async (mood: SymptomEntry['mood'], energy: number, pain: number, flow: SymptomEntry['flow'], cramps: boolean, headache: boolean, notes: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'symptoms'), {
        userId: user.uid,
        date: Timestamp.now(),
        mood,
        energy,
        pain,
        flow,
        cramps,
        headache,
        notes: notes || ''
      });
      setShowAddSymptom(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'symptoms');
    }
  };

  const addDailyLog = async (weight?: number, sleepHours?: number, waterIntake?: number) => {
    if (!user) return;
    try {
      // Check if log for today exists
      const today = new Date();
      const existingLog = dailyLogs.find(log => isSameDay(log.date.toDate(), today));
      
      if (existingLog && existingLog.id) {
        const updateData: any = {
          ...existingLog,
          date: Timestamp.now()
        };
        
        // Only update fields that are provided
        if (weight !== undefined && !isNaN(weight)) updateData.weight = weight;
        if (sleepHours !== undefined && !isNaN(sleepHours)) updateData.sleepHours = sleepHours;
        if (waterIntake !== undefined && !isNaN(waterIntake)) updateData.waterIntake = waterIntake;

        await setDoc(doc(db, 'daily_logs', existingLog.id), updateData);
      } else {
        const logData: any = {
          userId: user.uid,
          date: Timestamp.now(),
        };
        
        // Only add fields that are provided
        if (weight !== undefined && !isNaN(weight)) logData.weight = weight;
        if (sleepHours !== undefined && !isNaN(sleepHours)) logData.sleepHours = sleepHours;
        if (waterIntake !== undefined && !isNaN(waterIntake)) logData.waterIntake = waterIntake;

        await addDoc(collection(db, 'daily_logs'), logData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'daily_logs');
    }
  };

  const getCycleRegularity = () => {
    if (periods.length < 3) return "অনিশ্চিত (কম ডাটা)";
    
    const intervals = [];
    for (let i = 0; i < periods.length - 1; i++) {
      const diff = differenceInDays(periods[i].startDate.toDate(), periods[i+1].startDate.toDate());
      intervals.push(diff);
    }
    
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const isRegular = intervals.every(val => Math.abs(val - avg) <= 3);
    
    return isRegular ? "নিয়মিত" : "অনিয়মিত";
  };

  const getCyclePhase = () => {
    if (periods.length === 0 || !profile) return 'unknown';
    const lastPeriod = periods[0].startDate.toDate();
    const daysSinceStart = differenceInDays(new Date(), lastPeriod);
    const cycleLength = profile.cycleLength || 28;

    if (daysSinceStart < (profile.periodLength || 5)) return 'menstrual';
    if (daysSinceStart < cycleLength / 2 - 2) return 'follicular';
    if (daysSinceStart < cycleLength / 2 + 2) return 'ovulation';
    if (daysSinceStart < cycleLength) return 'luteal';
    return 'menstrual';
  };

  const getHealthTips = () => {
    const phase = getCyclePhase();
    switch (phase) {
      case 'menstrual':
        return {
          title: 'পিরিয়ড ফেজ',
          tips: ['প্রচুর পানি পান করুন', 'আয়রন সমৃদ্ধ খাবার খান', 'গরম পানির সেঁক নিন'],
          color: 'text-rose-500'
        };
      case 'follicular':
        return {
          title: 'ফলিকুলার ফেজ',
          tips: ['প্রোটিন সমৃদ্ধ খাবার খান', 'নতুন কিছু শিখুন', 'হালকা ব্যায়াম করুন'],
          color: 'text-emerald-500'
        };
      case 'ovulation':
        return {
          title: 'ওভুলেশন ফেজ',
          tips: ['সবচেয়ে উর্বর সময়', 'সামাজিক কাজে অংশ নিন', 'ফলমূল বেশি খান'],
          color: 'text-purple-500'
        };
      case 'luteal':
        return {
          title: 'লুটিয়াল ফেজ',
          tips: ['ম্যাগনেসিয়াম সমৃদ্ধ খাবার খান', 'পর্যাপ্ত বিশ্রাম নিন', 'ক্যাফেইন এড়িয়ে চলুন'],
          color: 'text-amber-500'
        };
      default:
        return {
          title: 'তথ্য নেই',
          tips: ['আপনার পিরিয়ড ডাটা আপডেট করুন'],
          color: 'text-gray-500'
        };
    }
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
    }
  };

  const downloadPDF = async () => {
    if (!pdfRef.current) return;
    try {
      const dataUrl = await toPng(pdfRef.current, { 
        quality: 0.95,
        backgroundColor: '#faf5ff' // Match bg-purple-50
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('LunaFlow_Report.pdf');
    } catch (error) {
      console.error('Failed to generate PDF', error);
    }
  };

  const exportAllDataToCSV = () => {
    if (!profile) return;

    let csvContent = "";

    // Header with App Info
    csvContent += "LunaFlow Complete Health Data Export\n";
    csvContent += `Export Date: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n\n`;

    // Profile Section
    csvContent += "--- USER PROFILE ---\n";
    csvContent += "Name,Age,Weight (kg),Height (cm),BMI,BP (Sys/Dia),Cycle Length,Period Length,Last Period Date\n";
    csvContent += `"${profile.name}",${profile.age || ''},${profile.weight || ''},${profile.height || ''},${profile.bmi || ''},"${profile.bpSystolic || ''}/${profile.bpDiastolic || ''}",${profile.cycleLength || ''},${profile.periodLength || ''},${profile.lastPeriodDate ? format(profile.lastPeriodDate.toDate(), 'yyyy-MM-dd') : ''}\n\n`;

    // Periods Section
    csvContent += "--- PERIOD TRACKING HISTORY ---\n";
    csvContent += "Start Date,End Date,Duration (days),Notes\n";
    periods.forEach(p => {
      csvContent += `${format(p.startDate.toDate(), 'yyyy-MM-dd')},${format(p.endDate.toDate(), 'yyyy-MM-dd')},${p.duration},"${(p.notes || '').replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    // Health Reports Section
    csvContent += "--- HEALTH & BLOOD REPORTS ---\n";
    csvContent += "Date,Test Name,Type,Result,Unit,Status,Findings,Notes\n";
    bloodReports.forEach(r => {
      csvContent += `${format(r.date.toDate(), 'yyyy-MM-dd')},"${r.testName.replace(/"/g, '""')}",${r.type},${r.result || ''},${r.unit || ''},${r.status},"${(r.findings || '').replace(/"/g, '""')}","${(r.notes || '').replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    // Symptoms Section
    csvContent += "--- SYMPTOMS & MOOD LOGS ---\n";
    csvContent += "Date,Mood,Energy,Pain,Flow,Cramps,Headache,Notes\n";
    symptoms.forEach(s => {
      csvContent += `${format(s.date.toDate(), 'yyyy-MM-dd')},${s.mood},${s.energy},${s.pain},${s.flow},${s.cramps ? 'Yes' : 'No'},${s.headache ? 'Yes' : 'No'},"${(s.notes || '').replace(/"/g, '""')}"\n`;
    });
    csvContent += "\n";

    // Daily Logs Section
    csvContent += "--- DAILY HEALTH LOGS ---\n";
    csvContent += "Date,Weight,Water (ml),Sleep (hrs),Exercise (mins),Notes\n";
    dailyLogs.forEach(l => {
      csvContent += `${format(l.date.toDate(), 'yyyy-MM-dd')},${l.weight || ''},${l.water || ''},${l.sleep || ''},${l.exercise || ''},"${(l.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LunaFlow_Complete_Data_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setStatusMessage({ text: 'সম্পূর্ণ ডেটা CSV এক্সপোর্ট সফল হয়েছে (Full Data Export Successful)', type: 'success' });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const generateAIAnalysis = async (report: HealthReport) => {
    if (!report.id || analyzingReportId) return;
    
    setAnalyzingReportId(report.id);
    try {
      let reportDetails = `Test Name: ${report.testName}\nResult: ${report.result} ${report.unit}\nNormal Range: ${report.normalRange}\nStatus: ${report.status}\nFindings: ${report.findings || 'N/A'}`;
      
      if (report.subResults && report.subResults.length > 0) {
        reportDetails += `\nSub-results:\n${report.subResults.map(sr => `- ${sr.name}: ${sr.value} ${sr.unit} (Range: ${sr.normalRange || 'N/A'})`).join('\n')}`;
      }

      const prompt = `As a medical AI assistant, analyze the following health report:
      ${reportDetails}
      
      Please provide:
      1. A brief summary of the results.
      2. Highlight any critical or abnormal values.
      3. Suggest potential next steps or further tests if needed.
      
      Keep the tone professional and informative. Mention that this is an AI analysis and the user should consult a doctor for a final diagnosis.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text;
      
      if (text) {
        await updateDoc(doc(db, 'blood_reports', report.id), {
          analysis: text
        });
        setStatusMessage({ text: 'AI বিশ্লেষণ সফলভাবে তৈরি হয়েছে!', type: 'success' });
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setStatusMessage({ text: 'AI বিশ্লেষণ তৈরি করতে সমস্যা হয়েছে।', type: 'error' });
    } finally {
      setAnalyzingReportId(null);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const exportReportsToCSV = () => {
    if (bloodReports.length === 0) {
      setStatusMessage({ text: 'কোনো রিপোর্ট নেই এক্সপোর্ট করার জন্য (No reports to export)', type: 'error' });
      return;
    }

    const headers = ['Test Name', 'Result', 'Unit', 'Status', 'Date', 'Notes'];
    const csvRows = [
      headers.join(','),
      ...bloodReports.map(report => [
        `"${report.testName}"`,
        report.result,
        `"${report.unit}"`,
        `"${report.status}"`,
        report.date ? format(report.date.toDate(), 'yyyy-MM-dd') : '',
        `"${(report.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `health_reports_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setStatusMessage({ text: 'রিপোর্ট CSV এক্সপোর্ট সফল হয়েছে (Reports Export Successful)', type: 'success' });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const backupData = async () => {
    if (!user || !profile) return;

    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      profile: { ...profile, updatedAt: profile.updatedAt.toDate().toISOString() },
      periods: periods.map(p => ({ ...p, startDate: p.startDate.toDate().toISOString(), endDate: p.endDate.toDate().toISOString() })),
      bloodReports: bloodReports.map(r => ({ ...r, date: r.date.toDate().toISOString() })),
      symptoms: symptoms.map(s => ({ ...s, date: s.date.toDate().toISOString() })),
      dailyLogs: dailyLogs.map(l => ({ ...l, date: l.date.toDate().toISOString() }))
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `LunaFlow_Backup_${format(new Date(), 'yyyy-MM-dd')}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        
        // Basic validation
        if (!backup.profile || !backup.periods) {
          throw new Error("Invalid backup file format");
        }

        const batch = writeBatch(db);

        // Restore Profile
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, {
          ...backup.profile,
          updatedAt: Timestamp.fromDate(new Date(backup.profile.updatedAt))
        });

        // Helper to clear and restore collections
        const restoreCollection = (data: any[], colName: string, dateFields: string[]) => {
          data.forEach(item => {
            const { id, ...rest } = item;
            const docRef = id ? doc(db, colName, id) : doc(collection(db, colName));
            const processedData = { ...rest, userId: user.uid };
            dateFields.forEach(field => {
              if (processedData[field]) {
                processedData[field] = Timestamp.fromDate(new Date(processedData[field]));
              }
            });
            batch.set(docRef, processedData);
          });
        };

        restoreCollection(backup.periods, 'periods', ['startDate', 'endDate']);
        restoreCollection(backup.bloodReports, 'blood_reports', ['date']);
        restoreCollection(backup.symptoms, 'symptoms', ['date']);
        restoreCollection(backup.dailyLogs, 'daily_logs', ['date']);

        await batch.commit();
        setStatusMessage({ text: "ডেটা সফলভাবে রিস্টোর করা হয়েছে!", type: 'success' });
      } catch (error) {
        console.error("Restore failed", error);
        setStatusMessage({ text: "রিস্টোর ব্যর্থ হয়েছে। দয়া করে সঠিক ফাইলটি নির্বাচন করুন।", type: 'error' });
      } finally {
        setRestoring(false);
        if (backupInputRef.current) backupInputRef.current.value = '';
        setTimeout(() => setStatusMessage(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Limit file size to ~150KB for base64 storage in Firestore
    if (file.size > 150 * 1024) {
      setStatusMessage({ text: "ফাইল সাইজ খুব বড়। দয়া করে ১৫০কেবি এর নিচে ছবি দিন।", type: 'error' });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      await updateProfile({ photoURL: base64 });
      setStatusMessage({ text: "প্রোফাইল ছবি আপডেট হয়েছে!", type: 'success' });
      setTimeout(() => setStatusMessage(null), 5000);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-rose-400"
        >
          <Heart size={64} fill="currentColor" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-purple-50/50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-purple-100 dark:border-gray-800 animate-float">
            <Droplets size={48} className="text-purple-500" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight font-display">LunaFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-sm leading-relaxed">আপনার পিরিয়ড এবং স্বাস্থ্য ট্র্যাকিং এর জন্য একটি আধুনিক ও সহজ সমাধান।</p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-purple-600 text-white py-4 rounded-[2rem] font-bold text-base shadow-[0_20px_40px_-10px_rgba(147,51,234,0.3)] hover:bg-purple-700 hover:shadow-[0_25px_50px_-12px_rgba(147,51,234,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
            Google দিয়ে শুরু করুন
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-purple-50 dark:bg-gray-950 pb-24 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
        {/* Header */}
        <header className="sticky top-0 z-50 glass-card !rounded-none !border-x-0 !border-t-0 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Droplets size={22} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">LunaFlow</h1>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Created By Sk Sabir</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-800 text-purple-500 dark:text-purple-400 hover:scale-110 transition-transform"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-800 text-gray-400 hover:text-rose-500 hover:scale-110 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="p-6 max-w-2xl mx-auto" ref={pdfRef}>
          <AnimatePresence mode="wait">
            {activeTab === 'tracker' && (
              <motion.div 
                key="tracker"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">Period Tracker</h2>
                  <button 
                    onClick={() => setShowAddPeriod(true)}
                    className="bg-purple-600 text-white p-3 rounded-2xl shadow-[0_10px_20px_-5px_rgba(147,51,234,0.3)] hover:bg-purple-700 hover:scale-110 transition-all active:scale-95"
                  >
                    <Plus size={22} />
                  </button>
                </div>

                {renderCalendar()}

                {/* Period Summary Card */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 rounded-[2.5rem] text-white shadow-[0_20px_40px_-10px_rgba(147,51,234,0.4)] relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-[10px] opacity-70 mb-2 font-bold uppercase tracking-[0.2em]">Next Period</h2>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="text-4xl font-extrabold tracking-tight font-display">
                        {getPredictedDates().nextPeriod ? format(getPredictedDates().nextPeriod!.start, 'dd MMMM', { locale: enUS }) : 'No data'}
                      </div>
                      {getPredictedDates().nextPeriod && (
                        <button 
                          onClick={() => setShowAdjustPrediction(true)}
                          className="p-2 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 transition-all"
                          title="Adjust Date"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold">
                        <Calendar size={14} />
                        {getPredictedDates().nextPeriod ? `${differenceInDays(getPredictedDates().nextPeriod!.start, new Date())} days left` : '-'}
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold">
                        <Activity size={14} />
                        Ovulation: {getPredictedDates().ovulation ? format(getPredictedDates().ovulation!, 'dd MMM', { locale: enUS }) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-12 -bottom-12 opacity-10 rotate-12">
                    <Droplets size={220} />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="neo-card p-5">
                    <div className="text-purple-500 dark:text-purple-400 mb-2"><Activity size={18} /></div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{profile?.cycleLength || 28} days</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Avg Cycle ({getCycleRegularity()})</div>
                  </div>
                  <div className="neo-card p-5">
                    <div className="text-purple-500 dark:text-purple-400 mb-2"><Droplets size={18} /></div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{profile?.periodLength || 5} days</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Avg Period</div>
                  </div>
                </div>

                {/* Smart Reminders */}
                {getPredictedDates().nextPeriod && differenceInDays(getPredictedDates().nextPeriod!.start, new Date()) <= 3 && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 p-5 rounded-[2rem] flex items-center gap-4 text-amber-900 dark:text-amber-200 shadow-sm"
                  >
                    <div className="p-3 bg-white dark:bg-amber-900/40 rounded-2xl shadow-sm">
                      <AlertCircle size={24} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm tracking-tight font-display">পিরিয়ড এলার্ট!</div>
                      <div className="text-xs opacity-70 font-medium">আপনার পিরিয়ড আগামী {differenceInDays(getPredictedDates().nextPeriod!.start, new Date())} দিনের মধ্যে শুরু হতে পারে।</div>
                    </div>
                  </motion.div>
                )}

                {/* Ovulation Track Section */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-purple-50 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                        <Heart size={20} className="text-rose-500" />
                      </div>
                      <h3 className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight font-display">ওভুলেশন ট্র্যাকার</h3>
                    </div>
                    <div className="text-[10px] font-extrabold text-purple-500 uppercase tracking-[0.2em]">
                      {getCyclePhase() === 'ovulation' ? 'উর্বর সময়' : 'পরবর্তী ওভুলেশন'}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight font-display">
                          {getPredictedDates().ovulation ? format(getPredictedDates().ovulation!, 'dd MMMM', { locale: enUS }) : '---'}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">সম্ভাব্য ওভুলেশন তারিখ</div>
                      </div>
                      <div className={`px-5 py-2.5 rounded-2xl text-xs font-bold shadow-sm ${
                        getCyclePhase() === 'ovulation' ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      }`}>
                        {getHealthTips().title}
                      </div>
                    </div>

                    <div className="relative h-4 bg-purple-50 dark:bg-purple-900/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (differenceInDays(new Date(), periods[0]?.startDate.toDate() || new Date()) / (profile?.cycleLength || 28)) * 100)}%` }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                      />
                    </div>
                    
                    <div className="flex justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                      <span>শুরু</span>
                      <span>ওভুলেশন</span>
                      <span>শেষ</span>
                    </div>

                    <div className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-[2rem] border border-purple-100/50 dark:border-purple-800/50">
                      <div className="text-xs text-purple-800 dark:text-purple-200 font-medium leading-relaxed">
                        {getCyclePhase() === 'ovulation' 
                          ? 'আপনি এখন আপনার চক্রের সবচেয়ে উর্বর সময়ে আছেন। গর্ভধারণের জন্য এটি সেরা সময়।' 
                          : 'আপনার পরবর্তী ওভুলেশন পিরিয়ড শুরু হওয়ার প্রায় ১৪ দিন আগে হতে পারে।'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* History List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">History</h3>
                    <button 
                      onClick={() => setShowAddPeriod(true)}
                      className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest hover:scale-105 transition-transform"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  </div>
                  
                  {periods.map(p => (
                    <div key={p.id} className="neo-card p-5 flex justify-between items-center group hover:border-purple-200 dark:hover:border-purple-800 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-100 dark:border-purple-800 group-hover:scale-110 transition-transform">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white tracking-tight">{format(p.startDate.toDate(), 'dd MMM')} - {format(p.endDate.toDate(), 'dd MMM')}</div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">Lasted {p.duration} days</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteItem('periods', p.id!)} 
                        className="text-gray-300 hover:text-rose-500 transition-all p-2 hover:scale-125"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'insights' && (
              <motion.div 
                key="insights"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">Health Insights</h2>
                  <button 
                    onClick={generateInsights}
                    disabled={loadingInsights}
                    className="text-purple-600 dark:text-purple-400 p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-purple-100 dark:border-gray-800 disabled:opacity-50 hover:scale-110 transition-transform"
                  >
                    <Sparkles size={22} className={loadingInsights ? 'animate-pulse' : ''} />
                  </button>
                </div>

                {loadingInsights ? (
                  <div className="neo-card p-16 text-center space-y-6">
                    <motion.div 
                      animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="text-purple-500 mx-auto"
                    >
                      <Sparkles size={56} />
                    </motion.div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-bold tracking-tight">AI is analyzing your health patterns...</p>
                  </div>
                ) : insights ? (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-800 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                            <Lightbulb size={24} />
                          </div>
                          <h3 className="text-xl font-extrabold tracking-tight font-display">Summary</h3>
                        </div>
                        <p className="text-sm leading-relaxed opacity-90 font-medium">{insights.summary}</p>
                      </div>
                      <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
                        <Sparkles size={180} />
                      </div>
                    </div>

                    {/* Trends */}
                    <div className="neo-card p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                          <TrendingUp size={20} className="text-purple-500" />
                        </div>
                        <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trends & Observations</h4>
                      </div>
                      <ul className="space-y-4">
                        {insights.trends.map((trend, i) => (
                          <li key={i} className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 shrink-0 shadow-sm shadow-purple-400/50" />
                            {trend}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div className="neo-card p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                          <Heart size={20} className="text-rose-500" />
                        </div>
                        <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Recommendations</h4>
                      </div>
                      <div className="grid gap-4">
                        {insights.recommendations.map((rec, i) => (
                          <div key={i} className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-[2rem] flex gap-4 items-start border border-purple-100/50 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-purple-500 shadow-sm shrink-0">
                              <ChevronRight size={14} />
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest px-8 opacity-60">
                      * AI generated insights for information only.
                    </p>
                  </div>
                ) : (
                  <div className="neo-card p-16 text-center border-dashed border-purple-200 dark:border-purple-800 space-y-6">
                    <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-purple-200 dark:text-purple-800">
                      <Sparkles size={40} />
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-medium px-8">Log your periods and symptoms to get AI-powered health insights.</p>
                    <button 
                      onClick={generateInsights}
                      className="bg-purple-600 text-white px-10 py-4 rounded-[2rem] font-bold text-sm shadow-xl hover:bg-purple-700 hover:scale-105 transition-all active:scale-95"
                    >
                      Start Analysis
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8 pb-10"
              >
                {/* Profile Header Card */}
                <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-sm border border-rose-50 dark:border-gray-800 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 via-purple-400 to-blue-400 opacity-50"></div>
                  
                  <div className="relative inline-block group">
                    <div 
                      onClick={() => photoInputRef.current?.click()}
                      className="w-32 h-32 rounded-[2.5rem] bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    >
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={64} className="text-rose-200 dark:text-rose-800" />
                      )}
                    </div>
                    <label className="absolute bottom-1 right-1 bg-rose-500 text-white p-2.5 rounded-2xl cursor-pointer shadow-lg hover:bg-rose-600 hover:scale-110 transition-all active:scale-95">
                      <Camera size={18} />
                      <input 
                        type="file" 
                        ref={photoInputRef}
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleProfilePhotoChange} 
                      />
                    </label>
                  </div>

                  <div className="mt-6 space-y-2">
                    {isEditingName ? (
                      <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                        <input 
                          type="text" 
                          value={editedName} 
                          onChange={(e) => setEditedName(e.target.value)}
                          className="bg-gray-50 dark:bg-gray-800 border-2 border-rose-100 dark:border-gray-700 rounded-2xl px-4 py-2 text-center font-extrabold text-gray-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors w-full font-display"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateProfile({ name: editedName });
                              setIsEditingName(false);
                            } else if (e.key === 'Escape') {
                              setIsEditingName(false);
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            updateProfile({ name: editedName });
                            setIsEditingName(false);
                          }} 
                          className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-md"
                        >
                          <Check size={20} />
                        </button>
                        <button onClick={() => setIsEditingName(false)} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 transition-colors shadow-md">
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 group">
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
                          {profile?.name || user.displayName || 'ব্যবহারকারী'}
                        </h2>
                        <button 
                          onClick={() => { 
                            setEditedName(profile?.name || user.displayName || ''); 
                            setIsEditingName(true); 
                          }}
                          className="p-1.5 text-gray-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        >
                          <Edit3 size={18} />
                        </button>
                      </div>
                    )}
                    <p className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-[0.2em]">{user?.email}</p>
                  </div>

                  <div className="flex justify-center gap-8 mt-8 pt-8 border-t border-gray-50 dark:border-gray-800">
                    <div className="text-center">
                      <input 
                        key={`cycle-${profile?.cycleLength}`}
                        type="number" 
                        defaultValue={profile?.cycleLength || 28}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateProfile({ cycleLength: val });
                          }
                        }}
                        className="text-2xl font-extrabold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 rounded-xl w-16 py-1 text-center focus:ring-2 focus:ring-rose-500 focus:outline-none font-display transition-all"
                      />
                      <div className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Cycle Days</div>
                    </div>
                    <div className="w-px h-10 bg-gray-100 dark:bg-gray-800"></div>
                    <div className="text-center">
                      <input 
                        key={`period-${profile?.periodLength}`}
                        type="number" 
                        defaultValue={profile?.periodLength || 5}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateProfile({ periodLength: val });
                          }
                        }}
                        className="text-2xl font-extrabold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 rounded-xl w-16 py-1 text-center focus:ring-2 focus:ring-rose-500 focus:outline-none font-display transition-all"
                      />
                      <div className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Period Days</div>
                    </div>
                  </div>
                </div>

                {/* Health Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 font-extrabold text-[10px] uppercase tracking-widest">
                      <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500">
                        <Calendar size={14} />
                      </div>
                      বয়স (Age)
                    </div>
                    <div className="flex items-end gap-2">
                      <input 
                        key={`age-${profile?.age}`}
                        type="number" 
                        defaultValue={profile?.age}
                        onBlur={(e) => updateProfile({ age: parseInt(e.target.value) })}
                        className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent w-20 focus:outline-none font-display"
                      />
                      <span className="text-xs font-bold text-gray-400 mb-1.5">Years</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 font-extrabold text-[10px] uppercase tracking-widest">
                      <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-500">
                        <Scale size={14} />
                      </div>
                      ওজন (Weight)
                    </div>
                    <div className="flex items-end gap-2">
                      <input 
                        key={`weight-${profile?.weight}`}
                        type="number" 
                        defaultValue={profile?.weight}
                        onBlur={(e) => updateProfile({ weight: parseFloat(e.target.value) })}
                        className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent w-20 focus:outline-none font-display"
                      />
                      <span className="text-xs font-bold text-gray-400 mb-1.5">KG</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 font-extrabold text-[10px] uppercase tracking-widest">
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500">
                        <TrendingUp size={14} />
                      </div>
                      উচ্চতা (Height)
                    </div>
                    <div className="flex items-end gap-2">
                      <input 
                        key={`height-${profile?.height}`}
                        type="number" 
                        defaultValue={profile?.height}
                        onBlur={(e) => updateProfile({ height: parseFloat(e.target.value) })}
                        className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent w-20 focus:outline-none font-display"
                      />
                      <span className="text-xs font-bold text-gray-400 mb-1.5">CM</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 font-extrabold text-[10px] uppercase tracking-widest">
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                        <Activity size={14} />
                      </div>
                      রক্তচাপ (BP)
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-1">
                        <input 
                          key={`bpsys-${profile?.bpSystolic}`}
                          type="number" 
                          defaultValue={profile?.bpSystolic}
                          placeholder="Sys"
                          onBlur={(e) => updateProfile({ bpSystolic: parseInt(e.target.value) })}
                          className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent w-14 focus:outline-none font-display text-center"
                        />
                        <span className="text-xl font-bold text-gray-300">/</span>
                        <input 
                          key={`bpdia-${profile?.bpDiastolic}`}
                          type="number" 
                          defaultValue={profile?.bpDiastolic}
                          placeholder="Dia"
                          onBlur={(e) => updateProfile({ bpDiastolic: parseInt(e.target.value) })}
                          className="text-2xl font-extrabold text-gray-900 dark:text-white bg-transparent w-14 focus:outline-none font-display text-center"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-400 mb-1.5">mmHg</span>
                    </div>
                  </div>
                </div>

                {/* BMI Card */}
                {profile?.weight && profile?.height && (
                  <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="relative flex justify-between items-center">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-70 mb-1">আপনার BMI</div>
                        <div className="text-4xl font-extrabold font-display">
                          {(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)}
                        </div>
                        <div className="mt-4 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-widest inline-block">
                          {(() => {
                            const bmi = profile.weight / Math.pow(profile.height / 100, 2);
                            if (bmi < 18.5) return 'Underweight';
                            if (bmi < 25) return 'Normal';
                            if (bmi < 30) return 'Overweight';
                            return 'Obese';
                          })()}
                        </div>
                      </div>
                      <div className="p-4 bg-white/10 rounded-[2rem] backdrop-blur-md">
                        <Activity size={40} className="opacity-50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Goals Section */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-6">
                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight font-display">দৈনিক লক্ষ্য (Daily Goals)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-500">
                          <Moon size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-gray-900 dark:text-white">ঘুমের লক্ষ্য</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sleep Goal</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          key={`sleep-${profile?.sleepGoal}`}
                          type="number" 
                          defaultValue={profile?.sleepGoal || 8}
                          onBlur={(e) => updateProfile({ sleepGoal: parseFloat(e.target.value) })}
                          className="w-12 text-right font-extrabold text-gray-900 dark:text-white bg-transparent focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-gray-400">Hrs</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-500">
                          <Droplets size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-gray-900 dark:text-white">পানির লক্ষ্য</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Water Goal</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          key={`water-${profile?.waterGoal}`}
                          type="number" 
                          defaultValue={profile?.waterGoal || 3}
                          onBlur={(e) => updateProfile({ waterGoal: parseFloat(e.target.value) })}
                          className="w-12 text-right font-extrabold text-gray-900 dark:text-white bg-transparent focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-gray-400">Ltr</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-6">
                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-white tracking-tight font-display">ডেটা ব্যবস্থাপনা (Data Management)</h3>
                  
                  {statusMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl text-sm font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                    >
                      {statusMessage.text}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => backupData()}
                      className="flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all group"
                    >
                      <Download size={20} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-extrabold uppercase tracking-widest">Backup</span>
                    </button>
                    <button 
                      onClick={() => backupInputRef.current?.click()}
                      disabled={restoring}
                      className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all group"
                    >
                      <Upload size={20} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-extrabold uppercase tracking-widest">Restore</span>
                    </button>
                    <button 
                      onClick={() => exportAllDataToCSV()}
                      className="flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all group"
                    >
                      <FileSpreadsheet size={20} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-extrabold uppercase tracking-widest">CSV Export</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">Health Reports</h2>
                  <button 
                    onClick={() => setShowAddReport(true)}
                    className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg hover:bg-purple-700 hover:scale-110 transition-all active:scale-95"
                  >
                    <Plus size={22} />
                  </button>
                </div>

                <div className="px-2">
                  <button 
                    onClick={exportReportsToCSV}
                    className="w-full neo-card p-4 flex items-center justify-between group hover:border-rose-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-gray-900 dark:text-white">CSV এক্সপোর্ট করুন</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Export to CSV</div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-rose-500 transition-colors" />
                  </button>
                </div>

                {/* Report Overview Section */}
                {bloodReports.length > 0 && (
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-rose-50 dark:border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-base flex items-center gap-2 text-gray-900 dark:text-white tracking-tight font-display">
                        <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                          <Activity size={18} className="text-rose-500" />
                        </div>
                        রিপোর্ট ওভারভিউ
                      </h3>
                      <div className="text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                        মোট: {bloodReports.length}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-rose-50/30 dark:bg-rose-900/10 p-4 rounded-[1.5rem] border border-rose-100/50 dark:border-rose-900/30">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-[9px] uppercase tracking-widest mb-3">
                          <ArrowUpCircle size={12} />
                          বেশি (High)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bloodReports.filter(r => r.status === 'High' || r.status === 'Critical').length > 0 ? (
                            bloodReports.filter(r => r.status === 'High' || r.status === 'Critical').map(r => (
                              <div key={r.id} className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg text-[9px] font-bold text-rose-500 shadow-sm border border-rose-50 dark:border-gray-700 flex items-center gap-1">
                                {r.testName} <span className="text-[7px] opacity-60">({r.result}{r.unit})</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[9px] text-gray-400 dark:text-gray-500 italic py-0.5 px-1">নেই</div>
                          )}
                        </div>
                      </div>
                      <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-[1.5rem] border border-blue-100/50 dark:border-blue-900/30">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-widest mb-3">
                          <ArrowDownCircle size={12} />
                          কম (Low)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bloodReports.filter(r => r.status === 'Low').length > 0 ? (
                            bloodReports.filter(r => r.status === 'Low').map(r => (
                              <div key={r.id} className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg text-[9px] font-bold text-blue-500 shadow-sm border border-rose-50 dark:border-gray-700 flex items-center gap-1">
                                {r.testName} <span className="text-[7px] opacity-60">({r.result}{r.unit})</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[9px] text-gray-400 dark:text-gray-500 italic py-0.5 px-1">নেই</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Critical Alerts if any */}
                    {bloodReports.filter(r => r.status === 'Critical' || r.status === 'Abnormal').length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-[1.5rem] flex items-center gap-3 text-amber-900 dark:text-amber-200 shadow-sm">
                        <div className="p-2 bg-white dark:bg-amber-900/40 rounded-xl shadow-sm">
                          <AlertCircle size={20} className="text-amber-500" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs tracking-tight font-display">গুরুতর রিপোর্ট এলার্ট!</div>
                          <div className="text-[10px] opacity-70 font-medium">অস্বাভাবিক ফলাফল পাওয়া গেছে। ডাক্তারের পরামর্শ নিন।</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {bloodReports.length === 0 && (
                  <div className="neo-card p-16 text-center border-dashed border-purple-200 dark:border-purple-800 space-y-6">
                    <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-purple-200 dark:text-purple-800">
                      <FileText size={40} />
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 text-sm font-medium px-8">আপনার কোনো হেলথ রিপোর্ট এখনো যোগ করা হয়নি।</p>
                    <button 
                      onClick={() => setShowAddReport(true)}
                      className="bg-purple-600 text-white px-10 py-4 rounded-[2rem] font-bold text-sm shadow-xl hover:bg-purple-700 hover:scale-105 transition-all active:scale-95"
                    >
                      রিপোর্ট যোগ করুন
                    </button>
                  </div>
                )}

                {bloodReports.length > 0 && (
                  <div className="overflow-x-auto neo-card !rounded-[2rem]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Date</th>
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Test Name</th>
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em] hidden sm:table-cell">Type</th>
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Result / Findings</th>
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Status</th>
                          <th className="p-1.5 sm:p-3 text-[7px] sm:text-[8px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] sm:tracking-[0.2em] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloodReports
                          .filter(r => {
                            const reportDate = r.date.toDate();
                            const start = filterStartDate ? new Date(filterStartDate) : null;
                            const end = filterEndDate ? new Date(filterEndDate) : null;
                            
                            if (start && reportDate < start) return false;
                            if (end) {
                              const endOfDay = new Date(end);
                              endOfDay.setHours(23, 59, 59, 999);
                              if (reportDate > endOfDay) return false;
                            }
                            
                            if (filterType !== 'All' && r.type !== filterType) return false;
                            if (filterStatus !== 'All' && r.status !== filterStatus) return false;
                            
                            return true;
                          })
                          .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
                          .map(r => (
                            <React.Fragment key={r.id}>
                              <tr className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="p-1.5 sm:p-3 text-[8px] sm:text-[9px] text-gray-500 font-bold">
                                {format(r.date.toDate(), 'dd/MM/yy')}
                              </td>
                              <td className="p-1.5 sm:p-3">
                                <div className="text-[10px] sm:text-xs font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">{r.testName}</div>
                                <div className="sm:hidden mt-0.5">
                                  <span className={`px-1 py-0.5 rounded text-[6px] font-extrabold uppercase tracking-widest ${
                                    r.type === 'Blood' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                                    r.type === 'USG' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 
                                    r.type === 'Follicular' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                    r.type === 'Semen' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                  }`}>
                                    {r.type}
                                  </span>
                                </div>
                              </td>
                              <td className="p-1.5 sm:p-3 hidden sm:table-cell">
                                <span className={`px-2 py-0.5 rounded-lg text-[7px] font-extrabold uppercase tracking-widest ${
                                  r.type === 'Blood' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 
                                  r.type === 'USG' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 
                                  r.type === 'Follicular' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                                  r.type === 'Semen' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                }`}>
                                  {r.type}
                                </span>
                              </td>
                              <td className="p-1.5 sm:p-3">
                                {r.type === 'Blood' || r.type === 'Semen' || r.type === 'Urine' || r.type === 'Fertility Test' || r.type === 'Hormone Test' ? (
                                  <div className="text-[9px] sm:text-[10px]">
                                    <span className="font-extrabold text-gray-900 dark:text-white">{r.result}</span> <span className="text-gray-400 text-[7px] sm:text-[8px] font-bold">{r.unit}</span>
                                    {r.normalRange && <div className="text-[6px] sm:text-[7px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Range: {r.normalRange}</div>}
                                    {r.findings && <div className="text-[7px] sm:text-[8px] text-rose-500 font-bold mt-0.5">Findings: {r.findings}</div>}
                                    {r.notes && <div className="text-[7px] sm:text-[8px] text-gray-500 mt-1 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-100 dark:border-gray-700">Note: {r.notes}</div>}
                                    {r.subResults && r.subResults.length > 0 && (
                                      <div className={`mt-1.5 border-t border-gray-100 dark:border-gray-800 pt-1 ${r.subResults.length > 4 ? 'grid grid-cols-2 gap-x-2 gap-y-0.5' : 'space-y-0.5'}`}>
                                        {r.subResults.map((sr, idx) => (
                                          <div key={idx} className="flex justify-between text-[6px] sm:text-[7px] text-gray-500 font-bold border-b border-gray-50 dark:border-gray-800/50 pb-0.5 last:border-0">
                                            <span className="truncate mr-1">{sr.name}: <span className="text-gray-900 dark:text-white">{sr.value}</span> {sr.unit}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : r.type === 'USG' ? (
                                  <div className="text-[9px] sm:text-[10px]">
                                    {r.result !== null && r.result !== undefined && r.result !== '' && (
                                      <div className="mb-0.5">
                                        <span className="font-extrabold text-gray-900 dark:text-white">{r.result}</span> <span className="text-gray-400 text-[7px] sm:text-[8px] font-bold">{r.unit}</span>
                                      </div>
                                    )}
                                    <div className="text-[7px] sm:text-[8px] font-extrabold text-rose-500 leading-tight" title={r.findings || ''}>
                                      {r.findings}
                                    </div>
                                    {r.notes && <div className="text-[7px] sm:text-[8px] text-gray-500 mt-1 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-100 dark:border-gray-700">Note: {r.notes}</div>}
                                  </div>
                                ) : (
                                  <div className="text-[9px] sm:text-[10px]">
                                    <div className="font-extrabold text-gray-900 dark:text-white leading-tight">F: {r.follicleSize}mm | E: {r.endometrialThickness}mm</div>
                                    <div className="text-[6px] sm:text-[7px] text-purple-500 font-extrabold uppercase tracking-widest mt-0.5">{r.ovarySide} Ovary</div>
                                    {r.findings && <div className="text-[7px] sm:text-[8px] text-rose-500 font-bold mt-0.5">Findings: {r.findings}</div>}
                                  </div>
                                )}
                              </td>
                              <td className="p-1.5 sm:p-3">
                                {r.status && (
                                  <span className={`px-1.5 py-0.5 rounded text-[6px] sm:text-[7px] font-extrabold uppercase tracking-widest ${
                                    r.status === 'Normal' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 
                                    r.status === 'High' || r.status === 'Critical' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 
                                    r.status === 'Low' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                    'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                  }`}>
                                    {r.status}
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 sm:p-3 text-right">
                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                  <button 
                                    onClick={() => r.analysis ? setShowAnalysisId(r.id!) : generateAIAnalysis(r)}
                                    disabled={analyzingReportId === r.id}
                                    className={`${r.analysis ? 'text-purple-500 hover:text-purple-600' : 'text-gray-300 hover:text-purple-500'} transition-all p-1 hover:scale-125 disabled:opacity-50`}
                                    title={r.analysis ? "View AI Analysis" : "Generate AI Analysis"}
                                  >
                                    {analyzingReportId === r.id ? (
                                      <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                      <Sparkles size={12} fill={r.analysis ? "currentColor" : "none"} />
                                    )}
                                  </button>
                                  <button 
                                    onClick={() => deleteItem('blood_reports', r.id!)}
                                    className="text-gray-300 hover:text-rose-500 transition-all p-1 hover:scale-125"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {showAnalysisId === r.id && r.analysis && (
                              <tr className="bg-purple-50/30 dark:bg-purple-900/10">
                                <td colSpan={6} className="p-4">
                                  <div className="neo-card p-4 border-purple-100 dark:border-purple-900/30">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-xs font-bold text-purple-600 flex items-center gap-2">
                                        <Sparkles size={14} /> AI Analysis
                                      </h4>
                                      <button 
                                        onClick={() => setShowAnalysisId(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                      {r.analysis}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-purple-100 dark:border-purple-900/30 flex justify-between items-center">
                                      <p className="text-[8px] text-gray-400 italic">
                                        * This is an AI-generated summary. Always consult a healthcare professional for clinical decisions.
                                      </p>
                                      <button 
                                        onClick={() => generateAIAnalysis(r)}
                                        disabled={analyzingReportId === r.id}
                                        className="text-[9px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                                      >
                                        <RefreshCw size={10} className={analyzingReportId === r.id ? 'animate-spin' : ''} />
                                        Regenerate
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Adjust Prediction Modal */}
        <AnimatePresence>
          {showAdjustPrediction && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 text-purple-600 flex items-center gap-2">
                  <Sparkles size={20} /> Period Date Adjustment
                </h3>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  You can manually adjust the predicted start date of your next period. This helps improve future prediction accuracy.
                </p>
                <form onSubmit={async (e: any) => {
                  e.preventDefault();
                  const date = e.target.manualDate.value;
                  if (date) {
                    await updateProfile({ manualNextPeriod: Timestamp.fromDate(new Date(date)) });
                    setShowAdjustPrediction(false);
                  }
                }} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Predicted Start Date</label>
                    <input 
                      type="date" 
                      name="manualDate" 
                      required 
                      defaultValue={getPredictedDates().nextPeriod ? format(getPredictedDates().nextPeriod!.start, 'yyyy-MM-dd') : ''}
                      className="w-full bg-purple-50 p-4 rounded-2xl outline-none border-none font-bold text-purple-600 text-sm" 
                    />
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowAdjustPrediction(false)} 
                      className="flex-1 py-4 text-gray-400 font-bold text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg text-sm"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50">
          <div className="glass-card !rounded-[2.5rem] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            {[
              { id: 'tracker', icon: Calendar, label: 'Tracker' },
              { id: 'reports', icon: FileText, label: 'Reports' },
              { id: 'insights', icon: Sparkles, label: 'AI' },
              { id: 'profile', icon: UserIcon, label: 'Profile' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center justify-center py-3 px-5 rounded-[2rem] transition-all duration-500 ${
                  activeTab === tab.id 
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' 
                    : 'text-gray-400 hover:text-purple-400 dark:text-gray-500'
                }`}
              >
                <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 transition-all duration-300 ${
                  activeTab === tab.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
                }`}>
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1 h-1 bg-purple-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Add Period Modal */}
        <AnimatePresence>
          {showAddPeriod && (
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Add Period</h3>
                <form onSubmit={(e: any) => {
                  e.preventDefault();
                  addPeriod(e.target.start.value, e.target.end.value, e.target.notes.value);
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Start Date</label>
                    <input name="start" type="date" required className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none border-none font-bold text-purple-600 dark:text-purple-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">End Date</label>
                    <input name="end" type="date" required className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none border-none font-bold text-purple-600 dark:text-purple-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Notes (Optional)</label>
                    <textarea name="notes" className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none border-none h-24 text-sm dark:text-white" />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowAddPeriod(false)} className="flex-1 py-4 text-gray-400 dark:text-gray-500 font-bold text-sm">Cancel</button>
                    <button type="submit" className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg text-sm hover:bg-purple-700 transition-colors">Save Period</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Report Modal */}
        <AnimatePresence>
          {showAddReport && (
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold dark:text-white">হেলথ রিপোর্ট যোগ করুন</h3>
                </div>

                <form onSubmit={(e: any) => {
                  e.preventDefault();
                  addHealthReport(
                    reportType,
                    selectedTestName === 'Other' ? e.target.test_custom.value : e.target.test.value, 
                    (reportType === 'Blood' || reportType === 'Semen' || reportType === 'Urine' || reportType === 'Fertility Test' || reportType === 'Hormone Test' || reportType === 'USG') ? parseFloat(e.target.result?.value || '0') : undefined, 
                    e.target.unit?.value, 
                    e.target.range?.value,
                    e.target.findings?.value,
                    e.target.date.value,
                    reportType === 'Follicular' ? parseFloat(e.target.follicleSize.value) : undefined,
                    reportType === 'Follicular' ? parseFloat(e.target.endometrialThickness.value) : undefined,
                    reportType === 'Follicular' ? e.target.ovarySide.value : undefined,
                    e.target.status?.value,
                    e.target.notes?.value,
                    subResults
                  );
                }} className="space-y-4">
                  <div className="flex flex-wrap gap-2 p-1 bg-rose-50 dark:bg-rose-900/10 rounded-2xl mb-4">
                    <button 
                      type="button"
                      onClick={() => setReportType('Blood')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Blood' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      ব্লাড টেস্ট
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('USG')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'USG' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      USG রিপোর্ট
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('Follicular')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Follicular' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      Follicular
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('Semen')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Semen' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      Semen
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('Urine')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Urine' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      Urine
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('Fertility Test')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Fertility Test' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      Fertility
                    </button>
                    <button 
                      type="button"
                      onClick={() => setReportType('Hormone Test')}
                      className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all ${reportType === 'Hormone Test' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                      Hormone
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">টেস্টের তারিখ</label>
                    <input name="date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">টেস্টের নাম</label>
                    <select 
                      name="test" 
                      required 
                      value={selectedTestName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTestName(val);
                        const test = COMMON_TESTS.find(t => t.name === val);
                        if (test) {
                          setFormUnit(test.unit);
                          setFormNormalRange(test.normal);
                        }
                      }}
                      className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none appearance-none font-bold text-rose-500 dark:text-rose-400"
                    >
                      <option value="">টেস্ট সিলেক্ট করুন</option>
                      {COMMON_TESTS.filter(t => t.type === reportType).map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                      <option value="Other">অন্যান্য (Other)</option>
                    </select>
                  </div>

                  {selectedTestName === 'Other' && (
                    <input name="test_custom" placeholder="টেস্টের নাম লিখুন" required className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                  )}

                  {reportType === 'Blood' || reportType === 'Semen' || reportType === 'Urine' || reportType === 'Fertility Test' || reportType === 'Hormone Test' || reportType === 'USG' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">ফলাফল {reportType === 'USG' || reportType === 'Semen' || reportType === 'Urine' ? '(ঐচ্ছিক)' : ''}</label>
                          <input name="result" type="number" step="0.01" placeholder="ফলাফল" required={reportType !== 'USG' && reportType !== 'Semen' && reportType !== 'Urine'} className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">ইউনিট</label>
                          <div className="relative">
                            <select 
                              name="unit" 
                              value={formUnit} 
                              onChange={(e) => setFormUnit(e.target.value)} 
                              className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none appearance-none font-bold text-rose-500 dark:text-rose-400"
                            >
                              <option value="">সিলেক্ট করুন</option>
                              {COMMON_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                              <option value="Other">অন্যান্য</option>
                            </select>
                            {formUnit === 'Other' && (
                              <input 
                                placeholder="ইউনিট লিখুন" 
                                className="mt-2 w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white"
                                onChange={(e) => setFormUnit(e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">স্বাভাবিক রেঞ্জ</label>
                        <input name="range" value={formNormalRange} onChange={(e) => setFormNormalRange(e.target.value)} placeholder="স্বাভাবিক রেঞ্জ (উদা: 12-16)" className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">রিপোর্ট স্ট্যাটাস</label>
                        <select name="status" className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none appearance-none font-bold text-rose-500 dark:text-rose-400">
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                          <option value="Critical">Critical</option>
                          <option value="Abnormal">Abnormal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">অতিরিক্ত ফলাফল/নোট (ঐচ্ছিক)</label>
                        <textarea name="notes" placeholder="অন্যান্য তথ্য বা একাধিক ফলাফল এখানে লিখুন..." className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none h-20 dark:text-white" />
                      </div>

                      {(reportType === 'Blood' || reportType === 'Semen' || reportType === 'USG' || reportType === 'Urine') && (
                        <div className="space-y-3 pt-2 border-t border-rose-100 dark:border-gray-800">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {reportType === 'Semen' ? 'সিমেন প্যারামিটারসমূহ' : reportType === 'USG' ? 'USG প্যারামিটারসমূহ' : reportType === 'Urine' ? 'ইউরিন প্যারামিটারসমূহ' : 'একাধিক রেজাল্ট যোগ করুন (উদা: CBC)'}
                            </label>
                            <button 
                              type="button" 
                              onClick={addSubResult}
                              className="text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 text-xs font-bold"
                            >
                              <Plus size={14} /> যোগ করুন
                            </button>
                          </div>
                          
                          {subResults.map((sr, idx) => (
                            <div key={idx} className={`bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl space-y-3 relative ${reportType === 'Semen' ? 'border border-rose-100 dark:border-rose-900/30' : ''}`}>
                              <button 
                                type="button"
                                onClick={() => removeSubResult(idx)}
                                className="absolute top-2 right-2 text-gray-300 dark:text-gray-600 hover:text-rose-500"
                              >
                                <Trash2 size={14} />
                              </button>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold">Parameter</label>
                                  <input 
                                    placeholder="টেস্টের নাম" 
                                    value={sr.name}
                                    onChange={(e) => updateSubResult(idx, 'name', e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl outline-none text-xs font-bold dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold">Value</label>
                                  <input 
                                    placeholder="ফলাফল" 
                                    value={sr.value || ''}
                                    onChange={(e) => updateSubResult(idx, 'value', e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl outline-none text-xs font-bold text-rose-500 dark:text-rose-400"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold">Unit</label>
                                  <input 
                                    placeholder="ইউনিট" 
                                    value={sr.unit}
                                    onChange={(e) => updateSubResult(idx, 'unit', e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl outline-none text-[10px] dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold">Normal Range</label>
                                  <input 
                                    placeholder="স্বাভাবিক রেঞ্জ" 
                                    value={sr.normalRange}
                                    onChange={(e) => updateSubResult(idx, 'normalRange', e.target.value)}
                                    className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl outline-none text-[10px] dark:text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(reportType === 'Urine' || reportType === 'Semen' || reportType === 'Fertility Test' || reportType === 'USG') && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">রিপোর্ট ফাইন্ডিংস (ঐচ্ছিক)</label>
                          <textarea name="findings" placeholder={reportType === 'USG' ? "USG রিপোর্টে যা লেখা আছে..." : "অন্যান্য তথ্য..."} className="w-full bg-rose-50 p-4 rounded-2xl outline-none h-20" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">ফলিকল সাইজ (mm)</label>
                          <input name="follicleSize" type="number" step="0.1" placeholder="উদা: 18.5" required className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">এন্ডোমেট্রিয়াল থিকনেস (mm)</label>
                          <input name="endometrialThickness" type="number" step="0.1" placeholder="উদা: 8.2" required className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none dark:text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">ডিম্বাশয় (Ovary)</label>
                        <select name="ovarySide" className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none appearance-none font-bold text-rose-500 dark:text-rose-400">
                          <option value="Left">বাম (Left)</option>
                          <option value="Right">ডান (Right)</option>
                          <option value="Both">উভয় (Both)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">রিপোর্ট ফাইন্ডিংস (ঐচ্ছিক)</label>
                        <textarea name="findings" placeholder="অন্যান্য তথ্য..." className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none h-20 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 dark:text-gray-500 mb-1">অতিরিক্ত ফলাফল/নোট (ঐচ্ছিক)</label>
                        <textarea name="notes" placeholder="অন্যান্য তথ্য বা একাধিক ফলাফল এখানে লিখুন..." className="w-full bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl outline-none h-20 dark:text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowAddReport(false)} className="flex-1 py-4 text-gray-400 dark:text-gray-500 font-bold">বাতিল</button>
                    <button 
                      type="submit" 
                      className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-rose-600 transition-colors"
                    >
                      সেভ করুন
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Symptom Modal */}
        <AnimatePresence>
          {showAddSymptom && (
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Log Symptoms</h3>
                <form onSubmit={(e: any) => {
                  e.preventDefault();
                  addSymptom(
                    e.target.mood.value, 
                    parseInt(e.target.energy.value), 
                    parseInt(e.target.pain.value),
                    e.target.flow.value,
                    e.target.cramps.checked,
                    e.target.headache.checked,
                    e.target.notes.value
                  );
                }} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">How are you feeling?</label>
                    <div className="flex justify-between">
                      {[
                        { id: 'Happy', icon: <Smile size={20} />, label: 'Happy' },
                        { id: 'Neutral', icon: <Meh size={20} />, label: 'Neutral' },
                        { id: 'Sad', icon: <Frown size={20} />, label: 'Sad' },
                        { id: 'Anxious', icon: <AlertCircle size={20} />, label: 'Anxious' },
                        { id: 'Irritated', icon: <AlertCircle size={20} />, label: 'Irritated' }
                      ].map(m => (
                        <label key={m.id} className="flex flex-col items-center gap-1 cursor-pointer group">
                          <input type="radio" name="mood" value={m.id} required className="hidden peer" />
                          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 peer-checked:bg-purple-600 peer-checked:text-white transition-all">
                            {m.icon}
                          </div>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 peer-checked:text-purple-600 dark:peer-checked:text-purple-400 font-bold uppercase tracking-tighter">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Flow</label>
                    <div className="flex justify-between gap-2">
                      {[
                        { id: 'None', label: 'None' },
                        { id: 'Light', label: 'Light' },
                        { id: 'Medium', label: 'Medium' },
                        { id: 'Heavy', label: 'Heavy' }
                      ].map(f => (
                        <label key={f.id} className="flex-1 cursor-pointer">
                          <input type="radio" name="flow" value={f.id} required className="hidden peer" />
                          <div className="py-2.5 text-center bg-purple-50 dark:bg-purple-900/20 rounded-xl text-[10px] font-bold text-gray-400 dark:text-gray-500 peer-checked:bg-purple-600 peer-checked:text-white transition-all uppercase tracking-wider">
                            {f.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="cramps" className="w-5 h-5 accent-purple-600" />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Cramps</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="headache" className="w-5 h-5 accent-purple-600" />
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Headache</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Energy (1-5)</label>
                      <select name="energy" className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none appearance-none font-bold text-purple-600 dark:text-purple-400 text-sm">
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Pain (1-5)</label>
                      <select name="pain" className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none appearance-none font-bold text-purple-600 dark:text-purple-400 text-sm">
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Notes (Optional)</label>
                    <textarea name="notes" className="w-full bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl outline-none border-none h-20 text-sm dark:text-white" />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setShowAddSymptom(false)} className="flex-1 py-4 text-gray-400 dark:text-gray-500 font-bold text-sm">Cancel</button>
                    <button type="submit" className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg text-sm hover:bg-purple-700 transition-colors">Save Log</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
