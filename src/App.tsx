import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  Users,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Bell,
  Send,
  Edit3,
  ChevronRight,
  ChevronDown,
  Info,
  Navigation,
  Award,
  Sparkles,
  LogOut,
  UserPlus,
  Ban,
  CalendarPlus,
  Copy,
  Check,
  FileText,
  Settings,
  ArrowRight,
  Camera,
  RotateCcw,
  Cloud,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection
} from 'firebase/firestore';

// ============================================================================
// FIREBASE CLOUD INITIALIZATION (SAFE FALLBACK FOR BOTH PREVIEW & VERCEL)
// ============================================================================
const firebaseConfig =
  typeof __firebase_config !== 'undefined' && __firebase_config
    ? JSON.parse(__firebase_config)
    : {
        apiKey: 'AIzaSyDummyKeyForPreviewModeOnly12345',
        authDomain: 'learn-2-pass-with-us.firebaseapp.com',
        projectId: 'learn-2-pass-with-us',
        storageBucket: 'learn-2-pass-with-us.firebasestorage.app',
        messagingSenderId: '100000000000',
        appId: '1:100000000000:web:abcdef123456'
      };

const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'learn-to-pass-with-us';

let firebaseApp = null;
let auth = null;
let db = null;

try {
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (err) {
  console.warn('Firebase initialization running in offline/local storage mode:', err);
}

// ============================================================================
// WEST SUSSEX POSTCODES, DVSA SYLLABUS & HELPER UTILITIES
// ============================================================================
const WEST_SUSSEX_LOCATIONS = [
  { code: 'PO19', name: 'Chichester City Centre', lat: 50.8365, lng: -0.7792 },
  { code: 'PO18', name: 'Bosham / Lavant / Goodwood', lat: 50.8652, lng: -0.8214 },
  { code: 'PO20', name: 'Selsey / Pagham / Hunston', lat: 50.7685, lng: -0.7851 },
  { code: 'PO21', name: 'Bognor Regis / Aldwick', lat: 50.7838, lng: -0.6746 },
  { code: 'PO22', name: 'Felpham / Middleton / Yapton', lat: 50.7955, lng: -0.6312 },
  { code: 'PO10', name: 'Emsworth / Southbourne / Westbourne', lat: 50.8475, lng: -0.9367 },
  { code: 'PO9', name: 'Havant / Rowlands Castle', lat: 50.8529, lng: -0.9803 },
  { code: 'BN18', name: 'Arundel / Fontwell / Walberton', lat: 50.8548, lng: -0.5562 },
  { code: 'BN17', name: 'Littlehampton / Rustington', lat: 50.8104, lng: -0.5401 },
  { code: 'GU29', name: 'Midhurst / Cocking / Singleton', lat: 50.9854, lng: -0.7405 }
];

const DVSA_SYLLABUS_SKILLS = [
  {
    id: 'cockpit-controls',
    category: 'Stage 1 • Foundations',
    title: 'Cockpit Drill, Controls & Safety Checks',
    desc: 'DSSSM routine, clutch bite control, gears, mirrors & signals.'
  },
  {
    id: 'moving-off-stopping',
    category: 'Stage 1 • Foundations',
    title: 'Moving Off & Stopping Safely',
    desc: 'POM routine, kerbside pulls, uphill/downhill starts & angled pull-outs.'
  },
  {
    id: 'junctions-turns',
    category: 'Stage 2 • Road Craft',
    title: 'Junctions, Crossroads & Turns',
    desc: 'MSPSL routine, emerging left/right, T-junctions & box junctions.'
  },
  {
    id: 'roundabouts',
    category: 'Stage 2 • Road Craft',
    title: 'Mini, Standard & Multi-Lane Roundabouts',
    desc: 'Lane discipline, A27 Chichester bypass roundabouts & spiral markings.'
  },
  {
    id: 'pedestrian-hazards',
    category: 'Stage 3 • Hazard Awareness',
    title: 'Pedestrian Crossings & Hazard Perception',
    desc: 'Zebra, Pelican, Puffin crossings, schools & defensive space.'
  },
  {
    id: 'dual-carriageways',
    category: 'Stage 3 • Hazard Awareness',
    title: 'Dual Carriageways & National Speed Roads',
    desc: 'Slip-road merging, overtaking, rural bends & progressive speed.'
  },
  {
    id: 'manoeuvres',
    category: 'Stage 4 • Manoeuvres',
    title: 'DVSA Reversing Manoeuvres & Emergency Stop',
    desc: 'Parallel park, forward/reverse bay park, pull up on right & emergency stop.'
  },
  {
    id: 'independent-mock',
    category: 'Stage 5 • Test Ready',
    title: 'Independent Driving (Sat-Nav / Signs) & Mock Test',
    desc: '20-min independent route, Show Me / Tell Me questions & Chichester test routes.'
  }
];

const SKILL_LEVELS = [
  { value: 0, label: 'Not Started', color: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
  { value: 1, label: 'Introduced', color: 'bg-red-50 text-red-700 border-red-300', dot: 'bg-red-500' },
  { value: 2, label: 'Guided', color: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  { value: 3, label: 'Prompted', color: 'bg-yellow-50 text-yellow-800 border-yellow-400', dot: 'bg-yellow-500' },
  { value: 4, label: 'Consistent', color: 'bg-blue-50 text-blue-700 border-blue-300', dot: 'bg-blue-600' },
  { value: 5, label: 'Test Ready', color: 'bg-emerald-50 text-emerald-800 border-emerald-400', dot: 'bg-emerald-600' }
];

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(`ltpwu_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(`ltpwu_${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function getUpcomingDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(totalMins) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMins));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function findLocationCoords(locStr) {
  const code = (locStr || '').split('-')[0].trim().toUpperCase();
  return (
    WEST_SUSSEX_LOCATIONS.find((l) => l.code === code) || WEST_SUSSEX_LOCATIONS[0]
  );
}

// Calculates road miles, estimated drive minutes, +10m write-up buffer rounded up to 15m slot increment
function calculateTravelMetrics(fromLocStr, toLocStr) {
  const from = findLocationCoords(fromLocStr);
  const to = findLocationCoords(toLocStr);
  if (from.code === to.code) {
    return { miles: 1.5, driveMins: 5, rawTotalMins: 15, bufferedMins: 15 };
  }
  const R = 3958.8;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = Math.max(1.5, Number((R * c * 1.28).toFixed(1)));
  const driveMins = Math.max(6, Math.round((miles / 26) * 60));
  const rawTotalMins = driveMins + 10;
  const bufferedMins = Math.ceil(rawTotalMins / 15) * 15;
  return { miles, driveMins, rawTotalMins, bufferedMins };
}

// Parses .ics calendar feeds regardless of TRANSP:TRANSPARENT ("Free") status
function parseICSFeedEvents(icsText) {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const results = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const summaryMatch = block.match(/SUMMARY(?:;[^:]*)?:([^\r\n]+)/);
    const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/);
    const dtEndMatch = block.match(/DTEND(?:;[^:]*)?:([^\r\n]+)/);

    if (!dtStartMatch) continue;
    const rawStart = dtStartMatch[1].trim();
    const rawEnd = dtEndMatch ? dtEndMatch[1].trim() : rawStart;
    const title = summaryMatch ? summaryMatch[1].trim() : 'Work Rota Shift';

    if (rawStart.length === 8) {
      const date = `${rawStart.slice(0, 4)}-${rawStart.slice(4, 6)}-${rawStart.slice(6, 8)}`;
      results.push({
        id: `rota-${date}-${i}`,
        title,
        date,
        allDay: true,
        startTime: '00:00',
        endTime: '23:59'
      });
    } else if (rawStart.length >= 13) {
      const date = `${rawStart.slice(0, 4)}-${rawStart.slice(4, 6)}-${rawStart.slice(6, 8)}`;
      const startTime = `${rawStart.slice(9, 11)}:${rawStart.slice(11, 13)}`;
      const endTime =
        rawEnd.length >= 13 ? `${rawEnd.slice(9, 11)}:${rawEnd.slice(11, 13)}` : '17:00';
      results.push({
        id: `rota-${date}-${startTime}-${i}`,
        title,
        date,
        allDay: false,
        startTime,
        endTime
      });
    }
  }
  return results;
}

// Calendar Export Helpers (Google, Apple .ics, Outlook, Yahoo)
function formatICSDateTime(dateStr, timeStr) {
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`;
}

function buildLessonICSContent(lessonsList, pupilName) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn To Pass With Us//Driving School//EN',
    'CALSCALE:GREGORIAN'
  ];

  lessonsList.forEach((l) => {
    const endStr = minutesToTime(timeToMinutes(l.startTime) + l.durationMins);
    const desc = `Instructor Focus: ${l.notes || 'Syllabus progression'}${
      l.pupilNotes ? ` | Pupil Note: ${l.pupilNotes}` : ''
    }`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${l.id}@learntopasswithus.co.uk`,
      `DTSTAMP:${formatICSDateTime(l.date, l.startTime)}Z`,
      `DTSTART:${formatICSDateTime(l.date, l.startTime)}`,
      `DTEND:${formatICSDateTime(l.date, endStr)}`,
      `SUMMARY:Driving Lesson - Learn To Pass With Us (${pupilName})`,
      `LOCATION:${l.pickupLocation}`,
      `DESCRIPTION:${desc}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICSFile(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildGoogleCalendarUrl(lesson) {
  const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
  const dates = `${formatICSDateTime(lesson.date, lesson.startTime)}/${formatICSDateTime(
    lesson.date,
    endStr
  )}`;
  const text = encodeURIComponent('Driving Lesson - Learn To Pass With Us (EN56 WXA)');
  const details = encodeURIComponent(
    `Next Lesson Focus: ${lesson.notes || 'Syllabus progression'}\nPupil Note: ${
      lesson.pupilNotes || 'None'
    }`
  );
  const location = encodeURIComponent(lesson.pickupLocation);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

function buildOutlookWebUrl(lesson) {
  const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
  const startIso = `${lesson.date}T${lesson.startTime}:00`;
  const endIso = `${lesson.date}T${endStr}:00`;
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
    'Driving Lesson - Learn To Pass With Us'
  )}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(
    endIso
  )}&location=${encodeURIComponent(lesson.pickupLocation)}&body=${encodeURIComponent(
    lesson.notes || 'Driving lesson'
  )}`;
}

function buildYahooCalendarUrl(lesson) {
  const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
  const st = formatICSDateTime(lesson.date, lesson.startTime);
  const et = formatICSDateTime(lesson.date, endStr);
  return `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(
    'Driving Lesson - Learn To Pass With Us'
  )}&st=${st}&et=${et}&in_loc=${encodeURIComponent(
    lesson.pickupLocation
  )}&desc=${encodeURIComponent(lesson.notes || 'Driving lesson')}`;
}

// ============================================================================
// SUB-COMPONENT: VW GOLF MK5 GTI (EN56 WXA) VEHICLE SHOWCASE CARD
// ============================================================================
function VWGolfGTIBadge({
  customCarPhoto,
  onUploadCarPhoto,
  onResetCarPhoto,
  isInstructor = false,
  compact = true
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCarPhoto?.(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 text-white border border-zinc-800 shadow-lg p-5">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-extrabold uppercase tracking-wider">
            Official Dual-Control Training Car
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Black Volkswagen Golf Mk5 GTI
          </h3>
          <p className="text-xs text-zinc-300">
            Manual 6-Speed • He-Man Dual Controls • Chichester &amp; West Sussex Test Centres
          </p>

          {isInstructor && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
              >
                <Camera className="w-3.5 h-3.5" />
                {customCarPhoto ? 'Change Car Photo' : 'Upload Your Car Photo'}
              </button>
              {customCarPhoto && (
                <button
                  type="button"
                  onClick={onResetCarPhoto}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Custom Photo or Crisp Vector Illustration of Black Golf Mk5 GTI (EN56 WXA) */}
        <div className={`flex-shrink-0 ${compact ? 'sm:w-56' : 'sm:w-64'}`}>
          {customCarPhoto ? (
            <img
              src={customCarPhoto}
              alt="Black Volkswagen Golf Mk5 GTI EN56 WXA"
              className="w-full h-32 object-cover rounded-xl border border-zinc-700 shadow-md"
            />
          ) : (
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-col items-center">
              <svg viewBox="0 0 280 110" className="w-full h-24">
                <rect x="82" y="10" width="116" height="18" rx="4" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
                <rect x="85" y="13" width="14" height="12" rx="2" fill="#dc2626" />
                <text x="92" y="22" fontSize="9" fontWeight="900" fill="#ffffff" textAnchor="middle">L</text>
                <rect x="181" y="13" width="14" height="12" rx="2" fill="#dc2626" />
                <text x="188" y="22" fontSize="9" fontWeight="900" fill="#ffffff" textAnchor="middle">L</text>
                <text x="140" y="22" fontSize="7" fontWeight="800" fill="#18181b" textAnchor="middle">Learn To Pass</text>
                <path
                  d="M25 74 L35 52 L78 30 L175 28 L228 48 L255 56 L258 76 L25 76 Z"
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth="2"
                />
                <path d="M84 35 L132 34 L132 50 L66 50 Z" fill="#27272a" />
                <path d="M138 34 L174 34 L204 50 L138 50 Z" fill="#27272a" />
                <line x1="25" y1="62" x2="256" y2="62" stroke="#dc2626" strokeWidth="2.5" />
                <rect x="28" y="66" width="44" height="11" rx="2" fill="#facc15" />
                <text x="50" y="74" fontSize="6.5" fontWeight="900" fill="#09090b" textAnchor="middle">EN56 WXA</text>
                <circle cx="72" cy="78" r="18" fill="#09090b" stroke="#71717a" strokeWidth="3" />
                <circle cx="72" cy="78" r="9" fill="#d4d4d8" />
                <circle cx="212" cy="78" r="18" fill="#09090b" stroke="#71717a" strokeWidth="3" />
                <circle cx="212" cy="78" r="9" fill="#d4d4d8" />
              </svg>
              <span className="mt-1 bg-amber-400 text-zinc-950 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                EN56 WXA
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT SEED DATA GENERATORS (EMPTY BY DEFAULT FOR PRODUCTION USE)
// ============================================================================
function getInitialSeedData() {
  return {
    accounts: [],
    lessons: [],
    unavailability: [],
    messages: [],
    syllabus: {}
  };
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const seed = useMemo(() => getInitialSeedData(), []);

  // Cloud Auth & Sync Status
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);

  // Persisted State (Synced with Cloud Firestore + LocalStorage backup)
  const [activeUserId, setActiveUserId] = useState(() => loadFromStorage('activeUserId', null));
  const [accounts, setAccounts] = useState(() => loadFromStorage('accounts', seed.accounts));
  const [lessons, setLessons] = useState(() => loadFromStorage('lessons', seed.lessons));
  const [unavailability, setUnavailability] = useState(() => loadFromStorage('unavailability', seed.unavailability));
  const [messages, setMessages] = useState(() => loadFromStorage('messages', seed.messages));
  const [syllabusProgress, setSyllabusProgress] = useState(() => loadFromStorage('syllabus', seed.syllabus));
  const [customCarPhoto, setCustomCarPhoto] = useState(() => loadFromStorage('customCarPhoto', null));
  const [settings, setSettings] = useState(() =>
    loadFromStorage('settings', {
      workStart: '07:00',
      workEnd: '18:00',
      primaryGoogleConnected: true,
      secondaryIcalUrl: '',
      secondaryShiftEnabled: true,
      secondaryShiftStart: '06:00',
      secondaryShiftEnd: '17:00',
      secondaryShiftDays: [],
      lastRotaSyncAt: null,
      syncedRotaCount: 0
    })
  );
  const [rotaEvents, setRotaEvents] = useState(() => loadFromStorage('rotaEvents', []));

  // 1. Authenticate with Cloud Backend FIRST
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Cloud authentication error:', err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setCloudUser(u));
    return () => unsubscribe();
  }, []);

  // 2. Real-Time Cloud Firestore Listeners
  useEffect(() => {
    if (!cloudUser || !db) return;

    const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    const lessonsCol = collection(db, 'artifacts', appId, 'public', 'data', 'lessons');
    const unavailCol = collection(db, 'artifacts', appId, 'public', 'data', 'unavailability');
    const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const syllabusCol = collection(db, 'artifacts', appId, 'public', 'data', 'syllabus');
    const configDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'schoolConfig', 'main');

    const unsubAccounts = onSnapshot(
      accountsCol,
      (snap) => {
        setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCloudReady(true);
      },
      (err) => console.error('Accounts sync error:', err)
    );

    const unsubLessons = onSnapshot(
      lessonsCol,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
        setLessons(list);
      },
      (err) => console.error('Lessons sync error:', err)
    );

    const unsubUnavail = onSnapshot(
      unavailCol,
      (snap) => {
        setUnavailability(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Unavailability sync error:', err)
    );

    const unsubMessages = onSnapshot(
      messagesCol,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setMessages(list);
      },
      (err) => console.error('Messages sync error:', err)
    );

    const unsubSyllabus = onSnapshot(
      syllabusCol,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data().skills || {};
        });
        setSyllabusProgress(map);
      },
      (err) => console.error('Syllabus sync error:', err)
    );

    const unsubConfig = onSnapshot(
      configDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.settings) setSettings(data.settings);
          if (data.customCarPhoto !== undefined) setCustomCarPhoto(data.customCarPhoto);
          if (Array.isArray(data.rotaEvents)) setRotaEvents(data.rotaEvents);
        } else {
          setDoc(configDocRef, { settings, customCarPhoto: null, rotaEvents: [] });
        }
      },
      (err) => console.error('School config sync error:', err)
    );

    return () => {
      unsubAccounts();
      unsubLessons();
      unsubUnavail();
      unsubMessages();
      unsubSyllabus();
      unsubConfig();
    };
  }, [cloudUser, seed]);

  // Keep localStorage cache updated
  useEffect(() => saveToStorage('activeUserId', activeUserId), [activeUserId]);
  useEffect(() => saveToStorage('accounts', accounts), [accounts]);
  useEffect(() => saveToStorage('lessons', lessons), [lessons]);
  useEffect(() => saveToStorage('unavailability', unavailability), [unavailability]);
  useEffect(() => saveToStorage('messages', messages), [messages]);
  useEffect(() => saveToStorage('syllabus', syllabusProgress), [syllabusProgress]);
  useEffect(() => saveToStorage('customCarPhoto', customCarPhoto), [customCarPhoto]);
  useEffect(() => saveToStorage('settings', settings), [settings]);
  useEffect(() => saveToStorage('rotaEvents', rotaEvents), [rotaEvents]);

  // Cloud Write Helpers
  const persistCloudDoc = async (colName, docId, payload) => {
    if (!cloudUser || !db) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, docId), payload, {
        merge: true
      });
    } catch (err) {
      console.error(`Failed to write ${colName}/${docId}:`, err);
    }
  };

  const removeCloudDoc = async (colName, docId) => {
    if (!cloudUser || !db) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, docId));
    } catch (err) {
      console.error(`Failed to delete ${colName}/${docId}:`, err);
    }
  };

  // UI Navigation & Modal States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getUpcomingDateStr(1));
  const [toastNotification, setToastNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [declineModalLesson, setDeclineModalLesson] = useState(null);
  const [declineReasonText, setDeclineReasonText] = useState('');
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showInstructorAddLessonModal, setShowInstructorAddLessonModal] = useState(false);
  const [selectedPupilForPlan, setSelectedPupilForPlan] = useState('');
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  const notify = (title, description, type = 'success') => {
    setToastNotification({ title, description, type, id: Date.now() });
    setTimeout(() => {
      setToastNotification((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  };

  const currentUser = useMemo(() => {
    if (!activeUserId) return null;
    return accounts.find((a) => a.id === activeUserId) || null;
  }, [accounts, activeUserId]);

  const isInstructor = currentUser?.role === 'instructor';
  const pupilsList = useMemo(() => accounts.filter((a) => a.role === 'pupil'), [accounts]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter((m) => m.toId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

  // ============================================================================
  // SMART AVAILABILITY & DISTANCE BUFFER ENGINE
  // ============================================================================
  const computeSlotAvailability = (targetDate, pupilAccount, durationMins) => {
    const startLimit = timeToMinutes(settings.workStart || '07:00');
    const endLimit = timeToMinutes(settings.workEnd || '18:00');
    const slots = [];

    const dayRotaBlocks = settings.secondaryShiftEnabled
      ? rotaEvents.filter((r) => r.date === targetDate)
      : [];
    const dayUnavailBlocks = [
      ...unavailability.filter((u) => u.date === targetDate),
      ...dayRotaBlocks
    ];
    const isAllDayBlocked = dayUnavailBlocks.some((u) => u.allDay);

    const [y, m, d] = targetDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const hasSecondaryShift =
      settings.secondaryShiftEnabled &&
      Array.isArray(settings.secondaryShiftDays) &&
      settings.secondaryShiftDays.includes(dayOfWeek);

    const dayLessons = lessons
      .filter((l) => l.date === targetDate && (l.status === 'confirmed' || l.status === 'pending'))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    for (let candStart = startLimit; candStart <= endLimit; candStart += 15) {
      const candEnd = candStart + durationMins;
      const timeLabel = minutesToTime(candStart);

      if (isAllDayBlocked) {
        slots.push({
          time: timeLabel,
          available: false,
          reason: 'Instructor Unavailable (All Day Holiday/Block)'
        });
        continue;
      }

      let blockedReason = null;
      for (const block of dayUnavailBlocks) {
        const bStart = timeToMinutes(block.startTime);
        const bEnd = timeToMinutes(block.endTime);
        if (candStart < bEnd && candEnd > bStart) {
          blockedReason = `Blocked: ${block.title} (${block.startTime}-${block.endTime})`;
          break;
        }
      }

      if (!blockedReason && hasSecondaryShift) {
        const sStart = timeToMinutes(settings.secondaryShiftStart || '06:00');
        const sEnd = timeToMinutes(settings.secondaryShiftEnd || '17:00');
        if (candStart < sEnd && candEnd > sStart) {
          blockedReason = `2nd Google Cal Shift (${settings.secondaryShiftStart}-${settings.secondaryShiftEnd})`;
        }
      }

      if (blockedReason) {
        slots.push({ time: timeLabel, available: false, reason: blockedReason });
        continue;
      }

      let conflictReason = null;
      let travelNote = null;

      for (const existing of dayLessons) {
        const exStart = timeToMinutes(existing.startTime);
        const exEnd = exStart + existing.durationMins;

        if (candStart < exEnd && candEnd > exStart) {
          conflictReason = `Booked (${existing.startTime}-${minutesToTime(exEnd)})`;
          break;
        }

        const isSamePupil = pupilAccount && existing.pupilId === pupilAccount.id;
        const pupilLoc = pupilAccount?.postcode || 'PO19 - Chichester City Centre';

        if (candStart >= exEnd) {
          if (isSamePupil && candStart === exEnd) {
            travelNote = 'Consecutive slot with same pupil (0m travel gap)';
          } else {
            const metrics = calculateTravelMetrics(existing.dropoffLocation, pupilLoc);
            const requiredGap = isSamePupil ? 15 : metrics.bufferedMins;
            const actualGap = candStart - exEnd;
            if (actualGap < requiredGap) {
              conflictReason = `Need ${requiredGap}m buffer (${metrics.miles} mi from ${existing.dropoffLocation.split('-')[0].trim()} + 10m notes, rounded up)`;
              break;
            } else if (actualGap <= requiredGap + 30) {
              travelNote = `${metrics.miles} mi from prev lesson (${metrics.driveMins}m drive + 10m notes = ${metrics.bufferedMins}m buffer)`;
            }
          }
        }

        if (candEnd <= exStart) {
          if (isSamePupil && candEnd === exStart) {
            travelNote = 'Consecutive slot before existing lesson';
          } else {
            const metrics = calculateTravelMetrics(pupilLoc, existing.pickupLocation);
            const requiredGap = isSamePupil ? 15 : metrics.bufferedMins;
            const actualGap = exStart - candEnd;
            if (actualGap < requiredGap) {
              conflictReason = `Leaves only ${actualGap}m before next lesson (${requiredGap}m needed to reach ${existing.pickupLocation.split('-')[0].trim()})`;
              break;
            }
          }
        }
      }

      if (conflictReason) {
        slots.push({ time: timeLabel, available: false, reason: conflictReason });
      } else {
        slots.push({
          time: timeLabel,
          available: true,
          travelNote: travelNote || 'Clear schedule & travel buffer verified'
        });
      }
    }

    return slots;
  };

  // ============================================================================
  // CORE ACTIONS
  // ============================================================================
  const sendAutomatedMessage = (toId, toName, text, type = 'system') => {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromId: currentUser?.id || 'instructor-main',
      fromName: isInstructor ? 'Learn To Pass With Us' : (currentUser?.name || 'Pupil'),
      toId,
      toName,
      text,
      timestamp: new Date().toISOString(),
      type,
      read: false
    };
    setMessages((prev) => [newMsg, ...prev]);
    persistCloudDoc('messages', newMsg.id, newMsg);
  };

  const handleCreateBookingRequest = ({
    pupilAccount,
    date,
    startTime,
    durationMins,
    pickupLocation,
    pupilNotes,
    notes,
    isOutOfHours = false,
    autoConfirm = false
  }) => {
    const status = autoConfirm ? 'confirmed' : 'pending';
    const defaultFocus = notes || 'Progressive syllabus driving & junction/roundabout control';
    const instructorAccount = accounts.find((a) => a.role === 'instructor');
    const instructorTargetId = instructorAccount?.id || 'instructor-main';
    const instructorTargetName = instructorAccount?.name || 'Instructor';

    const newLesson = {
      id: `lesson-${Date.now()}`,
      pupilId: pupilAccount.id,
      pupilName: pupilAccount.name,
      date,
      startTime,
      durationMins,
      pickupLocation,
      dropoffLocation: pickupLocation,
      status,
      notes: defaultFocus,
      pupilNotes: pupilNotes || '',
      reminderSent: false,
      pupilConfirmedAttendance: false,
      isOutOfHours
    };

    setLessons((prev) =>
      [...prev, newLesson].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    );
    persistCloudDoc('lessons', newLesson.id, newLesson);

    if (autoConfirm) {
      sendAutomatedMessage(
        pupilAccount.id,
        pupilAccount.name,
        `Your lesson with Learn To Pass With Us on ${formatReadableDate(date)} at ${startTime} (${durationMins / 60} hr${durationMins > 60 ? 's' : ''}) has been booked & confirmed! Pick-up: ${pickupLocation}. Next lesson focus: ${defaultFocus}.`
      );
      notify('Lesson Added & Confirmed', `Added ${pupilAccount.name} on ${formatReadableDate(date)} at ${startTime}.`);
    } else {
      sendAutomatedMessage(
        instructorTargetId,
        instructorTargetName,
        `New ${isOutOfHours ? 'OUT-OF-HOURS ' : ''}booking request from ${pupilAccount.name} for ${formatReadableDate(date)} at ${startTime} (${durationMins / 60}h) in ${pickupLocation}.`
      );
      notify(
        'Booking Request Sent!',
        `Your ${startTime} slot on ${formatReadableDate(date)} is awaiting instructor approval.`
      );
    }
  };

  const handleApproveLesson = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'confirmed' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { status: 'confirmed' });

    const confirmMsg = `Your lesson with Learn To Pass With Us on ${formatReadableDate(lesson.date)} at ${lesson.startTime} (${lesson.durationMins / 60} hr${lesson.durationMins > 60 ? 's' : ''}) is confirmed! Pick-up: ${lesson.pickupLocation}. Next lesson focus: ${lesson.notes || 'Syllabus progression'}.`;

    sendAutomatedMessage(lesson.pupilId, lesson.pupilName, confirmMsg, 'system');
    notify('Lesson Confirmed', `Automated confirmation sent to ${lesson.pupilName}.`);
  };

  const handleDeclineLessonSubmit = () => {
    if (!declineModalLesson) return;
    const lesson = declineModalLesson;
    const reason = declineReasonText.trim() || 'Schedule / travel distance conflict with adjacent booking.';

    setLessons((prev) =>
      prev.map((l) =>
        l.id === lesson.id ? { ...l, status: 'declined', declineReason: reason } : l
      )
    );
    persistCloudDoc('lessons', lesson.id, { status: 'declined', declineReason: reason });

    const declineMsg = `Your lesson request for ${formatReadableDate(lesson.date)} at ${lesson.startTime} (${lesson.durationMins / 60}h) could not be confirmed. Instructor note: "${reason}"`;

    sendAutomatedMessage(lesson.pupilId, lesson.pupilName, declineMsg, 'system');
    notify('Request Declined', `Decline notice and your note sent to ${lesson.pupilName}.`, 'info');
    setDeclineModalLesson(null);
    setDeclineReasonText('');
  };

  const handleCancelLesson = (lesson, cancelledBy = 'instructor') => {
    const instructorAccount = accounts.find((a) => a.role === 'instructor');
    const instructorTargetId = instructorAccount?.id || 'instructor-main';
    const instructorTargetName = instructorAccount?.name || 'Instructor';

    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'cancelled' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { status: 'cancelled' });

    if (cancelledBy === 'instructor') {
      sendAutomatedMessage(
        lesson.pupilId,
        lesson.pupilName,
        `Update from Learn To Pass With Us: Your lesson on ${formatReadableDate(lesson.date)} at ${lesson.startTime} has been cancelled. Please check available slots to rebook.`
      );
    } else {
      sendAutomatedMessage(
        instructorTargetId,
        instructorTargetName,
        `${lesson.pupilName} cancelled their lesson on ${formatReadableDate(lesson.date)} at ${lesson.startTime} (${lesson.pickupLocation}).`
      );
    }

    const candidatePupils = pupilsList.filter((p) => p.id !== lesson.pupilId);
    let notifiedCount = 0;

    for (const p of candidatePupils) {
      const metrics = calculateTravelMetrics(lesson.pickupLocation, p.postcode);
      if (metrics.miles <= 11) {
        notifiedCount++;
        sendAutomatedMessage(
          p.id,
          p.name,
          `Last-Minute Slot Available! A ${lesson.durationMins / 60}-hour slot just opened on ${formatReadableDate(lesson.date)} at ${lesson.startTime} near your area (${metrics.miles} mi from ${lesson.pickupLocation.split('-')[0].trim()}). Book now in the app before it's taken!`
        );
      }
    }

    notify(
      'Lesson Cancelled & Slot Broadcasted',
      `Notified ${notifiedCount} nearby pupil(s) within reachable travel distance of ${lesson.pickupLocation.split('-')[0].trim()}.`
    );
  };

  const handleSend24HrReminder = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, reminderSent: true } : l))
    );
    persistCloudDoc('lessons', lesson.id, { reminderSent: true });
    sendAutomatedMessage(
      lesson.pupilId,
      lesson.pupilName,
      `24-Hour Reminder from Learn To Pass With Us: Your driving lesson is tomorrow (${formatReadableDate(lesson.date)}) at ${lesson.startTime}. Please confirm in the app that your lesson is still going ahead!`
    );
    notify('24-Hour Reminder Sent', `Attendance confirmation prompt sent to ${lesson.pupilName}.`);
  };

  const handlePupilConfirmAttendance = (lesson) => {
    const instructorAccount = accounts.find((a) => a.role === 'instructor');
    const instructorTargetId = instructorAccount?.id || 'instructor-main';
    const instructorTargetName = instructorAccount?.name || 'Instructor';

    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, pupilConfirmedAttendance: true } : l))
    );
    persistCloudDoc('lessons', lesson.id, { pupilConfirmedAttendance: true });
    sendAutomatedMessage(
      instructorTargetId,
      instructorTargetName,
      `${lesson.pupilName} confirmed attendance for tomorrow's lesson (${formatReadableDate(lesson.date)} at ${lesson.startTime}).`
    );
    notify('Attendance Confirmed', 'Your instructor has been notified.');
  };

  const handleUpdateLessonNotes = (lessonId, newInstructorNotes, newPupilNotes) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const updated = {
          ...l,
          notes: typeof newInstructorNotes === 'string' ? newInstructorNotes : l.notes,
          pupilNotes: typeof newPupilNotes === 'string' ? newPupilNotes : l.pupilNotes
        };
        persistCloudDoc('lessons', lessonId, {
          notes: updated.notes,
          pupilNotes: updated.pupilNotes
        });
        return updated;
      })
    );
    notify('Calendar Notes Updated', 'Saved and synced to calendar exports.');
  };

  const handleDeleteAccount = (targetAccount) => {
    setAccounts((prev) => prev.filter((a) => a.id !== targetAccount.id));
    removeCloudDoc('accounts', targetAccount.id);

    setLessons((prev) =>
      prev.map((l) => {
        if (l.pupilId === targetAccount.id && (l.status === 'confirmed' || l.status === 'pending')) {
          persistCloudDoc('lessons', l.id, { status: 'cancelled' });
          return { ...l, status: 'cancelled' };
        }
        return l;
      })
    );

    if (activeUserId === targetAccount.id) {
      setActiveUserId(null);
    }
    notify('Account Deleted', `${targetAccount.name}'s account has been permanently removed.`, 'info');
    setConfirmModal(null);
  };

  if (!currentUser) {
    return (
      <>
        <AuthPortalView
          accounts={accounts}
          customCarPhoto={customCarPhoto}
          cloudReady={cloudReady}
          onLoginSuccess={(acc) => {
            setActiveUserId(acc.id);
            setActiveTab('dashboard');
            notify('Signed In', `Welcome back, ${acc.name}!`);
          }}
          onRegisterAccount={(newAcc) => {
            setAccounts((prev) => [...prev, newAcc]);
            persistCloudDoc('accounts', newAcc.id, newAcc);
            setActiveUserId(newAcc.id);
            setActiveTab('dashboard');
            notify('Account Created', `Welcome to Learn To Pass With Us, ${newAcc.name}!`);
          }}
        />
        {toastNotification && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-zinc-900 text-white border border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl flex-shrink-0 bg-emerald-500/20 text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold">{toastNotification.title}</h4>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{toastNotification.description}</p>
            </div>
          </div>
        )}
      </>
    );
  }

  const navTabs = [
    { id: 'dashboard', label: isInstructor ? 'Home' : 'Lessons' },
    ...(isInstructor
      ? [{ id: 'calendar_sync', label: 'Diary' }]
      : []),
    { id: 'syllabus', label: isInstructor ? 'Pupils' : 'Progress' },
    {
      id: 'messages',
      label: 'Messages',
      badge: unreadCount
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="bg-zinc-950 text-white border-b border-zinc-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-red-500 font-black text-xl leading-none">L</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wide uppercase text-white leading-tight">
                  Learn To Pass With Us
                </h1>
                <span className="hidden lg:inline-block bg-amber-400 text-zinc-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded">
                  EN56 WXA
                </span>
                <span
                  title={cloudReady ? 'Cloud Live Sync Active' : 'Connecting Cloud Sync...'}
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    cloudReady ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-zinc-600'
                  }`}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block">
                Chichester &amp; West Sussex Driving School
              </p>
            </div>
          </div>

          {/* Center: Clean, Uniform Single-Row Navigation Links */}
          <nav className="order-3 md:order-2 w-full md:w-auto flex items-center justify-center gap-1.5 sm:gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/80">
            <span
              className={`hidden sm:inline-block text-[10px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-lg mr-1 ${
                isInstructor
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                  : 'bg-zinc-800 text-emerald-400 border border-zinc-700'
              }`}
            >
              {isInstructor ? 'Instructor' : 'Pupil'}
            </span>

            {navTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wide transition cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-200 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Universal Settings Cog & Sign Out */}
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3">
            {isInstructor && (
              <button
                onClick={() => setShowCreateAccountModal(true)}
                title="Add New Pupil or Instructor"
                className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-bold px-2.5 py-2 rounded-xl transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span className="hidden xl:inline">Add User</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('accounts')}
              title="Account Settings"
              aria-label="Account Settings"
              className={`group flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
              }`}
            >
              <Settings className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
              <span className="text-[9px] font-bold tracking-wide mt-0.5 leading-none">
                Settings
              </span>
            </button>

            <button
              onClick={() => {
                setActiveUserId(null);
                setActiveTab('dashboard');
                notify('Signed Out', 'You have been securely logged out.', 'info');
              }}
              title="Sign Out"
              className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-600/90 text-zinc-300 hover:text-white border border-zinc-700 hover:border-red-500 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-wide mt-0.5 leading-none">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </header>

      {toastNotification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-zinc-900 text-white border border-zinc-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-fade-in">
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${
              toastNotification.type === 'error'
                ? 'bg-red-500/20 text-red-400'
                : toastNotification.type === 'info'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{toastNotification.title}</h4>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{toastNotification.description}</p>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-zinc-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <VWGolfGTIBadge
            customCarPhoto={customCarPhoto}
            onUploadCarPhoto={(dataUrl) => {
              setCustomCarPhoto(dataUrl);
              persistCloudDoc('schoolConfig', 'main', { customCarPhoto: dataUrl });
              notify('Car Photo Updated!', 'Your Black VW Golf GTI (EN56 WXA) photo is now synced across all devices.');
            }}
            onResetCarPhoto={() => {
              setCustomCarPhoto(null);
              persistCloudDoc('schoolConfig', 'main', { customCarPhoto: null });
              notify('Reset to Default Graphic', 'Switched back to the default VW Golf Mk5 GTI graphic.', 'info');
            }}
            isInstructor={isInstructor}
          />
        )}

        {activeTab === 'dashboard' && isInstructor && (
          <InstructorDashboardView
            lessons={lessons}
            pupilsList={pupilsList}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            settings={settings}
            unavailability={unavailability}
            onApprove={handleApproveLesson}
            onOpenDecline={(lesson) => {
              setDeclineModalLesson(lesson);
              setDeclineReasonText('');
            }}
            onCancel={(lesson) => handleCancelLesson(lesson, 'instructor')}
            onSendReminder={handleSend24HrReminder}
            onUpdateNotes={handleUpdateLessonNotes}
            onOpenAddLesson={() => setShowInstructorAddLessonModal(true)}
            onSelectPupilSyllabus={(pid) => {
              setSelectedPupilForPlan(pid);
              setActiveTab('syllabus');
            }}
          />
        )}

        {activeTab === 'dashboard' && !isInstructor && (
          <PupilDashboardView
            pupil={currentUser}
            lessons={lessons}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            settings={settings}
            computeSlotAvailability={computeSlotAvailability}
            onBookRequest={handleCreateBookingRequest}
            onCancelLesson={(lesson) => handleCancelLesson(lesson, 'pupil')}
            onConfirmAttendance={handlePupilConfirmAttendance}
            onUpdateNotes={handleUpdateLessonNotes}
            copiedFeedUrl={copiedFeedUrl}
            setCopiedFeedUrl={setCopiedFeedUrl}
            notify={notify}
          />
        )}

        {activeTab === 'syllabus' && (
          <SyllabusFlowchartView
            isInstructor={isInstructor}
            currentUser={currentUser}
            pupilsList={pupilsList}
            selectedPupilId={isInstructor ? selectedPupilForPlan : currentUser.id}
            setSelectedPupilId={setSelectedPupilForPlan}
            syllabusProgress={syllabusProgress}
            setSyllabusProgress={setSyllabusProgress}
            onPersistSyllabus={(pid, updatedSkills) =>
              persistCloudDoc('syllabus', pid, { skills: updatedSkills })
            }
            notify={notify}
          />
        )}

        {activeTab === 'messages' && (
          <MessagingCenterView
            currentUser={currentUser}
            isInstructor={isInstructor}
            pupilsList={pupilsList}
            accounts={accounts}
            messages={messages}
            setMessages={setMessages}
            onMarkRead={(msgId) => persistCloudDoc('messages', msgId, { read: true })}
            onSendMessage={sendAutomatedMessage}
            notify={notify}
          />
        )}

        {activeTab === 'calendar_sync' && isInstructor && (
          <CalendarSyncAndUnavailabilityView
            settings={settings}
            setSettings={setSettings}
            onPersistSettings={(newSettings) =>
              persistCloudDoc('schoolConfig', 'main', { settings: newSettings })
            }
            rotaEvents={rotaEvents}
            onSyncRotaEvents={(parsedEvents, updatedSettings) => {
              setRotaEvents(parsedEvents);
              setSettings(updatedSettings);
              persistCloudDoc('schoolConfig', 'main', {
                rotaEvents: parsedEvents,
                settings: updatedSettings
              });
            }}
            unavailability={unavailability}
            setUnavailability={setUnavailability}
            onAddCloudUnavail={(block) => persistCloudDoc('unavailability', block.id, block)}
            onDeleteCloudUnavail={(blockId) => removeCloudDoc('unavailability', blockId)}
            onOpenGoogleGuide={() => setShowGoogleGuideModal(true)}
            notify={notify}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountManagementView
            currentUser={currentUser}
            isInstructor={isInstructor}
            accounts={accounts}
            onOpenCreate={() => setShowCreateAccountModal(true)}
            onRequestDelete={(acc) =>
              setConfirmModal({
                title: `Delete ${acc.role === 'instructor' ? 'Instructor' : 'Pupil'} Account?`,
                message: `Are you sure you want to permanently delete "${acc.name}"? Any active future lessons for this account will be cancelled automatically.`,
                confirmLabel: 'Yes, Delete Account',
                onConfirm: () => handleDeleteAccount(acc)
              })
            }
          />
        )}
      </main>

      {declineModalLesson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Decline Booking Request
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Declining <strong>{declineModalLesson.pupilName}</strong> on{' '}
              <strong>{formatReadableDate(declineModalLesson.date)}</strong> at{' '}
              <strong>{declineModalLesson.startTime}</strong>. Add a message explaining why or suggesting an alternative time:
            </p>

            <textarea
              rows={3}
              value={declineReasonText}
              onChange={(e) => setDeclineReasonText(e.target.value)}
              placeholder="e.g., Too far from my previous drop-off in Bognor at 2pm — could we do 3:30pm instead?"
              className="w-full mt-3 rounded-xl border border-slate-300 p-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeclineModalLesson(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineLessonSubmit}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Send Decline &amp; Note
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstructorAddLessonModal && (
        <InstructorAddLessonModal
          pupilsList={pupilsList}
          defaultDate={selectedDate}
          onClose={() => setShowInstructorAddLessonModal(false)}
          onCreate={async (payload) => {
            await handleCreateBookingRequest({ ...payload, autoConfirm: true });
            setShowInstructorAddLessonModal(false);
          }}
        />
      )}

      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreated={(newAcc) => {
            setAccounts((prev) => [...prev, newAcc]);
            persistCloudDoc('accounts', newAcc.id, newAcc);
            setShowCreateAccountModal(false);
            notify('Account Created', `${newAcc.name} (${newAcc.role}) can now sign in with their email & password.`);
          }}
        />
      )}

      {showGoogleGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Free Setup: Read Your Other Google Account Calendar
              </h3>
              <button
                onClick={() => setShowGoogleGuideModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <strong>Why this is the easiest &amp; £0 (completely free) method:</strong> Google provides a private read-only <strong>Secret iCal URL</strong> on every Google Calendar (or use your direct work rota <code className="bg-emerald-100 px-1 rounded">.ics</code> / <code className="bg-emerald-100 px-1 rounded">webcal://</code> link). Even if events show as &ldquo;Free&rdquo; in Google Calendar, this app blocks out every shift automatically!
              </div>

              <ol className="list-decimal pl-5 space-y-2.5 text-xs sm:text-sm">
                <li>
                  Open <strong>Google Calendar</strong> on a computer/browser logged into your <strong>other Google account</strong> (or copy your work rota <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.ics</code> feed URL).
                </li>
                <li>
                  On the left sidebar under <strong>&ldquo;My calendars&rdquo;</strong>, hover over your calendar name, click the <strong>three dots (⋮)</strong>, and choose <strong>Settings and sharing</strong>.
                </li>
                <li>
                  Scroll down to the <strong>&ldquo;Integrate calendar&rdquo;</strong> section.
                </li>
                <li>
                  Copy the link labelled <strong>&ldquo;Secret address in iCal format&rdquo;</strong> (it ends in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.ics</code>).
                </li>
                <li>
                  Paste that link into the <strong>Work Rota / 2nd Calendar Feed</strong> box in this app and click <strong>Sync Rota Now</strong>.
                </li>
              </ol>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGoogleGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {confirmModal.title}
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{confirmModal.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: INSTRUCTOR DASHBOARD VIEW
// ============================================================================
function InstructorDashboardView({
  lessons,
  pupilsList,
  selectedDate,
  setSelectedDate,
  settings,
  unavailability,
  onApprove,
  onOpenDecline,
  onCancel,
  onSendReminder,
  onUpdateNotes,
  onOpenAddLesson,
  onSelectPupilSyllabus
}) {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const pendingLessons = useMemo(
    () => lessons.filter((l) => l.status === 'pending'),
    [lessons]
  );

  const dayConfirmedLessons = useMemo(
    () =>
      lessons.filter(
        (l) => l.date === selectedDate && (l.status === 'confirmed' || l.status === 'pending')
      ),
    [lessons, selectedDate]
  );

  const upcomingConfirmed = useMemo(
    () => lessons.filter((l) => l.status === 'confirmed'),
    [lessons]
  );

  const getTravelImpactBadge = (pendingLesson) => {
    const sameDayConfirmed = lessons
      .filter(
        (l) =>
          l.id !== pendingLesson.id &&
          l.date === pendingLesson.date &&
          l.status === 'confirmed'
      )
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const prev = [...sameDayConfirmed]
      .reverse()
      .find((l) => timeToMinutes(l.startTime) + l.durationMins <= timeToMinutes(pendingLesson.startTime));

    if (!prev) {
      return {
        label: 'First lesson / Clear schedule before slot',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }

    if (prev.pupilId === pendingLesson.pupilId) {
      return {
        label: `Consecutive booking with ${prev.pupilName} (distance buffer bypassed)`,
        color: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }

    const metrics = calculateTravelMetrics(prev.dropoffLocation, pendingLesson.pickupLocation);
    const gapMins =
      timeToMinutes(pendingLesson.startTime) - (timeToMinutes(prev.startTime) + prev.durationMins);

    return {
      label: `${metrics.miles} mi from ${prev.pupilName} (${metrics.driveMins}m drive + 10m notes = ${metrics.rawTotalMins}m → rounded up to ${metrics.bufferedMins}m | Actual gap: ${gapMins}m)`,
      color:
        gapMins >= metrics.bufferedMins
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-800 border-amber-200'
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Active Working Window
            </span>
            <span className="text-sm font-extrabold text-slate-800">
              {settings.workStart} – {settings.workEnd}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Pending Approvals
            </span>
            <span className="text-sm font-extrabold text-amber-600">
              {pendingLessons.length} Request(s)
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Work Rota / 2nd Cal
            </span>
            <span className="text-sm font-extrabold text-indigo-600">
              {settings.secondaryShiftEnabled
                ? settings.syncedRotaCount > 0
                  ? `${settings.syncedRotaCount} Rota Shift(s) Synced`
                  : `Active (${settings.secondaryShiftStart}-${settings.secondaryShiftEnd})`
                : 'Off'}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAddLesson}
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          Add Lesson for Pupil
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Pending Slot Requests ({pendingLessons.length})
            </h2>
          </div>
          <span className="text-xs font-semibold text-amber-800">
            All slots require your confirmation
          </span>
        </div>

        {pendingLessons.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No pending lesson requests right now. All requests have been processed!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingLessons.map((req) => {
              const impact = getTravelImpactBadge(req);
              const endTime = minutesToTime(timeToMinutes(req.startTime) + req.durationMins);
              return (
                <div key={req.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-base">{req.pupilName}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-900 text-white">
                        {formatReadableDate(req.date)} • {req.startTime} – {endTime} ({req.durationMins / 60}h)
                      </span>
                      {req.isOutOfHours && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          Early/Late Out-of-Hours Request
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Pick-up: {req.pickupLocation}
                      </span>
                      {req.pupilNotes && (
                        <span className="inline-flex items-center gap-1 text-slate-500 italic">
                          &ldquo;{req.pupilNotes}&rdquo;
                        </span>
                      )}
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${impact.color}`}>
                      <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{impact.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onApprove(req)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm &amp; Send Message
                    </button>
                    <button
                      onClick={() => onOpenDecline(req)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs sm:text-sm font-bold transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline + Note
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Daily Lesson Schedule</h2>
              <p className="text-xs text-slate-500">
                Includes automatic travel + 10-min lesson notes turnaround buffers
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-5 space-y-4">
            {dayConfirmedLessons.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No lessons booked on {formatReadableDate(selectedDate)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select another date or click &ldquo;Add Lesson for Pupil&rdquo; above.
                </p>
              </div>
            ) : (
              dayConfirmedLessons.map((lesson, idx) => {
                const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
                const nextLesson = dayConfirmedLessons[idx + 1];
                let nextBufferInfo = null;
                if (nextLesson) {
                  const m = calculateTravelMetrics(lesson.dropoffLocation, nextLesson.pickupLocation);
                  nextBufferInfo =
                    lesson.pupilId === nextLesson.pupilId
                      ? 'Consecutive lesson with same pupil (0m travel)'
                      : `${m.miles} mi to ${nextLesson.pupilName} (${m.driveMins}m drive + 10m notes = ${m.bufferedMins}m turnaround buffer)`;
                }

                return (
                  <div key={lesson.id} className="space-y-2">
                    <div className="rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition bg-slate-50/50">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm bg-zinc-900 text-white px-2.5 py-0.5 rounded-lg">
                              {lesson.startTime} – {endStr}
                            </span>
                            <span className="font-extrabold text-slate-900">{lesson.pupilName}</span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                lesson.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {lesson.status}
                            </span>
                            {lesson.pupilConfirmedAttendance && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                Attendance Confirmed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            {lesson.pickupLocation}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectPupilSyllabus(lesson.pupilId)}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700"
                          >
                            Lesson Plan
                          </button>
                          <button
                            onClick={() => onCancel(lesson)}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600"
                          >
                            Cancel Slot
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/80">
                        {editingNoteId === lesson.id ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-900"
                              placeholder="What will be worked on in this lesson..."
                            />
                            <button
                              onClick={() => {
                                onUpdateNotes(lesson.id, noteDraft, undefined);
                                setEditingNoteId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                            >
                              Save Note
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-700">Next Lesson Focus: </span>
                              <span className="text-slate-600">{lesson.notes || 'None added yet'}</span>
                              {lesson.pupilNotes && (
                                <span className="block text-indigo-700 mt-0.5">
                                  <strong>Pupil Note:</strong> {lesson.pupilNotes}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setEditingNoteId(lesson.id);
                                setNoteDraft(lesson.notes || '');
                              }}
                              className="text-emerald-700 hover:underline font-bold flex items-center gap-1 flex-shrink-0"
                            >
                              <Edit3 className="w-3 h-3" /> Edit Focus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {nextBufferInfo && (
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
                        <Navigation className="w-3.5 h-3.5 text-amber-600" />
                        <span>Turnaround Buffer: {nextBufferInfo}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">24-Hr Reminder Check</h3>
              <p className="text-xs text-slate-500">
                Ask pupils to confirm attendance 24h prior
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingConfirmed.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming confirmed lessons.</p>
            ) : (
              upcomingConfirmed.map((l) => (
                <div key={l.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">{l.pupilName}</span>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      {formatReadableDate(l.date)} {l.startTime}
                    </span>
                  </div>

                  {l.pupilConfirmedAttendance ? (
                    <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Pupil confirmed going ahead
                    </div>
                  ) : l.reminderSent ? (
                    <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Reminder sent — awaiting pupil reply
                    </div>
                  ) : (
                    <button
                      onClick={() => onSendReminder(l)}
                      className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      Send 24h Confirmation Prompt
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: PUPIL DASHBOARD, SMART SLOT PICKER & MULTI-CALENDAR EXPORT
// ============================================================================
function PupilDashboardView({
  pupil,
  lessons,
  selectedDate,
  setSelectedDate,
  settings,
  computeSlotAvailability,
  onBookRequest,
  onCancelLesson,
  onConfirmAttendance,
  onUpdateNotes,
  copiedFeedUrl,
  setCopiedFeedUrl,
  notify
}) {
  const [durationMins, setDurationMins] = useState(60);
  const [pickupLocation, setPickupLocation] = useState(pupil.postcode || 'PO19 - Chichester City Centre');
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  const [pupilBookingNote, setPupilBookingNote] = useState('');
  const [showCustomTimeRequest, setShowCustomTimeRequest] = useState(false);
  const [customEarlyLateTime, setCustomEarlyLateTime] = useState('06:15');
  const [openCalendarMenuId, setOpenCalendarMenuId] = useState(null);
  const [editingPupilNoteId, setEditingPupilNoteId] = useState(null);
  const [pupilNoteDraft, setPupilNoteDraft] = useState('');

  useEffect(() => {
    setPickupLocation(pupil.postcode || 'PO19 - Chichester City Centre');
    setSelectedSlotTime('');
  }, [pupil]);

  const myLessons = useMemo(
    () => lessons.filter((l) => l.pupilId === pupil.id && l.status !== 'cancelled'),
    [lessons, pupil.id]
  );

  const myConfirmedLessons = useMemo(
    () => myLessons.filter((l) => l.status === 'confirmed'),
    [myLessons]
  );

  const computedSlots = useMemo(() => {
    return computeSlotAvailability(
      selectedDate,
      { ...pupil, postcode: pickupLocation },
      durationMins
    );
  }, [selectedDate, pupil, pickupLocation, durationMins, lessons, settings]);

  const liveSubscriptionFeedUrl = `webcal://learntopasswithus.co.uk/api/calendar-feed/${pupil.id}/lessons.ics`;

  return (
    <div className="space-y-6">
      {myConfirmedLessons
        .filter((l) => l.reminderSent && !l.pupilConfirmedAttendance)
        .map((remLesson) => (
          <div
            key={remLesson.id}
            className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
          >
            <div className="flex items-start gap-3">
              <Bell className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                  24-Hour Lesson Reminder: Please Confirm Attendance
                </h3>
                <p className="text-xs sm:text-sm text-amber-900 mt-0.5">
                  Your lesson is scheduled for <strong>{formatReadableDate(remLesson.date)}</strong> at{' '}
                  <strong>{remLesson.startTime}</strong> ({remLesson.durationMins / 60}h) in{' '}
                  <strong>{remLesson.pickupLocation}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onConfirmAttendance(remLesson)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm"
              >
                Confirm Still Attending
              </button>
              <button
                onClick={() => onCancelLesson(remLesson)}
                className="px-4 py-2 rounded-xl bg-white border border-red-300 hover:bg-red-50 text-red-700 text-xs sm:text-sm font-bold"
              >
                Cancel Lesson
              </button>
            </div>
          </div>
        ))}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Book a Driving Lesson</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available times automatically adjust based on your pick-up location and the instructor&apos;s previous lesson drop-off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1. Select Date</label>
              <input
                type="date"
                value={selectedDate}
                min={getUpcomingDateStr(0)}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlotTime('');
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">2. Lesson Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mins: 60, label: '1 Hr' },
                  { mins: 90, label: '1.5 Hrs' },
                  { mins: 120, label: '2 Hrs' }
                ].map((opt) => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => {
                      setDurationMins(opt.mins);
                      setSelectedSlotTime('');
                    }}
                    className={`py-2 rounded-xl text-xs font-extrabold border transition ${
                      durationMins === opt.mins
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              3. Pick-Up &amp; Drop-Off Area (Used for travel buffer check)
            </label>
            <select
              value={pickupLocation}
              onChange={(e) => {
                setPickupLocation(e.target.value);
                setSelectedSlotTime('');
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {WEST_SUSSEX_LOCATIONS.map((loc) => (
                <option key={loc.code} value={`${loc.code} - ${loc.name}`}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                4. Choose Available Start Time ({settings.workStart} – {settings.workEnd})
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {computedSlots.filter((s) => s.available).length} slots open
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {computedSlots.map((slot) => {
                const isSelected = selectedSlotTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlotTime(slot.time)}
                    title={slot.available ? slot.travelNote : slot.reason}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition ${
                      !slot.available
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40'
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>

            {selectedSlotTime && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>{selectedSlotTime}</strong> selected ({durationMins / 60}h):{' '}
                  {computedSlots.find((s) => s.time === selectedSlotTime)?.travelNote}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              5. Notes / What would you like to work on? (Optional)
            </label>
            <input
              type="text"
              value={pupilBookingNote}
              onChange={(e) => setPupilBookingNote(e.target.value)}
              placeholder="e.g., Reverse bay parking or A27 roundabouts"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
            />
          </div>

          <button
            type="button"
            disabled={!selectedSlotTime}
            onClick={() => {
              onBookRequest({
                pupilAccount: pupil,
                date: selectedDate,
                startTime: selectedSlotTime,
                durationMins,
                pickupLocation,
                pupilNotes: pupilBookingNote,
                isOutOfHours: false,
                autoConfirm: false
              });
              setSelectedSlotTime('');
              setPupilBookingNote('');
            }}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md transition"
          >
            Request Lesson Slot (Pending Instructor Confirmation)
          </button>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCustomTimeRequest(!showCustomTimeRequest)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              Need an earlier (before {settings.workStart}) or later (after {settings.workEnd}) slot? Request custom time
            </button>

            {showCustomTimeRequest && (
              <div className="mt-3 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <p className="text-xs text-indigo-900">
                  Submit a special request outside normal hours. Your instructor will approve or decline with a note.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={customEarlyLateTime}
                    onChange={(e) => setCustomEarlyLateTime(e.target.value)}
                    className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-bold bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onBookRequest({
                        pupilAccount: pupil,
                        date: selectedDate,
                        startTime: customEarlyLateTime,
                        durationMins,
                        pickupLocation,
                        pupilNotes: `[Out-of-Hours Request] ${pupilBookingNote}`,
                        isOutOfHours: true,
                        autoConfirm: false
                      });
                      setShowCustomTimeRequest(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Send Custom Time Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-md border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-extrabold">Sync All Lessons to Your Phone</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Auto-Updates
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Subscribe once so any confirmed lessons, time changes, or lesson focus notes automatically sync to{' '}
              <strong>Apple iOS, Google Calendar, Outlook, or Yahoo</strong>.
            </p>

            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={liveSubscriptionFeedUrl}
                className="bg-transparent text-[11px] font-mono text-zinc-300 flex-1 focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(liveSubscriptionFeedUrl);
                  setCopiedFeedUrl(true);
                  notify('Feed Link Copied', 'Paste this URL into Apple Calendar, Google Calendar, or Outlook.');
                  setTimeout(() => setCopiedFeedUrl(false), 3000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 flex-shrink-0"
              >
                {copiedFeedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFeedUrl ? 'Copied' : 'Copy Feed'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => {
                  const ics = buildLessonICSContent(myConfirmedLessons, pupil.name);
                  downloadICSFile(`LearnToPassWithUs-AllLessons-${pupil.name.replace(/\s+/g, '')}.ics`, ics);
                  notify('All Lessons Downloaded', 'Open the .ics file to import all lessons into Apple/Outlook/Google Calendar.');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-zinc-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Download All (.ics for iOS / Outlook / Google)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              My Bookings ({myLessons.length})
            </h3>

            {myLessons.length === 0 ? (
              <p className="text-xs text-slate-500">You have no active bookings yet. Choose a slot on the left!</p>
            ) : (
              <div className="space-y-3">
                {myLessons.map((lesson) => {
                  const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
                  const isMenuOpen = openCalendarMenuId === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900">
                              {formatReadableDate(lesson.date)}
                            </span>
                            <span className="text-xs font-mono font-bold bg-zinc-900 text-white px-2 py-0.5 rounded">
                              {lesson.startTime} – {endStr}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            {lesson.pickupLocation}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full ${
                            lesson.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lesson.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lesson.status}
                        </span>
                      </div>

                      {lesson.status === 'declined' && lesson.declineReason && (
                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                          <strong>Instructor Note:</strong> {lesson.declineReason}
                        </div>
                      )}

                      <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5">
                        <div>
                          <span className="font-bold text-slate-800">Instructor Focus: </span>
                          <span className="text-slate-600">
                            {lesson.notes || 'Standard syllabus progression'}
                          </span>
                        </div>

                        {editingPupilNoteId === lesson.id ? (
                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={pupilNoteDraft}
                              onChange={(e) => setPupilNoteDraft(e.target.value)}
                              placeholder="Add your own note for the calendar entry..."
                              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs bg-white text-slate-900"
                            />
                            <button
                              onClick={() => {
                                onUpdateNotes(lesson.id, undefined, pupilNoteDraft);
                                setEditingPupilNoteId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-indigo-800">My Lesson Note: </span>
                              <span className="text-slate-600">{lesson.pupilNotes || 'None'}</span>
                            </div>
                            <button
                              onClick={() => {
                                setEditingPupilNoteId(lesson.id);
                                setPupilNoteDraft(lesson.pupilNotes || '');
                              }}
                              className="text-indigo-600 hover:underline font-bold"
                            >
                              Edit Note
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenCalendarMenuId(isMenuOpen ? null : lesson.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800"
                          >
                            <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                            Add to Calendar
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-semibold">
                              <a
                                href={buildGoogleCalendarUrl(lesson)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-slate-800"
                              >
                                <span>Google Calendar</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                              <button
                                onClick={() => {
                                  const ics = buildLessonICSContent([lesson], pupil.name);
                                  downloadICSFile(`DrivingLesson-${lesson.date}.ics`, ics);
                                  setOpenCalendarMenuId(null);
                                }}
                                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-slate-800 text-left"
                              >
                                <span>Apple Calendar (iOS / Mac .ics)</span>
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <a
                                href={buildOutlookWebUrl(lesson)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-slate-800"
                              >
                                <span>Outlook Calendar</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                              <a
                                href={buildYahooCalendarUrl(lesson)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 text-slate-800"
                              >
                                <span>Yahoo Calendar</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            </div>
                          )}
                        </div>

                        {lesson.status !== 'declined' && (
                          <button
                            onClick={() => onCancelLesson(lesson)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: DVSA SYLLABUS & LESSON PLAN FLOWCHART
// ============================================================================
function SyllabusFlowchartView({
  isInstructor,
  currentUser,
  pupilsList,
  selectedPupilId,
  setSelectedPupilId,
  syllabusProgress,
  setSyllabusProgress,
  onPersistSyllabus,
  notify
}) {
  const targetPupilId = isInstructor ? (selectedPupilId || pupilsList[0]?.id) : currentUser.id;
  const targetPupil = pupilsList.find((p) => p.id === targetPupilId) || (isInstructor ? pupilsList[0] : currentUser);
  const pupilSkills = (targetPupil && syllabusProgress[targetPupil.id]) || {};

  const readinessPercent = useMemo(() => {
    const maxScore = DVSA_SYLLABUS_SKILLS.length * 5;
    let earned = 0;
    DVSA_SYLLABUS_SKILLS.forEach((s) => {
      earned += pupilSkills[s.id]?.level || 0;
    });
    return Math.round((earned / maxScore) * 100);
  }, [pupilSkills]);

  const handleUpdateSkill = (skillId, newLevel, newNote) => {
    if (!targetPupil) return;
    const currentEntry = pupilSkills[skillId] || { level: 0, note: '' };
    const updatedSkills = {
      ...(syllabusProgress[targetPupil.id] || {}),
      [skillId]: {
        level: typeof newLevel === 'number' ? newLevel : currentEntry.level,
        note: typeof newNote === 'string' ? newNote : currentEntry.note
      }
    };
    setSyllabusProgress((prev) => ({
      ...prev,
      [targetPupil.id]: updatedSkills
    }));
    onPersistSyllabus?.(targetPupil.id, updatedSkills);
    notify('Lesson Plan Updated', 'DVSA syllabus progress synced to cloud.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            DVSA &lsquo;Ready to Pass?&rsquo; Lesson Flowchart
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step progression flow from Cockpit Drill through to Independent Driving &amp; Mock Test
          </p>
        </div>

        {isInstructor && pupilsList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pupil:</span>
            <select
              value={targetPupil?.id || ''}
              onChange={(e) => setSelectedPupilId(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold bg-white text-slate-900"
            >
              {pupilsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.postcode.split('-')[0].trim()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isInstructor && pupilsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          No pupils registered yet. Once a pupil signs up or you add one, their DVSA Lesson Plan will appear here.
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                  Test Readiness Score — {targetPupil?.name || 'Pupil'}
                </span>
                <h3 className="text-2xl font-black text-emerald-400">{readinessPercent}% Ready</h3>
              </div>
              {targetPupil?.testDate && (
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Practical Test Date</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    {formatReadableDate(targetPupil.testDate)}
                  </span>
                </div>
              )}
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {DVSA_SYLLABUS_SKILLS.map((skill, index) => {
              const entry = pupilSkills[skill.id] || { level: 0, note: '' };
              const levelMeta = SKILL_LEVELS[entry.level] || SKILL_LEVELS[0];

              return (
                <div key={skill.id} className="relative">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5 ${levelMeta.dot}`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {skill.category}
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{skill.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{skill.desc}</p>

                        {isInstructor ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              defaultValue={entry.note}
                              onBlur={(e) => {
                                if (e.target.value !== entry.note) {
                                  handleUpdateSkill(skill.id, entry.level, e.target.value);
                                }
                              }}
                              placeholder="Add instructor progress note..."
                              className="w-full sm:w-80 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          entry.note && (
                            <p className="mt-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                              Instructor Note: {entry.note}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {SKILL_LEVELS.map((lvl) => {
                        const active = entry.level === lvl.value;
                        return (
                          <button
                            key={lvl.value}
                            type="button"
                            disabled={!isInstructor}
                            onClick={() => handleUpdateSkill(skill.id, lvl.value, entry.note)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                              active
                                ? `${lvl.color} ring-2 ring-offset-1 ring-slate-300`
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            } ${!isInstructor ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {index < DVSA_SYLLABUS_SKILLS.length - 1 && (
                    <div className="flex justify-center my-1">
                      <div className="w-0.5 h-4 bg-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: DIRECT MESSAGES & AUTOMATED NOTIFICATIONS
// ============================================================================
function MessagingCenterView({
  currentUser,
  isInstructor,
  pupilsList,
  accounts = [],
  messages,
  setMessages,
  onMarkRead,
  onSendMessage,
  notify
}) {
  const instructorAccount = accounts.find((a) => a.role === 'instructor');
  const [recipientId, setRecipientId] = useState(
    isInstructor ? pupilsList[0]?.id || '' : instructorAccount?.id || 'instructor-main'
  );
  const [text, setText] = useState('');

  useEffect(() => {
    if (isInstructor && !recipientId && pupilsList[0]?.id) {
      setRecipientId(pupilsList[0].id);
    } else if (!isInstructor && instructorAccount?.id) {
      setRecipientId(instructorAccount.id);
    }
  }, [isInstructor, pupilsList, instructorAccount, recipientId]);

  const myMessages = useMemo(() => {
    return messages.filter((m) => m.toId === currentUser.id || m.fromId === currentUser.id);
  }, [messages, currentUser.id]);

  useEffect(() => {
    const unread = myMessages.filter((m) => m.toId === currentUser.id && !m.read);
    if (unread.length > 0) {
      setMessages((prev) =>
        prev.map((m) => (m.toId === currentUser.id && !m.read ? { ...m, read: true } : m))
      );
      unread.forEach((m) => onMarkRead?.(m.id));
    }
  }, [myMessages, currentUser.id, setMessages, onMarkRead]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !recipientId) return;
    const targetName = isInstructor
      ? pupilsList.find((p) => p.id === recipientId)?.name || 'Pupil'
      : instructorAccount?.name || 'Instructor';

    onSendMessage(recipientId, targetName, text.trim(), 'direct');
    setText('');
    notify('Message Sent', `Delivered to ${targetName}.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600" />
          Send Direct Message
        </h3>

        <form onSubmit={handleSend} className="space-y-3">
          {isInstructor ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Pupil</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-900"
              >
                {pupilsList.length === 0 ? (
                  <option value="">No pupils registered yet</option>
                ) : (
                  pupilsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              To: <strong>Learn To Pass With Us ({instructorAccount?.name || 'Instructor'})</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about lesson times, pick-up location, or test prep..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!recipientId}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold shadow-sm"
          >
            Send Message
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-base font-extrabold text-slate-900">
          Inbox &amp; Automated Booking Notifications ({myMessages.length})
        </h3>

        {myMessages.length === 0 ? (
          <p className="text-xs text-slate-500">No messages yet.</p>
        ) : (
          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {myMessages.map((msg) => {
              const isIncoming = msg.toId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border ${
                    msg.type === 'system'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : isIncoming
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-zinc-900 text-white border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-extrabold">
                      {isIncoming ? `From: ${msg.fromName}` : `To: ${msg.toName}`}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        !isIncoming && msg.type !== 'system' ? 'text-zinc-400' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">{msg.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: UNAVAILABILITY & DUAL GOOGLE CALENDAR SYNC
// ============================================================================
function CalendarSyncAndUnavailabilityView({
  settings,
  setSettings,
  onPersistSettings,
  rotaEvents = [],
  onSyncRotaEvents,
  unavailability,
  setUnavailability,
  onAddCloudUnavail,
  onDeleteCloudUnavail,
  onOpenGoogleGuide,
  notify
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getUpcomingDateStr(2));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');

  const [workStart, setWorkStart] = useState(settings.workStart || '07:00');
  const [workEnd, setWorkEnd] = useState(settings.workEnd || '18:00');
  const [icalUrl, setIcalUrl] = useState(settings.secondaryIcalUrl || '');
  const [shiftEnabled, setShiftEnabled] = useState(Boolean(settings.secondaryShiftEnabled));
  const [shiftStart, setShiftStart] = useState(settings.secondaryShiftStart || '06:00');
  const [shiftEnd, setShiftEnd] = useState(settings.secondaryShiftEnd || '17:00');
  const [shiftDays, setShiftDays] = useState(settings.secondaryShiftDays || []);
  const [isSyncingRota, setIsSyncingRota] = useState(false);

  const handleSyncWorkRotaFeed = async (targetUrl = icalUrl) => {
    const cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) {
      notify('Paste Your Work Rota Link First', 'Enter your .ics or webcal:// work rota feed URL above.', 'error');
      return;
    }

    const httpUrl = cleanUrl.replace(/^webcal:\/\//i, 'https://');
    setIsSyncingRota(true);

    try {
      let icsContent = '';
      try {
        const directRes = await fetch(httpUrl);
        if (directRes.ok) {
          icsContent = await directRes.text();
        }
      } catch (_) {
        // Fallback to CORS relay below
      }

      if (!icsContent || !icsContent.includes('BEGIN:VCALENDAR')) {
        const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(httpUrl)}`);
        if (!proxyRes.ok) {
          throw new Error('Could not reach the work rota feed URL.');
        }
        icsContent = await proxyRes.text();
      }

      if (!icsContent.includes('BEGIN:VCALENDAR')) {
        throw new Error('The link did not return a valid .ics calendar feed.');
      }

      const parsedEvents = parseICSFeedEvents(icsContent);
      const updatedSettings = {
        ...settings,
        workStart,
        workEnd,
        secondaryIcalUrl: cleanUrl,
        secondaryShiftEnabled: true,
        secondaryShiftStart: shiftStart,
        secondaryShiftEnd: shiftEnd,
        secondaryShiftDays: shiftDays,
        lastRotaSyncAt: new Date().toISOString(),
        syncedRotaCount: parsedEvents.length
      };

      setShiftEnabled(true);
      onSyncRotaEvents?.(parsedEvents, updatedSettings);
      notify(
        `Synced ${parsedEvents.length} Rota Shift(s)!`,
        'All events from your work rota now block pupil bookings—even if marked "Free" in Google Calendar.'
      );
    } catch (err) {
      notify(
        'Could Not Fetch Feed Directly',
        err.message || 'Check that the link is the original .ics / webcal:// rota URL.',
        'error'
      );
    } finally {
      setIsSyncingRota(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const updated = {
      ...settings,
      workStart,
      workEnd,
      secondaryIcalUrl: icalUrl,
      secondaryShiftEnabled: shiftEnabled,
      secondaryShiftStart: shiftStart,
      secondaryShiftEnd: shiftEnd,
      secondaryShiftDays: shiftDays
    };
    setSettings(updated);
    onPersistSettings?.(updated);
    notify('Schedule & Google Sync Saved', 'Pupil booking slots updated across all devices.');
  };

  const handleAddUnavailability = (e) => {
    e.preventDefault();
    const newBlock = {
      id: `unavail-${Date.now()}`,
      title: title.trim() || (allDay ? 'Holiday / Day Off' : 'Personal Appointment'),
      date,
      allDay,
      startTime: allDay ? '00:00' : startTime,
      endTime: allDay ? '23:59' : endTime,
      source: 'manual'
    };
    setUnavailability((prev) => [...prev, newBlock]);
    onAddCloudUnavail?.(newBlock);
    setTitle('');
    notify('Unavailability Added', 'Those hours are now blocked from pupil bookings.');
  };

  const toggleShiftDay = (dayIdx) => {
    setShiftDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            Holiday &amp; Appointment Unavailability
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Block full days off or specific hours (e.g., 10:00–12:30 appointment) so pupils cannot book during them.
          </p>
        </div>

        <form onSubmit={handleAddUnavailability} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Label</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer Holiday, MOT for EN56 WXA, Dentist"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>

            <div className="pt-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                All Day Unavailable
              </label>
            </div>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold"
          >
            Block Out Time
          </button>
        </form>

        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Active Blocked Periods ({unavailability.length})
          </h4>
          {unavailability.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs"
            >
              <div>
                <span className="font-extrabold text-slate-900">{u.title}</span>
                <span className="block text-slate-500 mt-0.5">
                  {formatReadableDate(u.date)} •{' '}
                  {u.allDay ? 'All Day' : `${u.startTime} – ${u.endTime}`}
                </span>
              </div>
              <button
                onClick={() => {
                  setUnavailability((prev) => prev.filter((item) => item.id !== u.id));
                  onDeleteCloudUnavail?.(u.id);
                  notify('Block Removed', 'Time window reopened for bookings.', 'info');
                }}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                title="Remove Block"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Dual Google Calendar &amp; Working Hours
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sync your primary driving calendar + read busy shifts from your other Google account or work rota.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGoogleGuide}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 flex-shrink-0"
          >
            <Info className="w-3.5 h-3.5" /> Setup Guide
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Standard Driving Day Hours
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">First Lesson Start</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Last Lesson Start</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                Work Rota / 2nd Calendar Feed (.ics / webcal://)
              </h4>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftEnabled}
                  onChange={(e) => setShiftEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                Enabled
              </label>
            </div>

            <div className="p-2.5 rounded-lg bg-white/90 border border-indigo-200 text-[11px] text-indigo-950 leading-relaxed">
              <strong>Ignores Google &ldquo;Free&rdquo; Status:</strong> Even if your imported work rota shows as <em>Free</em> instead of <em>Busy</em> in Google Calendar, every shift event in this feed automatically blocks pupil bookings during those hours.
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                Work Rota .ics / webcal:// URL (or Private Google iCal link)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  placeholder="https://... or webcal://... (.ics feed URL)"
                  className="flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-mono bg-white text-slate-900"
                />
                <button
                  type="button"
                  disabled={isSyncingRota}
                  onClick={() => handleSyncWorkRotaFeed(icalUrl)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRota ? 'animate-spin' : ''}`} />
                  {isSyncingRota ? 'Syncing...' : 'Sync Rota Now'}
                </button>
              </div>
              {rotaEvents.length > 0 && (
                <p className="text-[11px] font-bold text-emerald-700 mt-1.5">
                  {rotaEvents.length} work rota shift(s) actively blocking availability
                  {settings.lastRotaSyncAt
                    ? ` (Last synced: ${new Date(settings.lastRotaSyncAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })})`
                    : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Fallback Recurring Shift Start
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-bold bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Fallback Recurring Shift End
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 px-3 py-1.5 text-xs font-bold bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-indigo-900 mb-1.5">
                Optional Fixed Weekly Shift Days (Leave all unselected if using your live .ics rota link above):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, idx) => {
                  const active = shiftDays.includes(idx);
                  return (
                    <button
                      key={dName}
                      type="button"
                      onClick={() => toggleShiftDay(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {dName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm"
          >
            Save Working Hours &amp; Google Calendar Rules
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ACCOUNT MANAGEMENT & DELETION CONTROLS
// ============================================================================
function AccountManagementView({ currentUser, isInstructor, accounts, onOpenCreate, onRequestDelete }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Account &amp; Profile Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isInstructor
              ? 'As Instructor, you can create or delete any Pupil or Instructor account.'
              : 'Manage your pupil profile or permanently delete your own account.'}
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Create New Account
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Logged In Profile ({currentUser.role})
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1.5">{currentUser.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.email} • {currentUser.postcode}
          </p>
        </div>

        <button
          onClick={() => onRequestDelete(currentUser)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold"
        >
          <Trash2 className="w-4 h-4" />
          Delete My Own Account
        </button>
      </div>

      {isInstructor && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">
              All School Accounts ({accounts.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{acc.name}</span>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                        acc.role === 'instructor'
                          ? 'bg-zinc-900 text-amber-400'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {acc.email} • Pick-up Area: {acc.postcode}
                  </p>
                </div>

                <button
                  onClick={() => onRequestDelete(acc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {acc.role === 'instructor' ? 'Instructor' : 'Pupil'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODAL: INSTRUCTOR DIRECTLY ADDS A LESSON FOR A PUPIL
// ============================================================================
function InstructorAddLessonModal({ pupilsList, defaultDate, onClose, onCreate }) {
  const [pupilId, setPupilId] = useState(pupilsList[0]?.id || '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('15:30');
  const [durationMins, setDurationMins] = useState(60);
  const [notes, setNotes] = useState('Roundabouts, dual carriageways & independent driving');

  const selectedPupil = pupilsList.find((p) => p.id === pupilId) || pupilsList[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPupil) return;
    onCreate({
      pupilAccount: selectedPupil,
      date,
      startTime,
      durationMins,
      pickupLocation: selectedPupil.postcode,
      pupilNotes: '',
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-extrabold text-slate-900">Add Lesson Directly for Pupil</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Books &amp; confirms immediately and attaches your focus notes to the pupil&apos;s calendar entry.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Pupil</label>
            <select
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-900"
            >
              {pupilsList.length === 0 ? (
                <option value="">No pupils registered yet</option>
              ) : (
                pupilsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.postcode.split('-')[0].trim()})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
            <select
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-900"
            >
              <option value={60}>1 Hour (60 mins)</option>
              <option value={90}>1.5 Hours (90 mins)</option>
              <option value={120}>2 Hours (120 mins)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              What we will work on next lesson (Notes)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white text-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPupil}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white"
            >
              Confirm &amp; Notify Pupil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// DEDICATED LOGIN & PUPIL SIGN-UP PORTAL (BRIGHT LIGHT THEME + CAPS LOCK ALERT)
// ============================================================================
function AuthPortalView({ accounts, customCarPhoto, cloudReady, onLoginSuccess, onRegisterAccount }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('PO19 - Chichester City Centre');
  const [role, setRole] = useState('pupil');
  const [instructorCode, setInstructorCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const checkCapsLock = (e) => {
    if (e && typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (typeof e.getModifierState === 'function') {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    window.addEventListener('keyup', handleGlobalKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey);
      window.removeEventListener('keyup', handleGlobalKey);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();
    const matched = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!matched) {
      setErrorMsg('No account found with that email address. Please check your email or register a new pupil account.');
      return;
    }

    const expectedPassword = matched.password || 'Pass2026!';
    if (password !== expectedPassword) {
      setErrorMsg('Incorrect password. Please try again.');
      return;
    }

    onLoginSuccess(matched);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in your full name, email address, and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Please choose a password with at least 6 characters.');
      return;
    }

    const exists = accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      setErrorMsg('An account with this email already exists. Please sign in instead.');
      return;
    }

    if (role === 'instructor' && instructorCode.trim() !== 'EN56WXA') {
      setErrorMsg('Invalid Instructor Access Code. Pupils should register under the Pupil tab.');
      return;
    }

    const newAcc = {
      id: `${role}-${Date.now()}`,
      name: fullName.trim(),
      role,
      email: email.trim(),
      password: password.trim(),
      phone: phone.trim() || '07700 900999',
      postcode,
      testDate: ''
    };

    onRegisterAccount(newAcc);
  };

  const lightInputClass =
    'w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 px-3.5 py-2.5 text-sm shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none [color-scheme:light]';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between [color-scheme:light]">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">
                  Learn To Pass With Us
                </span>
                <span className="bg-amber-400 text-zinc-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40">
                  EN56 WXA
                </span>
              </div>
              <p className="text-xs text-slate-500">Chichester &amp; West Sussex Driving School</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
              cloudReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            {cloudReady ? 'Live Booking Portal' : 'Ready to Sign In'}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> DVSA Approved Driving Instruction
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Book Lessons, Track Your DVSA Progress &amp; Sync Your Calendar.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Sign in to your personal pupil portal to book 1hr, 1.5hr, or 2hr manual driving lessons in Chichester &amp; West Sussex, view your step-by-step DVSA syllabus plan, and sync lessons straight to your phone.
            </p>
          </div>

          <VWGolfGTIBadge customCarPhoto={customCarPhoto} compact={false} />
        </div>

        <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
                mode === 'login'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Pupil Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {capsLockOn && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs font-bold text-amber-900 flex items-center gap-2 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>CAPS LOCK IS ON — Passwords are case-sensitive.</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyUp={checkCapsLock}
                  placeholder="you@example.co.uk"
                  className={lightInputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  {capsLockOn && (
                    <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      CAPS LOCK ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={checkCapsLock}
                    onKeyDown={checkCapsLock}
                    onFocus={checkCapsLock}
                    placeholder="Enter your password"
                    className={`${lightInputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition"
              >
                Sign In to My Portal
              </button>

              <p className="text-[11px] text-center text-slate-500 pt-2">
                New to Learn To Pass With Us? Switch to the{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  New Pupil Sign Up
                </button>{' '}
                tab above to create your personal login.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Registering As:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRole('pupil')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      role === 'pupil'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    Pupil
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      role === 'instructor'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    Instructor
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyUp={checkCapsLock}
                  placeholder="e.g., Charlie Evans"
                  className={lightInputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyUp={checkCapsLock}
                    placeholder="charlie@example.co.uk"
                    className={lightInputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07700 900123"
                    className={lightInputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pick-Up Postcode Area
                </label>
                <select
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className={`${lightInputClass} font-semibold`}
                >
                  {WEST_SUSSEX_LOCATIONS.map((loc) => (
                    <option key={loc.code} value={`${loc.code} - ${loc.name}`}>
                      {loc.code} — {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Create Password</label>
                  {capsLockOn && (
                    <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      CAPS LOCK ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={checkCapsLock}
                    onKeyDown={checkCapsLock}
                    onFocus={checkCapsLock}
                    placeholder="Min. 6 characters"
                    className={`${lightInputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {role === 'instructor' && (
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    Instructor Access Code
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={instructorCode}
                    onChange={(e) => setInstructorCode(e.target.value)}
                    onKeyUp={checkCapsLock}
                    onKeyDown={checkCapsLock}
                    placeholder="Enter school instructor code"
                    className="w-full rounded-xl border border-amber-300 bg-amber-50 text-slate-900 placeholder-slate-400 px-3.5 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 focus:outline-none [color-scheme:light]"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition"
              >
                Create Account &amp; Enter Portal
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} Learn To Pass With Us • Manual Tuition in VW Golf Mk5 GTI (EN56 WXA)
      </footer>
    </div>
  );
}

// ============================================================================
// MODAL: CREATE NEW PUPIL OR INSTRUCTOR ACCOUNT (INSTRUCTOR ADMIN)
// ============================================================================
function CreateAccountModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('pupil');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pass2026!');
  const [postcode, setPostcode] = useState('PO19 - Chichester City Centre');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = `${role}-${Date.now()}`;
    onCreated({
      id,
      name: name.trim(),
      role,
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.co.uk`,
      password: password.trim() || 'Pass2026!',
      phone: '07700 900999',
      postcode
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-extrabold text-slate-900">Create New Account</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Register a new Pupil or additional Driving Instructor with their own login credentials.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              {['pupil', 'instructor'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 rounded-xl text-xs font-extrabold uppercase border ${
                    role === r
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Charlie Evans"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="charlie@example.co.uk"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Login Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Pick-Up / Base Postcode Area
            </label>
            <select
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold bg-white text-slate-900"
            >
              {WEST_SUSSEX_LOCATIONS.map((loc) => (
                <option key={loc.code} value={`${loc.code} - ${loc.name}`}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}