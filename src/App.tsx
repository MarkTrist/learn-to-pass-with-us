import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Users,
  MessageSquare,
  BookOpen,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  Car,
  Home,
  Navigation,
  ExternalLink,
  Check
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================
function getEnvVar(key) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {
    // Ignore environments without import.meta.env
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Ignore non-Node environments
  }
  return '';
}

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || 'AIzaSyDummyKeyForLocalFallback',
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || 'learn-2-pass-with-us.firebaseapp.com',
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || 'learn-2-pass-with-us',
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || 'learn-2-pass-with-us.appspot.com',
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || '000000000000',
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || '1:000000000000:web:0000000000000000'
};

let db = null;
let auth = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
} catch (err) {
  console.warn('Firebase fallback mode active:', err);
}

// ============================================================================
// CONSTANTS & CHICHESTER / WEST SUSSEX POSTCODE AREAS
// ============================================================================
const INSTRUCTOR_ACCESS_CODE = 'EN56WXA';

const WEST_SUSSEX_POSTCODES = [
  'PO19 - Chichester City Centre',
  'PO18 - Bosham, Fishbourne & Lavant',
  'PO20 - Selsey, East Wittering & Pagham',
  'PO21 - Bognor Regis & Aldwick',
  'PO22 - Felpham, Middleton & Yapton',
  'BN18 - Arundel, Fontwell & Slindon',
  'PO10 - Emsworth & Southbourne',
  'GU29 - Midhurst & Cocking'
];

const POSTCODE_COORDS = {
  PO19: { lat: 50.8365, lng: -0.7792 },
  PO18: { lat: 50.855, lng: -0.835 },
  PO20: { lat: 50.768, lng: -0.785 },
  PO21: { lat: 50.785, lng: -0.685 },
  PO22: { lat: 50.795, lng: -0.635 },
  BN18: { lat: 50.854, lng: -0.556 },
  PO10: { lat: 50.847, lng: -0.935 },
  GU29: { lat: 50.985, lng: -0.74 }
};

const DVSA_SYLLABUS_TOPICS = [
  {
    id: 't1',
    stage: 'Stage 1: Basics & Controls',
    title: 'Cockpit Drill, Controls & Moving Off/Stopping',
    desc: 'DSSSM routine, clutch bite point, POM routine & safe kerbs.'
  },
  {
    id: 't2',
    stage: 'Stage 1: Basics & Controls',
    title: 'Steer, Gears & Emerging at T-Junctions',
    desc: 'MSPSL routine, left/right turns, observation & road positioning.'
  },
  {
    id: 't3',
    stage: 'Stage 2: Traffic & Roundabouts',
    title: 'Crossroads, Pedestrian Crossings & Traffic Lights',
    desc: 'Zebra, Pelican, Puffin crossings, filter lights & box junctions.'
  },
  {
    id: 't4',
    stage: 'Stage 2: Traffic & Roundabouts',
    title: 'Mini & Multi-Lane Roundabouts (Chichester Bypass)',
    desc: 'Lane discipline, mirror-signal timing, blockers & safe gaps.'
  },
  {
    id: 't5',
    stage: 'Stage 3: Manoeuvres & Emergency Stop',
    title: 'Parallel Park & Forward/Reverse Bay Parking',
    desc: 'Full 360° observation, slow clutch control & accuracy within bay lines.'
  },
  {
    id: 't6',
    stage: 'Stage 3: Manoeuvres & Emergency Stop',
    title: 'Pull Up on the Right & Controlled Emergency Stop',
    desc: 'Safe pull-up on opposite side, reversing 2 car lengths & ABS braking.'
  },
  {
    id: 't7',
    stage: 'Stage 4: High-Speed & Rural Roads',
    title: 'Dual Carriageways (A27) & Country Lanes',
    desc: 'Slip roads, overtaking safety, national speed limits & sharp bends.'
  },
  {
    id: 't8',
    stage: 'Stage 5: Test Readiness',
    title: 'Independent Driving (Sat-Nav / Signs) & Mock Test',
    desc: 'Show Me / Tell Me questions & full 40-minute Chichester mock test.'
  }
];

const DEFAULT_SETTINGS = {
  workStart: '07:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5, 6],
  primaryCalendarUrl: '',
  workRotaUrl: '',
  lastRotaSync: '',
  autoRemindersEnabled: true,
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsPublicKey: ''
};

// ============================================================================
// DATE, TIME, TRAVEL & ICS PARSING HELPERS
// ============================================================================
function getTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

function timeToMinutes(t) {
  if (!t || !t.includes(':')) return 0;
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

function minutesToTime(mins) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatFriendlyDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function extractPostcodePrefix(locationStr) {
  if (!locationStr) return 'PO19';
  const match = locationStr.toUpperCase().match(/\b(PO19|PO18|PO20|PO21|PO22|BN18|PO10|GU29)\b/);
  return match ? match[1] : 'PO19';
}

function calculateTravelMetrics(locA, locB) {
  const pA = extractPostcodePrefix(locA);
  const pB = extractPostcodePrefix(locB);
  if (pA === pB) {
    return { miles: 2.0, driveMins: 6, bufferedMins: 15 };
  }
  const cA = POSTCODE_COORDS[pA] || POSTCODE_COORDS.PO19;
  const cB = POSTCODE_COORDS[pB] || POSTCODE_COORDS.PO19;
  const dLat = (cA.lat - cB.lat) * 69;
  const dLng = (cA.lng - cB.lng) * 44;
  const straightMiles = Math.sqrt(dLat * dLat + dLng * dLng);
  const roadMiles = Math.max(2.5, Math.round(straightMiles * 1.25 * 10) / 10);
  const driveMins = Math.ceil(roadMiles * 2.2);
  const rawBuffer = driveMins + 10;
  const bufferedMins = Math.ceil(rawBuffer / 15) * 15;
  return { miles: roadMiles, driveMins, bufferedMins };
}

function parseICSDateToken(rawVal) {
  const clean = rawVal.trim();
  const isUTC = clean.endsWith('Z');
  const digits = clean.replace(/[^0-9T]/g, '');
  if (digits.length === 8) {
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6)) - 1;
    const d = Number(digits.slice(6, 8));
    return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
  }
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6)) - 1;
  const d = Number(digits.slice(6, 8));
  const hh = Number(digits.slice(9, 11) || 0);
  const mm = Number(digits.slice(11, 13) || 0);
  const dt = isUTC ? new Date(Date.UTC(y, m, d, hh, mm, 0)) : new Date(y, m, d, hh, mm, 0);
  return { date: dt, isAllDay: false };
}

function parseICSFeedEvents(icsText) {
  if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) return [];
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      if (current.dtstart) {
        const startInfo = parseICSDateToken(current.dtstart);
        const endInfo = current.dtend
          ? parseICSDateToken(current.dtend)
          : {
              date: new Date(startInfo.date.getTime() + 60 * 60 * 1000),
              isAllDay: startInfo.isAllDay
            };

        const startDt = startInfo.date;
        let endDt = endInfo.date;
        if (endDt <= startDt) {
          endDt = new Date(startDt.getTime() + (startInfo.isAllDay ? 24 * 3600000 : 3600000));
        }

        let cursor = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate());
        const lastDay = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
        let guard = 0;

        while (cursor <= lastDay && guard < 14) {
          guard++;
          const isoDate = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(cursor.getDate()).padStart(2, '0')}`;
          const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 0, 0);
          const dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59);

          const segStart = startDt > dayStart ? startDt : dayStart;
          const segEnd = endDt < dayEnd ? endDt : dayEnd;

          if (segEnd > segStart || startInfo.isAllDay) {
            const sTime = startInfo.isAllDay
              ? '00:00'
              : `${String(segStart.getHours()).padStart(2, '0')}:${String(
                  segStart.getMinutes()
                ).padStart(2, '0')}`;
            const eTime = startInfo.isAllDay
              ? '23:59'
              : `${String(segEnd.getHours()).padStart(2, '0')}:${String(
                  segEnd.getMinutes()
                ).padStart(2, '0')}`;
            events.push({
              id: `rota-${isoDate}-${sTime}-${events.length}`,
              date: isoDate,
              startTime: sTime,
              endTime: eTime,
              summary: current.summary || 'Work Rota Shift'
            });
          }
          cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
        }
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const keyPart = line.slice(0, colonIdx).split(';')[0].toUpperCase();
        const valPart = line.slice(colonIdx + 1);
        if (keyPart === 'DTSTART') current.dtstart = valPart;
        if (keyPart === 'DTEND') current.dtend = valPart;
        if (keyPart === 'SUMMARY') current.summary = valPart.replace(/\\,/g, ',');
      }
    }
  }
  return events;
}

function formatICSDateTime(isoDate, timeStr) {
  const dClean = isoDate.replace(/-/g, '');
  const tClean = timeStr.replace(/:/g, '') + '00';
  return `${dClean}T${tClean}`;
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
    const hasDistinctDropoff = l.dropoffLocation && l.dropoffLocation !== l.pickupLocation;
    const desc = `Pick-up: ${l.pickupLocation}${
      hasDistinctDropoff ? ` | Drop-off: ${l.dropoffLocation}` : ''
    } | Instructor Focus: ${l.notes || 'Syllabus progression'}${
      l.pupilNotes ? ` | Pupil Note: ${l.pupilNotes}` : ''
    }`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${l.id}@learntopasswithus.co.uk`,
      `DTSTAMP:${formatICSDateTime(l.date, l.startTime)}Z`,
      `DTSTART:${formatICSDateTime(l.date, l.startTime)}`,
      `DTEND:${formatICSDateTime(l.date, endStr)}`,
      `SUMMARY:Driving Lesson - Learn To Pass With Us (${pupilName})`,
      `LOCATION:${l.pickupLocation}${hasDistinctDropoff ? ` -> Drop-off: ${l.dropoffLocation}` : ''}`,
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
  const hasDistinctDropoff = lesson.dropoffLocation && lesson.dropoffLocation !== lesson.pickupLocation;
  const text = encodeURIComponent('Driving Lesson - Learn To Pass With Us (EN56 WXA)');
  const details = encodeURIComponent(
    `Pick-up: ${lesson.pickupLocation}\nDrop-off: ${
      lesson.dropoffLocation || lesson.pickupLocation
    }\nNext Lesson Focus: ${lesson.notes || 'Syllabus progression'}\nPupil Note: ${
      lesson.pupilNotes || 'None'
    }`
  );
  const location = encodeURIComponent(
    hasDistinctDropoff
      ? `${lesson.pickupLocation} (Drop-off: ${lesson.dropoffLocation})`
      : lesson.pickupLocation
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

// ============================================================================
// SUB-COMPONENT: VW GOLF MK5 GTI (EN56 WXA) VEHICLE SHOWCASE CARD
// ============================================================================
function VWGolfGTIBadge() {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Car className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-extrabold tracking-tight">
              Black Volkswagen Golf Mk5 GTI
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-xs font-black tracking-wider">
              EN56 WXA
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            6-Speed Manual • Dual Controls Fitted • Chichester &amp; West Sussex Test Routes
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>DVSA Approved Manual Instruction</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [cloudReady, setCloudReady] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [unavailability, setUnavailability] = useState([]);
  const [rotaEvents, setRotaEvents] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState([]);
  const [syllabusProgress, setSyllabusProgress] = useState({});

  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem('ltpwu_user_id') || null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [toast, setToast] = useState(null);

  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showInstructorAddLessonModal, setShowInstructorAddLessonModal] = useState(false);
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const triggeredRemindersRef = useRef(new Set());

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    try {
      if (currentUserId) localStorage.setItem('ltpwu_user_id', currentUserId);
      else localStorage.removeItem('ltpwu_user_id');
    } catch {
      // Ignore storage errors
    }
  }, [currentUserId]);

  // ============================================================================
  // FIREBASE REAL-TIME SYNC LISTENERS
  // ============================================================================
  useEffect(() => {
    if (!auth || !db) return;
    let unsubAccounts = () => {};
    let unsubLessons = () => {};
    let unsubUnavail = () => {};
    let unsubConfig = () => {};
    let unsubMsgs = () => {};
    let unsubSyllabus = () => {};

    signInAnonymously(auth).catch((err) => console.warn('Anonymous auth warning:', err));

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setCloudReady(true);

      unsubAccounts = onSnapshot(collection(db, 'accounts'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAccounts(list);
      });

      unsubLessons = onSnapshot(collection(db, 'lessons'), (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
        setLessons(list);
      });

      unsubUnavail = onSnapshot(collection(db, 'unavailability'), (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUnavailability(list);
      });

      unsubConfig = onSnapshot(doc(db, 'schoolConfig', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
          if (Array.isArray(data.rotaEvents)) setRotaEvents(data.rotaEvents);
        }
      });

      unsubMsgs = onSnapshot(collection(db, 'messages'), (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
        setMessages(list);
      });

      unsubSyllabus = onSnapshot(collection(db, 'syllabusProgress'), (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setSyllabusProgress(map);
      });
    });

    return () => {
      unsubAuth();
      unsubAccounts();
      unsubLessons();
      unsubUnavail();
      unsubConfig();
      unsubMsgs();
      unsubSyllabus();
    };
  }, []);

  const persistCloudDoc = async (colName, docId, payload) => {
    if (!db) return;
    try {
      await setDoc(doc(db, colName, docId), payload, { merge: true });
    } catch (err) {
      console.warn(`Cloud save failed for ${colName}/${docId}:`, err);
    }
  };

  const removeCloudDoc = async (colName, docId) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, colName, docId));
    } catch (err) {
      console.warn(`Cloud delete failed for ${colName}/${docId}:`, err);
    }
  };

  const currentUser = useMemo(
    () => accounts.find((a) => a.id === currentUserId) || null,
    [accounts, currentUserId]
  );

  const isInstructor = currentUser?.role === 'instructor';
  const pupils = useMemo(() => accounts.filter((a) => a.role === 'pupil'), [accounts]);

  const sendAutomatedMessage = (toId, toName, text, senderRole = 'instructor') => {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromId: currentUser?.id || 'system',
      fromName: currentUser?.name || 'Learn To Pass With Us',
      toId,
      toName,
      senderRole,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    setMessages((prev) => [...prev, newMsg]);
    persistCloudDoc('messages', newMsg.id, newMsg);
  };

  // ============================================================================
  // AUTOMATIC 24-HOUR IN-APP & EMAILJS REMINDER ENGINE
  // ============================================================================
  useEffect(() => {
    if (!settings.autoRemindersEnabled || lessons.length === 0) return;

    const nowMs = Date.now();
    const in24hMs = nowMs + 24 * 60 * 60 * 1000;

    lessons.forEach((l) => {
      if (l.status !== 'confirmed' || l.reminderSent) return;
      if (triggeredRemindersRef.current.has(l.id)) return;

      const [y, m, d] = l.date.split('-').map(Number);
      const [hh, mm] = l.startTime.split(':').map(Number);
      const lessonStartMs = new Date(y, m - 1, d, hh, mm).getTime();

      if (lessonStartMs > nowMs && lessonStartMs <= in24hMs) {
        triggeredRemindersRef.current.add(l.id);

        const updatedLesson = { ...l, reminderSent: true };
        setLessons((prev) => prev.map((item) => (item.id === l.id ? updatedLesson : item)));
        persistCloudDoc('lessons', l.id, updatedLesson);

        const pupilAcc = accounts.find((a) => a.id === l.pupilId);
        const msgText = `24-Hour Lesson Reminder: Your ${l.durationMins}-minute manual driving lesson is tomorrow (${formatFriendlyDate(
          l.date
        )}) at ${l.startTime}. Pick-up: ${l.pickupLocation}. Please tap "Confirm Still Attending" in your Lessons dashboard.`;

        const autoMsg = {
          id: `rem-${l.id}`,
          fromId: 'system-reminder',
          fromName: 'Learn To Pass With Us (Auto-Reminder)',
          toId: l.pupilId,
          toName: l.pupilName,
          senderRole: 'instructor',
          text: msgText,
          timestamp: new Date().toISOString(),
          read: false
        };
        setMessages((prev) => [...prev, autoMsg]);
        persistCloudDoc('messages', autoMsg.id, autoMsg);

        if (
          settings.emailJsServiceId &&
          settings.emailJsTemplateId &&
          settings.emailJsPublicKey &&
          pupilAcc?.email
        ) {
          fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: settings.emailJsServiceId.trim(),
              template_id: settings.emailJsTemplateId.trim(),
              user_id: settings.emailJsPublicKey.trim(),
              template_params: {
                to_email: pupilAcc.email,
                to_name: pupilAcc.name,
                school_name: 'Learn To Pass With Us',
                lesson_date: formatFriendlyDate(l.date),
                lesson_time: l.startTime,
                pickup_location: l.pickupLocation,
                lesson_focus: l.notes || 'DVSA Syllabus Progression'
              }
            })
          }).catch((err) => console.warn('EmailJS reminder send error:', err));
        }
      }
    });
  }, [lessons, accounts, settings]);

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter((m) => m.toId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

  // ============================================================================
  // SMART AVAILABILITY, ROTA BUFFER (1HR PRE/POST) & DISTANCE BUFFER ENGINE
  // ============================================================================
  const computeSlotAvailability = (
    targetDate,
    pupilAccount,
    durationMins,
    customDropoffLoc = null
  ) => {
    const startLimit = timeToMinutes(settings.workStart || '07:00');
    const endLimit = timeToMinutes(settings.workEnd || '18:00');
    const slots = [];

    const [y, m, d] = targetDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const isWorkingDay = (settings.workDays || [1, 2, 3, 4, 5, 6]).includes(dayOfWeek);

    const activeDayLessons = lessons.filter(
      (l) => l.date === targetDate && (l.status === 'confirmed' || l.status === 'pending')
    );

    const dayUnavail = unavailability.filter((u) => u.date === targetDate);
    const dayRota = rotaEvents.filter((r) => r.date === targetDate);

    for (let candStart = startLimit; candStart <= endLimit; candStart += 30) {
      const candEnd = candStart + durationMins;
      let conflictReason = null;
      let travelNote = '';

      if (!isWorkingDay) {
        conflictReason = 'Instructor non-working day';
      }

      if (!conflictReason) {
        for (const u of dayUnavail) {
          const uStart = u.allDay ? 0 : timeToMinutes(u.startTime);
          const uEnd = u.allDay ? 24 * 60 : timeToMinutes(u.endTime);
          if (candStart < uEnd && candEnd > uStart) {
            conflictReason = u.reason || 'Instructor unavailable';
            break;
          }
        }
      }

      if (!conflictReason) {
        for (const r of dayRota) {
          const rStartBuffered = Math.max(0, timeToMinutes(r.startTime) - 60);
          const rEndBuffered = Math.min(24 * 60, timeToMinutes(r.endTime) + 60);
          if (candStart < rEndBuffered && candEnd > rStartBuffered) {
            conflictReason = 'Unavailable (Work rota shift + 1hr buffer)';
            break;
          }
        }
      }

      if (!conflictReason) {
        for (const existing of activeDayLessons) {
          const exStart = timeToMinutes(existing.startTime);
          const exEnd = exStart + existing.durationMins;

          if (candStart < exEnd && candEnd > exStart) {
            conflictReason = 'Already booked';
            break;
          }

          const isSamePupil = pupilAccount && existing.pupilId === pupilAccount.id;
          const pupilPickupLoc = pupilAccount?.postcode || 'PO19 - Chichester City Centre';
          const pupilDropoffLoc = customDropoffLoc || pupilPickupLoc;

          if (candStart >= exEnd) {
            if (isSamePupil && candStart === exEnd) {
              travelNote = 'Consecutive slot with same pupil (0m travel gap)';
            } else {
              const metrics = calculateTravelMetrics(existing.dropoffLocation, pupilPickupLoc);
              const requiredGap = isSamePupil ? 15 : metrics.bufferedMins;
              const actualGap = candStart - exEnd;
              if (actualGap < requiredGap) {
                conflictReason = `Need ${requiredGap}m travel buffer from ${existing.dropoffLocation
                  .split('-')[0]
                  .trim()}`;
                break;
              } else if (actualGap <= requiredGap + 30) {
                travelNote = `${metrics.miles} mi from prev lesson (${metrics.bufferedMins}m buffer)`;
              }
            }
          }

          if (candEnd <= exStart) {
            if (isSamePupil && candEnd === exStart) {
              travelNote = 'Consecutive slot before existing lesson';
            } else {
              const metrics = calculateTravelMetrics(pupilDropoffLoc, existing.pickupLocation);
              const requiredGap = isSamePupil ? 15 : metrics.bufferedMins;
              const actualGap = exStart - candEnd;
              if (actualGap < requiredGap) {
                conflictReason = `Leaves only ${actualGap}m before next lesson (${requiredGap}m needed)`;
                break;
              }
            }
          }
        }
      }

      slots.push({
        time: minutesToTime(candStart),
        endTime: minutesToTime(candEnd),
        available: !conflictReason,
        reason: conflictReason,
        travelNote
      });
    }

    return slots;
  };

  // ============================================================================
  // BOOKING, LESSON & ACCOUNT HANDLERS
  // ============================================================================
  const handleCreateBookingRequest = ({
    pupilAccount,
    date,
    startTime,
    durationMins,
    pickupLocation,
    dropoffLocation,
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
    const resolvedDropoff = dropoffLocation || pickupLocation;
    const hasDistinctDropoff = resolvedDropoff !== pickupLocation;

    const newLesson = {
      id: `lesson-${Date.now()}`,
      pupilId: pupilAccount.id,
      pupilName: pupilAccount.name,
      date,
      startTime,
      durationMins,
      pickupLocation,
      dropoffLocation: resolvedDropoff,
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
        `Instructor directly scheduled & confirmed your ${durationMins}-minute driving lesson on ${formatFriendlyDate(
          date
        )} at ${startTime}. Pick-up: ${pickupLocation}${
          hasDistinctDropoff ? ` | Drop-off: ${resolvedDropoff}` : ''
        }. Focus: ${defaultFocus}.`,
        'instructor'
      );
      notify(`Lesson confirmed for ${pupilAccount.name} on ${formatFriendlyDate(date)}.`);
    } else {
      sendAutomatedMessage(
        instructorTargetId,
        instructorTargetName,
        `New booking request from ${pupilAccount.name} for ${formatFriendlyDate(
          date
        )} at ${startTime} (${durationMins}m). Pick-up: ${pickupLocation}${
          hasDistinctDropoff ? ` | Drop-off: ${resolvedDropoff}` : ''
        }.${pupilNotes ? ` Note: "${pupilNotes}"` : ''}`,
        'pupil'
      );
      notify('Booking request sent! Your instructor will review and confirm shortly.');
    }
  };

  const handleApproveLesson = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'confirmed' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { ...lesson, status: 'confirmed' });
    sendAutomatedMessage(
      lesson.pupilId,
      lesson.pupilName,
      `Your ${lesson.durationMins}-minute driving lesson on ${formatFriendlyDate(
        lesson.date
      )} at ${lesson.startTime} has been CONFIRMED.`,
      'instructor'
    );
    notify(`Confirmed ${lesson.pupilName}'s lesson.`);
  };

  const handleRejectLesson = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'rejected' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { ...lesson, status: 'rejected' });
    sendAutomatedMessage(
      lesson.pupilId,
      lesson.pupilName,
      `Your lesson request for ${formatFriendlyDate(lesson.date)} at ${
        lesson.startTime
      } could not be accommodated. Please choose another available slot.`,
      'instructor'
    );
    notify(`Declined request from ${lesson.pupilName}.`, 'info');
  };

  const handleCancelLesson = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'cancelled' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { ...lesson, status: 'cancelled' });
    const targetId = isInstructor
      ? lesson.pupilId
      : accounts.find((a) => a.role === 'instructor')?.id || 'instructor-main';
    const targetName = isInstructor
      ? lesson.pupilName
      : accounts.find((a) => a.role === 'instructor')?.name || 'Instructor';
    sendAutomatedMessage(
      targetId,
      targetName,
      `Lesson on ${formatFriendlyDate(lesson.date)} at ${lesson.startTime} was cancelled by ${
        currentUser.name
      }.`,
      isInstructor ? 'instructor' : 'pupil'
    );
    notify('Lesson cancelled.', 'info');
  };

  const handleConfirmAttendance = (lesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, pupilConfirmedAttendance: true } : l))
    );
    persistCloudDoc('lessons', lesson.id, { ...lesson, pupilConfirmedAttendance: true });
    notify('Attendance confirmed! See you at your pick-up location.');
  };

  const handleUpdateAccountDetails = (accountId, updates) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, ...updates } : acc))
    );
    const target = accounts.find((a) => a.id === accountId);
    if (target) {
      persistCloudDoc('accounts', accountId, { ...target, ...updates });
    }
  };

  const handleCreateAccount = (newAcc) => {
    setAccounts((prev) => [...prev, newAcc]);
    persistCloudDoc('accounts', newAcc.id, newAcc);
    notify(`Account created for ${newAcc.name}.`);
  };

  const handleDeleteAccount = (acc) => {
    setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
    removeCloudDoc('accounts', acc.id);
    if (acc.role === 'pupil') {
      lessons
        .filter((l) => l.pupilId === acc.id && (l.status === 'confirmed' || l.status === 'pending'))
        .forEach((l) => {
          const cancelled = { ...l, status: 'cancelled' };
          persistCloudDoc('lessons', l.id, cancelled);
        });
      setLessons((prev) =>
        prev.map((l) =>
          l.pupilId === acc.id && (l.status === 'confirmed' || l.status === 'pending')
            ? { ...l, status: 'cancelled' }
            : l
        )
      );
    }
    notify(`${acc.name}'s account has been deleted.`, 'info');
  };

  const handleToggleSyllabusTopic = (pupilId, topicId, nextStatus) => {
    setSyllabusProgress((prev) => {
      const currentForPupil = prev[pupilId] || {};
      const updatedForPupil = { ...currentForPupil, [topicId]: nextStatus };
      persistCloudDoc('syllabusProgress', pupilId, updatedForPupil);
      return { ...prev, [pupilId]: updatedForPupil };
    });
  };

  // ============================================================================
  // AUTH SCREEN (WHEN NOT LOGGED IN)
  // ============================================================================
  if (!currentUser) {
    return (
      <AuthScreen
        accounts={accounts}
        onLoginSuccess={(acc) => {
          setCurrentUserId(acc.id);
          setActiveTab('dashboard');
          notify(`Welcome back, ${acc.name}!`);
        }}
        onRegisterSuccess={(newAcc) => {
          setAccounts((prev) => [...prev, newAcc]);
          persistCloudDoc('accounts', newAcc.id, newAcc);
          setCurrentUserId(newAcc.id);
          setActiveTab('dashboard');
          notify(`Welcome to Learn To Pass With Us, ${newAcc.name}!`);
        }}
        cloudReady={cloudReady}
      />
    );
  }

  const navTabs = isInstructor
    ? [
        { id: 'dashboard', label: 'Home' },
        { id: 'diary', label: 'Diary' },
        { id: 'syllabus', label: 'Pupils' },
        { id: 'messages', label: 'Messages', badge: unreadMessagesCount }
      ]
    : [
        { id: 'dashboard', label: 'Lessons' },
        { id: 'diary', label: 'Diary' },
        { id: 'syllabus', label: 'Progress' },
        { id: 'messages', label: 'Messages', badge: unreadMessagesCount }
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : toast.type === 'info'
              ? 'bg-slate-800 text-white border-slate-700'
              : 'bg-emerald-600 text-white border-emerald-500'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-base shrink-0">
              L
            </div>
            <div className="truncate">
              <div className="text-sm sm:text-base font-extrabold tracking-tight leading-tight truncate">
                Learn To Pass With Us
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {isInstructor ? 'Instructor Portal • EN56 WXA' : `Pupil Portal • ${currentUser.name}`}
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-1.5">
            {navTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('accounts')}
              title="Account Settings"
              className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-xl transition ${
                activeTab === 'accounts'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px] font-semibold leading-none mt-0.5">
                Settings
              </span>
            </button>

            <button
              onClick={() => setCurrentUserId(null)}
              title="Sign Out"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6">
        {activeTab === 'dashboard' &&
          (isInstructor ? (
            <InstructorDashboardView
              currentUser={currentUser}
              lessons={lessons}
              pupils={pupils}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onApprove={handleApproveLesson}
              onReject={handleRejectLesson}
              onCancel={handleCancelLesson}
              onOpenAddLesson={() => setShowInstructorAddLessonModal(true)}
            />
          ) : (
            <PupilDashboardView
              currentUser={currentUser}
              lessons={lessons}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              computeSlotAvailability={computeSlotAvailability}
              onCreateBooking={handleCreateBookingRequest}
              onCancelLesson={handleCancelLesson}
              onConfirmAttendance={handleConfirmAttendance}
              onOpenSettings={() => setActiveTab('accounts')}
            />
          ))}

        {activeTab === 'diary' && (
          <GoogleStyleDiaryView
            currentUser={currentUser}
            isInstructor={isInstructor}
            lessons={isInstructor ? lessons : lessons.filter((l) => l.pupilId === currentUser.id)}
            unavailability={isInstructor ? unavailability : []}
            rotaEvents={isInstructor ? rotaEvents : []}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenAddLesson={() => setShowInstructorAddLessonModal(true)}
            onApprove={handleApproveLesson}
            onReject={handleRejectLesson}
            onCancel={handleCancelLesson}
          />
        )}

        {activeTab === 'syllabus' && (
          <SyllabusFlowchartView
            currentUser={currentUser}
            isInstructor={isInstructor}
            pupils={pupils}
            syllabusProgress={syllabusProgress}
            onToggleTopicStatus={handleToggleSyllabusTopic}
          />
        )}

        {activeTab === 'messages' && (
          <MessagingCenterView
            currentUser={currentUser}
            isInstructor={isInstructor}
            accounts={accounts}
            messages={messages}
            onSendMessage={(toId, toName, text) =>
              sendAutomatedMessage(toId, toName, text, isInstructor ? 'instructor' : 'pupil')
            }
          />
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {isInstructor ? (
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
            ) : (
              <>
                <PupilLocationsSettingsCard
                  pupil={currentUser}
                  onSaveLocations={(updates) => handleUpdateAccountDetails(currentUser.id, updates)}
                  notify={notify}
                />
                <PupilCalendarIntegrationCard
                  pupil={currentUser}
                  lessons={lessons}
                  notify={notify}
                />
              </>
            )}

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
          </div>
        )}
      </main>

      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreate={handleCreateAccount}
        />
      )}

      {showInstructorAddLessonModal && (
        <InstructorAddLessonModal
          pupilsList={pupils}
          defaultDate={selectedDate}
          onClose={() => setShowInstructorAddLessonModal(false)}
          onCreate={(data) => {
            handleCreateBookingRequest({ ...data, autoConfirm: true });
            setShowInstructorAddLessonModal(false);
          }}
        />
      )}

      {showGoogleGuideModal && (
        <GoogleCalendarGuideModal onClose={() => setShowGoogleGuideModal(false)} />
      )}

      {confirmModal && (
        <ConfirmationDialog
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// AUTH SCREEN (SIGN IN & NEW PUPIL/INSTRUCTOR REGISTRATION)
// ============================================================================
function AuthScreen({ accounts, onLoginSuccess, onRegisterSuccess, cloudReady }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('pupil');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [postcode, setPostcode] = useState(WEST_SUSSEX_POSTCODES[0]);
  const [homeAddress, setHomeAddress] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyCheck = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'login') {
      const found = accounts.find((a) => (a.email || '').toLowerCase() === cleanEmail);
      if (!found) {
        setErrorMsg('No account found with that email address. Please check or sign up.');
        return;
      }
      if (found.password !== password) {
        setErrorMsg('Incorrect password. Please check CAPS Lock and try again.');
        return;
      }
      onLoginSuccess(found);
      return;
    }

    if (!name.trim() || !cleanEmail || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (accounts.some((a) => (a.email || '').toLowerCase() === cleanEmail)) {
      setErrorMsg('An account with that email already exists. Please sign in.');
      return;
    }

    if (role === 'instructor' && accessCode.trim().toUpperCase() !== INSTRUCTOR_ACCESS_CODE) {
      setErrorMsg('Invalid Instructor Access Code.');
      return;
    }

    const newAcc = {
      id: `${role}-${Date.now()}`,
      role,
      name: name.trim(),
      email: cleanEmail,
      password,
      postcode,
      homeAddress: homeAddress.trim(),
      savedLocations: []
    };
    onRegisterSuccess(newAcc);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 [color-scheme:light]">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
            L
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
              Learn To Pass With Us
            </h1>
            <p className="text-xs text-slate-500">Chichester &amp; West Sussex Driving School</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            cloudReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {cloudReady ? 'Live Booking Portal' : 'Connecting...'}
        </span>
      </div>

      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> DVSA APPROVED DRIVING INSTRUCTION
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Book Lessons, Track Your DVSA Progress &amp; Sync Your Calendar.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Sign in to your personal portal to book 1hr, 1.5hr, or 2hr manual driving lessons in
            Chichester &amp; West Sussex, track your step-by-step DVSA syllabus plan, and sync your
            diary directly to your phone.
          </p>
          <VWGolfGTIBadge />
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition ${
                mode === 'login'
                  ? 'bg-slate-900 text-white shadow-sm'
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
              className={`py-2.5 rounded-xl text-sm font-bold transition ${
                mode === 'register'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Pupil Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {capsLockOn && (
            <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>CAPS LOCK IS ON — Passwords are case-sensitive.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registering As
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                  >
                    <option value="pupil">Pupil (Book Driving Lessons)</option>
                    <option value="instructor">Driving Instructor (ADI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Taylor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyCheck}
                onKeyUp={handleKeyCheck}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                {capsLockOn && (
                  <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
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
                  onKeyDown={handleKeyCheck}
                  onKeyUp={handleKeyCheck}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && role === 'pupil' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Primary Pick-Up Postcode Area
                  </label>
                  <select
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                  >
                    {WEST_SUSSEX_POSTCODES.map((pc) => (
                      <option key={pc} value={pc}>
                        {pc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Home Street Address (Optional — can also be added in Settings)
                  </label>
                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="e.g. 14 St Pancras, Chichester, PO19 7SJ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                  />
                </div>
              </>
            )}

            {mode === 'register' && role === 'instructor' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instructor Access Code
                </label>
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter ADI registration code"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light]"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
            >
              {mode === 'login' ? 'Sign In to My Portal' : 'Create Account & Enter Portal'}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto text-center text-xs text-slate-400">
        Learn To Pass With Us • Manual Driving Tuition in Chichester, Bognor Regis, Arundel &amp;
        Selsey
      </div>
    </div>
  );
}

// ============================================================================
// INSTRUCTOR HOME DASHBOARD
// ============================================================================
function InstructorDashboardView({
  lessons,
  pupils,
  selectedDate,
  onSelectDate,
  onApprove,
  onReject,
  onCancel,
  onOpenAddLesson
}) {
  const pendingLessons = lessons.filter((l) => l.status === 'pending');
  const dayLessons = lessons.filter(
    (l) => l.date === selectedDate && (l.status === 'confirmed' || l.status === 'pending')
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Instructor Home</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage lesson requests, view today&apos;s pick-ups &amp; drop-offs, or schedule a pupil.
          </p>
        </div>
        <button
          onClick={onOpenAddLesson}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Book Lesson for Pupil</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Pending Requests</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingLessons.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Selected Day Lessons</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{dayLessons.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Active Pupils</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{pupils.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Confirmed</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {lessons.filter((l) => l.status === 'confirmed').length}
          </div>
        </div>
      </div>

      {pendingLessons.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-extrabold text-amber-950">
              Pending Pupil Booking Requests ({pendingLessons.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingLessons.map((l) => (
              <div
                key={l.id}
                className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{l.pupilName}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {l.durationMins} mins
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-1">
                    {formatFriendlyDate(l.date)} • {l.startTime} –{' '}
                    {minutesToTime(timeToMinutes(l.startTime) + l.durationMins)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                    <div>
                      <span className="font-bold text-slate-800">Pick-up:</span> {l.pickupLocation}
                    </div>
                    {l.dropoffLocation && l.dropoffLocation !== l.pickupLocation && (
                      <div>
                        <span className="font-bold text-slate-800">Drop-off:</span>{' '}
                        {l.dropoffLocation}
                      </div>
                    )}
                    {l.pupilNotes && (
                      <div className="italic text-slate-500 mt-1">&ldquo;{l.pupilNotes}&rdquo;</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onApprove(l)}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                  >
                    Approve &amp; Confirm
                  </button>
                  <button
                    onClick={() => onReject(l)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-xs font-bold transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Schedule for {formatFriendlyDate(selectedDate)}
            </h3>
            <p className="text-xs text-slate-500">
              Showing confirmed &amp; pending lessons with pick-up/drop-off addresses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectDate(addDaysISO(selectedDate, -1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
            />
            <button
              onClick={() => onSelectDate(addDaysISO(selectedDate, 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {dayLessons.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-600">
              No lessons scheduled on {formatFriendlyDate(selectedDate)}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayLessons.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-extrabold">
                      {l.startTime} – {minutesToTime(timeToMinutes(l.startTime) + l.durationMins)}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900">{l.pupilName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        l.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Pick-up:</span> {l.pickupLocation}
                    {l.dropoffLocation && l.dropoffLocation !== l.pickupLocation && (
                      <>
                        {' '}
                        • <span className="font-bold text-slate-800">Drop-off:</span>{' '}
                        {l.dropoffLocation}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">Focus: {l.notes}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={buildGoogleCalendarUrl(l)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    + Google Cal
                  </a>
                  <button
                    onClick={() => onCancel(l)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PUPIL LESSONS DASHBOARD (WITH PICK-UP & DROP-OFF DROPDOWN PICKERS)
// ============================================================================
function PupilDashboardView({
  currentUser,
  lessons,
  selectedDate,
  onSelectDate,
  computeSlotAvailability,
  onCreateBooking,
  onCancelLesson,
  onConfirmAttendance,
  onOpenSettings
}) {
  const [durationMins, setDurationMins] = useState(60);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [pupilNotes, setPupilNotes] = useState('');

  const locationOptions = useMemo(() => {
    const opts = [];
    const areaCode = (currentUser.postcode || 'PO19 - Chichester City Centre').split('-')[0].trim();
    if (currentUser.homeAddress && currentUser.homeAddress.trim()) {
      opts.push(`${areaCode} - ${currentUser.homeAddress.trim()} (Home)`);
    } else if (currentUser.postcode) {
      opts.push(currentUser.postcode);
    }

    if (Array.isArray(currentUser.savedLocations)) {
      currentUser.savedLocations.forEach((loc) => {
        const prefix = (loc.postcode || areaCode).split('-')[0].trim();
        const formatted = `${prefix} - ${loc.address} (${loc.label})`;
        if (!opts.includes(formatted)) opts.push(formatted);
      });
    }

    WEST_SUSSEX_POSTCODES.forEach((pc) => {
      if (!opts.includes(pc)) opts.push(pc);
    });
    return opts;
  }, [currentUser]);

  const [pickupLocation, setPickupLocation] = useState(locationOptions[0] || '');
  const [dropoffLocation, setDropoffLocation] = useState(locationOptions[0] || '');

  useEffect(() => {
    if (locationOptions.length > 0) {
      if (!locationOptions.includes(pickupLocation)) setPickupLocation(locationOptions[0]);
      if (!locationOptions.includes(dropoffLocation)) setDropoffLocation(locationOptions[0]);
    }
  }, [locationOptions]);

  const myLessons = useMemo(
    () =>
      lessons.filter(
        (l) =>
          l.pupilId === currentUser.id && (l.status === 'confirmed' || l.status === 'pending')
      ),
    [lessons, currentUser.id]
  );

  const upcomingReminderLesson = useMemo(
    () =>
      myLessons.find(
        (l) => l.status === 'confirmed' && l.reminderSent && !l.pupilConfirmedAttendance
      ),
    [myLessons]
  );

  const computedSlots = useMemo(
    () =>
      computeSlotAvailability(
        selectedDate,
        { ...currentUser, postcode: pickupLocation },
        durationMins,
        dropoffLocation
      ),
    [selectedDate, currentUser, pickupLocation, dropoffLocation, durationMins, computeSlotAvailability]
  );

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    onCreateBooking({
      pupilAccount: currentUser,
      date: selectedDate,
      startTime: selectedSlot,
      durationMins,
      pickupLocation,
      dropoffLocation,
      pupilNotes: pupilNotes.trim()
    });
    setSelectedSlot('');
    setPupilNotes('');
  };

  return (
    <div className="space-y-6">
      {upcomingReminderLesson && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-extrabold text-amber-950">
                24-Hour Lesson Confirmation Needed
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Your {upcomingReminderLesson.durationMins}-min lesson is scheduled for{' '}
                <strong>{formatFriendlyDate(upcomingReminderLesson.date)}</strong> at{' '}
                <strong>{upcomingReminderLesson.startTime}</strong> (Pick-up:{' '}
                {upcomingReminderLesson.pickupLocation}).
              </p>
            </div>
          </div>
          <button
            onClick={() => onConfirmAttendance(upcomingReminderLesson)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition"
          >
            Confirm Still Attending
          </button>
        </div>
      )}

      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-sky-900">
        <span>
          <strong>Tip:</strong> You can save your full home address, alternative pick-up/drop-off
          addresses, and sync lessons to your phone calendar inside{' '}
          <strong>Settings (⚙️)</strong>.
        </span>
        <button
          onClick={onOpenSettings}
          className="text-sky-700 font-extrabold underline hover:text-sky-950 text-left sm:text-right shrink-0"
        >
          Open Settings →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Book a Driving Lesson</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your date, lesson length, pick-up &amp; drop-off locations, and an available
              time slot.
            </p>
          </div>

          <form onSubmit={handleBookSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lesson Date</label>
                <input
                  type="date"
                  min={getTodayISO()}
                  value={selectedDate}
                  onChange={(e) => {
                    onSelectDate(e.target.value);
                    setSelectedSlot('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lesson Duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { mins: 60, label: '1 hr' },
                    { mins: 90, label: '1.5 hrs' },
                    { mins: 120, label: '2 hrs' }
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.mins}
                      onClick={() => {
                        setDurationMins(opt.mins);
                        setSelectedSlot('');
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                        durationMins === opt.mins
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Pick-Up Location
                </label>
                <select
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    setSelectedSlot('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold"
                >
                  {locationOptions.map((loc) => (
                    <option key={`pu-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Drop-Off Location
                </label>
                <select
                  value={dropoffLocation}
                  onChange={(e) => {
                    setDropoffLocation(e.target.value);
                    setSelectedSlot('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold"
                >
                  {locationOptions.map((loc) => (
                    <option key={`do-${loc}`} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Available Start Times on {formatFriendlyDate(selectedDate)}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {computedSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <button
                      type="button"
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time)}
                      title={slot.available ? slot.travelNote || 'Available' : slot.reason}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        !slot.available
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Note for Instructor
              </label>
              <input
                type="text"
                value={pupilNotes}
                onChange={(e) => setPupilNotes(e.target.value)}
                placeholder="e.g. Would like to practise parallel parking or A27 roundabouts"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedSlot}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm transition"
            >
              {selectedSlot
                ? `Request ${durationMins}-Min Lesson at ${selectedSlot}`
                : 'Select an Available Time Slot Above'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900">
              My Upcoming Lessons ({myLessons.length})
            </h3>
            {myLessons.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">
                You have no upcoming lessons booked yet. Choose a date and time slot to request your
                next lesson!
              </p>
            ) : (
              <div className="space-y-3">
                {myLessons.map((l) => (
                  <div
                    key={l.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatFriendlyDate(l.date)} • {l.startTime}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>
                        <strong>Pick-up:</strong> {l.pickupLocation}
                      </div>
                      {l.dropoffLocation && l.dropoffLocation !== l.pickupLocation && (
                        <div>
                          <strong>Drop-off:</strong> {l.dropoffLocation}
                        </div>
                      )}
                      <div className="text-slate-500 mt-0.5">Focus: {l.notes}</div>
                    </div>
                    <div className="pt-1.5 flex items-center justify-between">
                      <a
                        href={buildGoogleCalendarUrl(l)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        + Add to Google Calendar
                      </a>
                      <button
                        onClick={() => onCancelLesson(l)}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Cancel Lesson
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GOOGLE CALENDAR STYLE DIARY VIEW (MONTH, WEEK & SCHEDULE VIEWS)
// ============================================================================
function GoogleStyleDiaryView({
  isInstructor,
  lessons,
  unavailability,
  rotaEvents,
  selectedDate,
  onSelectDate,
  onOpenAddLesson,
  onApprove,
  onReject,
  onCancel
}) {
  const [viewMode, setViewMode] = useState('month');

  const [selY, selM, selD] = selectedDate.split('-').map(Number);
  const currentMonthDate = new Date(selY, selM - 1, 1);

  const monthLabel = currentMonthDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });

  const navigatePeriod = (dir) => {
    if (viewMode === 'month') {
      const next = new Date(selY, selM - 1 + dir, 1);
      onSelectDate(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
      );
    } else {
      onSelectDate(addDaysISO(selectedDate, dir * 7));
    }
  };

  const monthDays = useMemo(() => {
    const firstDayOfWeek = (currentMonthDate.getDay() + 6) % 7;
    const daysInMonth = new Date(selY, selM, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(
        `${selY}-${String(selM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
    return cells;
  }, [selY, selM]);

  const weekDays = useMemo(() => {
    const dt = new Date(selY, selM - 1, selD);
    const mondayOffset = (dt.getDay() + 6) % 7;
    const mondayISO = addDaysISO(selectedDate, -mondayOffset);
    return Array.from({ length: 7 }, (_, i) => addDaysISO(mondayISO, i));
  }, [selectedDate, selY, selM, selD]);

  const activeLessons = lessons.filter(
    (l) => l.status === 'confirmed' || l.status === 'pending'
  );

  const selectedDayLessons = activeLessons.filter((l) => l.date === selectedDate);
  const selectedDayUnavail = unavailability.filter((u) => u.date === selectedDate);
  const selectedDayRota = rotaEvents.filter((r) => r.date === selectedDate);

  const upcomingScheduleLessons = activeLessons
    .filter((l) => l.date >= getTodayISO())
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectDate(getTodayISO())}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigatePeriod(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigatePeriod(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 ml-1">{monthLabel}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {[
              { id: 'month', label: 'Month' },
              { id: 'week', label: 'Week' },
              { id: 'schedule', label: 'Schedule' }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === v.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {isInstructor && (
            <button
              onClick={onOpenAddLesson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lesson</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 px-1 text-xs text-slate-600 flex-wrap">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className="w-4 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Confirmed Lesson
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span className="w-4 h-1.5 rounded-full bg-amber-400 inline-block" />
          Pending Request
        </span>
        {isInstructor && (
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className="w-4 h-1.5 rounded-full bg-indigo-400 inline-block" />
            Work Rota / Unavailable
          </span>
        )}
      </div>

      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2 text-[11px] font-extrabold text-slate-500 uppercase">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((iso, idx) => {
              if (!iso) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-20 sm:h-24 border-b border-r border-slate-100 bg-slate-50/40"
                  />
                );
              }
              const dayNum = Number(iso.split('-')[2]);
              const isSelected = iso === selectedDate;
              const isToday = iso === getTodayISO();
              const dLessons = activeLessons.filter((l) => l.date === iso);
              const hasBlocked =
                isInstructor &&
                (unavailability.some((u) => u.date === iso) ||
                  rotaEvents.some((r) => r.date === iso));

              return (
                <button
                  key={iso}
                  onClick={() => onSelectDate(iso)}
                  className={`h-20 sm:h-24 p-1.5 sm:p-2 border-b border-r border-slate-100 text-left flex flex-col justify-between transition ${
                    isSelected ? 'bg-emerald-50/70 ring-2 ring-inset ring-emerald-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      isToday
                        ? 'bg-emerald-600 text-white'
                        : isSelected
                        ? 'text-emerald-900'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <div className="w-full space-y-1 overflow-hidden">
                    {dLessons.slice(0, 3).map((l) => (
                      <div
                        key={l.id}
                        className={`h-1.5 sm:h-4 rounded-full sm:rounded px-1 text-[10px] font-bold truncate flex items-center ${
                          l.status === 'confirmed'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        <span className="hidden sm:inline truncate">
                          {l.startTime} {isInstructor ? l.pupilName.split(' ')[0] : 'Lesson'}
                        </span>
                      </div>
                    ))}
                    {hasBlocked && (
                      <div className="h-1.5 rounded-full bg-indigo-400 w-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((iso) => {
              const dt = new Date(
                Number(iso.slice(0, 4)),
                Number(iso.slice(5, 7)) - 1,
                Number(iso.slice(8, 10))
              );
              const isSelected = iso === selectedDate;
              const dLessons = activeLessons.filter((l) => l.date === iso);
              const hasBlocked =
                isInstructor &&
                (unavailability.some((u) => u.date === iso) ||
                  rotaEvents.some((r) => r.date === iso));

              return (
                <button
                  key={iso}
                  onClick={() => onSelectDate(iso)}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {dt.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span className="text-base font-black text-slate-900">{dt.getDate()}</span>
                  <div className="w-full space-y-1 mt-1">
                    {dLessons.map((l) => (
                      <div
                        key={l.id}
                        className={`h-1.5 rounded-full w-full ${
                          l.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                    ))}
                    {hasBlocked && <div className="h-1.5 rounded-full w-full bg-indigo-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'schedule' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">Upcoming Lesson Schedule</h3>
          {upcomingScheduleLessons.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No upcoming lessons in the diary.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingScheduleLessons.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {formatFriendlyDate(l.date)} • {l.startTime} –{' '}
                      {minutesToTime(timeToMinutes(l.startTime) + l.durationMins)} ({l.pupilName})
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Pick-up: {l.pickupLocation}
                      {l.dropoffLocation && l.dropoffLocation !== l.pickupLocation
                        ? ` • Drop-off: ${l.dropoffLocation}`
                        : ''}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold self-start sm:self-center ${
                      l.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {l.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Agenda for {formatFriendlyDate(selectedDate)}
          </h3>

          {isInstructor && (selectedDayRota.length > 0 || selectedDayUnavail.length > 0) && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
              <div className="font-extrabold">Blocked Shifts / Unavailability:</div>
              {selectedDayRota.map((r) => (
                <div key={r.id}>
                  • {r.summary}: {r.startTime} – {r.endTime} (+1hr pre/post travel buffer)
                </div>
              ))}
              {selectedDayUnavail.map((u) => (
                <div key={u.id}>
                  • {u.reason}: {u.allDay ? 'All Day' : `${u.startTime} – ${u.endTime}`}
                </div>
              ))}
            </div>
          )}

          {selectedDayLessons.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              No lessons booked on {formatFriendlyDate(selectedDate)}.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedDayLessons.map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {l.startTime} – {minutesToTime(timeToMinutes(l.startTime) + l.durationMins)}
                      </span>
                      <span className="text-xs font-bold text-slate-700">• {l.pupilName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <strong>Pick-up:</strong> {l.pickupLocation}
                      {l.dropoffLocation && l.dropoffLocation !== l.pickupLocation && (
                        <>
                          {' '}
                          • <strong>Drop-off:</strong> {l.dropoffLocation}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInstructor && l.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onApprove(l)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReject(l)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onCancel(l)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DVSA SYLLABUS PROGRESSION FLOWCHART (PUPILS / PROGRESS TAB)
// ============================================================================
function SyllabusFlowchartView({
  currentUser,
  isInstructor,
  pupils,
  syllabusProgress,
  onToggleTopicStatus
}) {
  const [selectedPupilId, setSelectedPupilId] = useState(
    isInstructor ? pupils[0]?.id || '' : currentUser.id
  );

  useEffect(() => {
    if (isInstructor && !selectedPupilId && pupils.length > 0) {
      setSelectedPupilId(pupils[0].id);
    }
  }, [isInstructor, pupils, selectedPupilId]);

  const targetPupilId = isInstructor ? selectedPupilId : currentUser.id;
  const progressMap = syllabusProgress[targetPupilId] || {};

  const statusOrder = ['not_started', 'practising', 'independent'];
  const statusMeta = {
    not_started: {
      label: 'Not Started',
      badge: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    practising: {
      label: 'Practising (Prompted)',
      badge: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    independent: {
      label: 'Test Standard (Independent)',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
  };

  const completedCount = DVSA_SYLLABUS_TOPICS.filter(
    (t) => progressMap[t.id] === 'independent'
  ).length;
  const pct = Math.round((completedCount / DVSA_SYLLABUS_TOPICS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            {isInstructor ? 'Pupil DVSA Syllabus Progress' : 'My DVSA Driving Syllabus Plan'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track progression from first cockpit drill through to Chichester test readiness.
          </p>
        </div>

        {isInstructor && (
          <div className="min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Select Pupil
            </label>
            <select
              value={selectedPupilId}
              onChange={(e) => setSelectedPupilId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-bold"
            >
              {pupils.length === 0 && <option value="">No pupils registered yet</option>}
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {targetPupilId ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Test Readiness Mastery</span>
              <span>
                {completedCount} / {DVSA_SYLLABUS_TOPICS.length} Topics ({pct}%)
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DVSA_SYLLABUS_TOPICS.map((topic, index) => {
              const currentStatus = progressMap[topic.id] || 'not_started';
              const meta = statusMeta[currentStatus];
              const nextStatus =
                statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length];

              return (
                <div
                  key={topic.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase">
                        Step {index + 1} • {topic.stage}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">{topic.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">{topic.desc}</p>
                  </div>

                  {isInstructor && (
                    <button
                      onClick={() => onToggleTopicStatus(targetPupilId, topic.id, nextStatus)}
                      className="self-start px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      Advance Status → {statusMeta[nextStatus].label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          No pupils registered yet. Once a pupil signs up, their DVSA syllabus tracker will appear
          here.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DIRECT MESSAGING CENTER (MESSAGES TAB)
// ============================================================================
function MessagingCenterView({ currentUser, isInstructor, accounts, messages, onSendMessage }) {
  const [selectedContactId, setSelectedContactId] = useState('');
  const [draft, setDraft] = useState('');

  const contacts = useMemo(() => {
    if (isInstructor) {
      return accounts.filter((a) => a.role === 'pupil');
    }
    return accounts.filter((a) => a.role === 'instructor');
  }, [accounts, isInstructor]);

  useEffect(() => {
    if (!selectedContactId && contacts.length > 0) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  const activeContact = contacts.find((c) => c.id === selectedContactId) || contacts[0];

  const threadMessages = useMemo(() => {
    if (!activeContact) return [];
    return messages.filter(
      (m) =>
        (m.fromId === currentUser.id && m.toId === activeContact.id) ||
        (m.toId === currentUser.id &&
          (m.fromId === activeContact.id ||
            (!isInstructor && m.senderRole === 'instructor')))
    );
  }, [messages, currentUser.id, activeContact, isInstructor]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeContact) return;
    onSendMessage(activeContact.id, activeContact.name, draft.trim());
    setDraft('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 p-4 bg-slate-50/70 space-y-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-2">
          {isInstructor ? 'Pupils' : 'Instructor'}
        </h3>
        {contacts.length === 0 ? (
          <p className="text-xs text-slate-500 px-2 py-4">No contacts available yet.</p>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedContactId(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                activeContact?.id === c.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-[10px] opacity-75">
                {c.postcode ? c.postcode.split('-')[0].trim() : ''}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="md:col-span-8 flex flex-col justify-between p-4 sm:p-5">
        {activeContact ? (
          <>
            <div className="pb-3 border-b border-slate-200">
              <div className="text-sm font-extrabold text-slate-900">{activeContact.name}</div>
              <div className="text-xs text-slate-500">{activeContact.email}</div>
            </div>

            <div className="flex-1 py-4 space-y-3 overflow-y-auto max-h-[320px]">
              {threadMessages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No messages yet. Start a conversation below.
                </p>
              ) : (
                threadMessages.map((m) => {
                  const isMine = m.fromId === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                        isMine
                          ? 'ml-auto bg-emerald-600 text-white'
                          : 'mr-auto bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="font-bold text-[10px] opacity-80 mb-0.5">{m.fromName}</span>
                      <span>{m.text}</span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend} className="pt-3 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${activeContact.name}...`}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-400">
            Select a contact to view messages.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INSTRUCTOR SETTINGS: WORKING HOURS, WORK ROTA SYNC, HOLIDAYS & EMAILJS
// ============================================================================
function CalendarSyncAndUnavailabilityView({
  settings,
  setSettings,
  onPersistSettings,
  rotaEvents,
  onSyncRotaEvents,
  unavailability,
  setUnavailability,
  onAddCloudUnavail,
  onDeleteCloudUnavail,
  notify
}) {
  const [unavailFrom, setUnavailFrom] = useState(getTodayISO());
  const [unavailTo, setUnavailTo] = useState(getTodayISO());
  const [unavailAllDay, setUnavailAllDay] = useState(true);
  const [unavailStart, setUnavailStart] = useState('09:00');
  const [unavailEnd, setUnavailEnd] = useState('17:00');
  const [unavailReason, setUnavailReason] = useState('Holiday / Personal Appointment');
  const [syncingRota, setSyncingRota] = useState(false);
  const [pastedICS, setPastedICS] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  const toggleWorkDay = (dayIdx) => {
    const current = settings.workDays || [1, 2, 3, 4, 5, 6];
    const next = current.includes(dayIdx)
      ? current.filter((d) => d !== dayIdx)
      : [...current, dayIdx].sort();
    setSettings((prev) => ({ ...prev, workDays: next }));
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    onPersistSettings(settings);
    notify('Instructor working hours, calendar sync & reminder settings saved!');
  };

  const handleSyncRotaNow = async () => {
    const rawUrl = (settings.workRotaUrl || '').trim();
    if (!rawUrl) {
      notify('Please paste your Connecteam or work rota .ics URL first.', 'error');
      return;
    }
    const httpUrl = rawUrl.replace(/^webcal:\/\//i, 'https://');
    setSyncingRota(true);

    const proxies = [
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u) => u
    ];

    let fetchedText = '';
    for (const makeProxy of proxies) {
      try {
        const res = await fetch(makeProxy(httpUrl));
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.includes('BEGIN:VCALENDAR')) {
            fetchedText = txt;
            break;
          }
        }
      } catch {
        // Try next proxy
      }
    }

    setSyncingRota(false);

    if (!fetchedText) {
      notify(
        'Could not fetch automatically due to S3/CORS restrictions. Use "Upload .ics File" or "Paste .ics Text" below.',
        'error'
      );
      return;
    }

    const parsed = parseICSFeedEvents(fetchedText);
    const updatedSettings = {
      ...settings,
      lastRotaSync: new Date().toLocaleString('en-GB')
    };
    onSyncRotaEvents(parsed, updatedSettings);
    notify(`Synced ${parsed.length} shift blocks from your work rota (+1hr buffer applied)!`);
  };

  const handleICSFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      const parsed = parseICSFeedEvents(text);
      if (parsed.length === 0) {
        notify('No valid calendar shifts found in that .ics file.', 'error');
        return;
      }
      const updatedSettings = {
        ...settings,
        lastRotaSync: new Date().toLocaleString('en-GB')
      };
      onSyncRotaEvents(parsed, updatedSettings);
      notify(`Imported ${parsed.length} work rota shift blocks (+1hr buffer applied)!`);
    };
    reader.readAsText(file);
  };

  const handleImportPastedICS = () => {
    const parsed = parseICSFeedEvents(pastedICS);
    if (parsed.length === 0) {
      notify('No valid VEVENT shifts detected in pasted text.', 'error');
      return;
    }
    const updatedSettings = {
      ...settings,
      lastRotaSync: new Date().toLocaleString('en-GB')
    };
    onSyncRotaEvents(parsed, updatedSettings);
    setPastedICS('');
    setShowPasteBox(false);
    notify(`Imported ${parsed.length} work rota shift blocks!`);
  };

  const handleAddHolidayRange = (e) => {
    e.preventDefault();
    if (!unavailFrom) return;
    const endDate = unavailTo && unavailTo >= unavailFrom ? unavailTo : unavailFrom;

    let cursor = unavailFrom;
    let count = 0;
    const newBlocks = [];

    while (cursor <= endDate && count < 90) {
      const block = {
        id: `unavail-${cursor}-${Date.now()}-${count}`,
        date: cursor,
        allDay: unavailAllDay,
        startTime: unavailAllDay ? '00:00' : unavailStart,
        endTime: unavailAllDay ? '23:59' : unavailEnd,
        reason: unavailReason.trim() || 'Unavailable'
      };
      newBlocks.push(block);
      onAddCloudUnavail(block);
      cursor = addDaysISO(cursor, 1);
      count++;
    }

    setUnavailability((prev) => [...prev, ...newBlocks]);
    notify(
      count > 1
        ? `Blocked ${count} days (${formatFriendlyDate(unavailFrom)} to ${formatFriendlyDate(
            endDate
          )}).`
        : `Blocked ${formatFriendlyDate(unavailFrom)}.`
    );
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveRules}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div>
          <h2 className="text-lg font-black text-slate-900">
            Driving Instructor Hours, Work Rota &amp; Reminder Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set your driving lesson window (07:00–18:00), sync your Connecteam work rota (+1hr
            pre/post buffer), and configure automatic 24-hour reminders.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              First Lesson Start Time
            </label>
            <input
              type="time"
              value={settings.workStart}
              onChange={(e) => setSettings((prev) => ({ ...prev, workStart: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Last Lesson Start Time
            </label>
            <input
              type="time"
              value={settings.workEnd}
              onChange={(e) => setSettings((prev) => ({ ...prev, workEnd: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Available Teaching Days
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { idx: 1, label: 'Mon' },
              { idx: 2, label: 'Tue' },
              { idx: 3, label: 'Wed' },
              { idx: 4, label: 'Thu' },
              { idx: 5, label: 'Fri' },
              { idx: 6, label: 'Sat' },
              { idx: 0, label: 'Sun' }
            ].map((d) => {
              const active = (settings.workDays || []).includes(d.idx);
              return (
                <button
                  type="button"
                  key={d.idx}
                  onClick={() => toggleWorkDay(d.idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Work Rota / External Calendar (.ics Feed)
              </h3>
              <p className="text-xs text-slate-500">
                Every event in your rota blocks out that shift plus 1 hour before and 1 hour after—even
                if marked &ldquo;Free&rdquo; in Google Calendar.
              </p>
            </div>
            {settings.lastRotaSync && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Synced: {settings.lastRotaSync} ({rotaEvents.length} shifts)
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={settings.workRotaUrl || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, workRotaUrl: e.target.value }))}
              placeholder="Paste Connecteam / work rota .ics URL here..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
            />
            <button
              type="button"
              onClick={handleSyncRotaNow}
              disabled={syncingRota}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingRota ? 'animate-spin' : ''}`} />
              <span>{syncingRota ? 'Syncing...' : 'Sync Rota Now'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Upload Downloaded .ics File</span>
              <input
                type="file"
                accept=".ics,text/calendar"
                onChange={handleICSFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPasteBox((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700"
            >
              {showPasteBox ? 'Hide Paste Box' : 'Paste .ics Text'}
            </button>
          </div>

          {showPasteBox && (
            <div className="space-y-2 pt-2">
              <textarea
                rows={4}
                value={pastedICS}
                onChange={(e) => setPastedICS(e.target.value)}
                placeholder="Paste raw BEGIN:VCALENDAR ... END:VCALENDAR text here..."
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleImportPastedICS}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Import Pasted Shifts
              </button>
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Automatic 24-Hour Pupil Reminders (In-App + Free EmailJS)
              </h3>
              <p className="text-xs text-slate-500">
                Automatically sends an in-app prompt 24 hours before confirmed lessons, plus an
                email if your free EmailJS keys are entered below.
              </p>
            </div>
            <input
              type="checkbox"
              checked={!!settings.autoRemindersEnabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, autoRemindersEnabled: e.target.checked }))
              }
              className="w-4 h-4 accent-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                EmailJS Service ID
              </label>
              <input
                type="text"
                value={settings.emailJsServiceId || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, emailJsServiceId: e.target.value }))
                }
                placeholder="service_xxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                EmailJS Template ID
              </label>
              <input
                type="text"
                value={settings.emailJsTemplateId || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, emailJsTemplateId: e.target.value }))
                }
                placeholder="template_xxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                EmailJS Public Key
              </label>
              <input
                type="text"
                value={settings.emailJsPublicKey || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, emailJsPublicKey: e.target.value }))
                }
                placeholder="Your Public Key"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
        >
          Save Working Hours &amp; Google Calendar Rules
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Holiday &amp; Appointment Unavailability (From / To Date Range)
          </h3>
          <p className="text-xs text-slate-500">
            Block out a single date or a multi-day holiday range so pupils cannot book during those
            times.
          </p>
        </div>

        <form onSubmit={handleAddHolidayRange} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                required
                value={unavailFrom}
                onChange={(e) => {
                  setUnavailFrom(e.target.value);
                  if (unavailTo < e.target.value) setUnavailTo(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                required
                min={unavailFrom}
                value={unavailTo}
                onChange={(e) => setUnavailTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={unavailReason}
                onChange={(e) => setUnavailReason(e.target.value)}
                placeholder="Holiday / MOT / Appointment"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={unavailAllDay}
                onChange={(e) => setUnavailAllDay(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <span>Block Entire Day(s)</span>
            </label>

            {!unavailAllDay && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="time"
                  value={unavailStart}
                  onChange={(e) => setUnavailStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
                <span>to</span>
                <input
                  type="time"
                  value={unavailEnd}
                  onChange={(e) => setUnavailEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                />
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              Add Unavailability Block
            </button>
          </div>
        </form>

        {unavailability.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-extrabold text-slate-700">
              Active Blocked Dates ({unavailability.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unavailability
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((u) => (
                  <div
                    key={u.id}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {formatFriendlyDate(u.date)}
                      </span>{' '}
                      <span className="text-slate-500">
                        • {u.allDay ? 'All Day' : `${u.startTime}–${u.endTime}`} ({u.reason})
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setUnavailability((prev) => prev.filter((item) => item.id !== u.id));
                        onDeleteCloudUnavail(u.id);
                      }}
                      className="text-rose-600 hover:text-rose-800 font-bold ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PUPIL SETTINGS: FULL HOME ADDRESS & SAVED PICK-UP / DROP-OFF LOCATIONS
// ============================================================================
function PupilLocationsSettingsCard({ pupil, onSaveLocations, notify }) {
  const [homeAddress, setHomeAddress] = useState(pupil.homeAddress || '');
  const [postcode, setPostcode] = useState(pupil.postcode || WEST_SUSSEX_POSTCODES[0]);
  const [savedLocations, setSavedLocations] = useState(pupil.savedLocations || []);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPostcode, setNewPostcode] = useState(pupil.postcode || WEST_SUSSEX_POSTCODES[0]);

  const handleSaveHome = (e) => {
    e.preventDefault();
    onSaveLocations({
      homeAddress: homeAddress.trim(),
      postcode,
      savedLocations
    });
    notify('Home address & saved locations updated!');
  };

  const handleAddLocation = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAddress.trim()) return;
    const nextList = [
      ...savedLocations,
      {
        id: `loc-${Date.now()}`,
        label: newLabel.trim(),
        address: newAddress.trim(),
        postcode: newPostcode
      }
    ];
    setSavedLocations(nextList);
    onSaveLocations({
      homeAddress: homeAddress.trim(),
      postcode,
      savedLocations: nextList
    });
    setNewLabel('');
    setNewAddress('');
    notify(`Saved "${newLabel.trim()}" to your pick-up/drop-off dropdown!`);
  };

  const handleRemoveLocation = (locId) => {
    const nextList = savedLocations.filter((l) => l.id !== locId);
    setSavedLocations(nextList);
    onSaveLocations({
      homeAddress: homeAddress.trim(),
      postcode,
      savedLocations: nextList
    });
    notify('Saved location removed.', 'info');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-black text-slate-900">
          Home Address &amp; Saved Pick-Up / Drop-Off Locations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Add your full home street address and save any alternative pick-up or drop-off points
          (e.g. College, Workplace, Parent&apos;s House) so you can select them from a dropdown when
          booking a lesson.
        </p>
      </div>

      <form onSubmit={handleSaveHome} className="space-y-3 pb-4 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Home Postcode Area
            </label>
            <select
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold"
            >
              {WEST_SUSSEX_POSTCODES.map((pc) => (
                <option key={pc} value={pc}>
                  {pc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Home Street Address &amp; Postcode
            </label>
            <input
              type="text"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="e.g. 24 Westgate, Chichester, PO19 3EU"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
        >
          Save Home Address
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900">
          Alternative Pick-Up / Drop-Off Locations
        </h3>
        <form onSubmit={handleAddLocation} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. College / Work)"
            className="sm:col-span-3 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
          />
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Full street address & postcode"
            className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
          />
          <select
            value={newPostcode}
            onChange={(e) => setNewPostcode(e.target.value)}
            className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
          >
            {WEST_SUSSEX_POSTCODES.map((pc) => (
              <option key={pc} value={pc}>
                {pc.split('-')[0].trim()}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:col-span-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            + Add
          </button>
        </form>

        {savedLocations.length > 0 && (
          <div className="space-y-2 pt-2">
            {savedLocations.map((loc) => (
              <div
                key={loc.id}
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-slate-900">{loc.label}:</span>{' '}
                  <span className="text-slate-600">{loc.address}</span>{' '}
                  <span className="text-slate-400">({loc.postcode.split('-')[0].trim()})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(loc.id)}
                  className="text-rose-600 hover:text-rose-800 font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PUPIL SETTINGS: CALENDAR INTEGRATION CARD (.ICS DOWNLOAD & GOOGLE CAL LINKS)
// ============================================================================
function PupilCalendarIntegrationCard({ pupil, lessons, notify }) {
  const confirmedLessons = lessons.filter(
    (l) => l.pupilId === pupil.id && l.status === 'confirmed'
  );

  const handleDownloadAllICS = () => {
    if (confirmedLessons.length === 0) {
      notify('You have no confirmed lessons to export yet.', 'info');
      return;
    }
    const content = buildLessonICSContent(confirmedLessons, pupil.name);
    downloadICSFile('LearnToPassWithUs_Lessons.ics', content);
    notify('Downloaded .ics file! Open it to add lessons to Apple Calendar or Outlook.');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Sync Driving Lessons to Your Phone Calendar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download an Apple Calendar / Outlook file for all confirmed lessons, or add individual
            lessons directly to Google Calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadAllICS}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download Apple / Outlook (.ics)</span>
        </button>
      </div>

      {confirmedLessons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700">1-Tap Google Calendar Quick-Add:</div>
          {confirmedLessons.map((l) => (
            <div
              key={l.id}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
            >
              <span className="font-semibold text-slate-800">
                {formatFriendlyDate(l.date)} at {l.startTime} ({l.durationMins}m)
              </span>
              <a
                href={buildGoogleCalendarUrl(l)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              >
                <span>+ Google Cal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACCOUNT MANAGEMENT VIEW (IN SETTINGS TAB)
// ============================================================================
function AccountManagementView({
  currentUser,
  isInstructor,
  accounts,
  onOpenCreate,
  onRequestDelete
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Logged In Profile ({currentUser.role})
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1.5">{currentUser.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.email} •{' '}
            {currentUser.homeAddress
              ? `${currentUser.homeAddress} (${currentUser.postcode.split('-')[0].trim()})`
              : currentUser.postcode}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isInstructor && (
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Pupil Account</span>
            </button>
          )}
          <button
            onClick={() => onRequestDelete(currentUser)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {isInstructor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Registered Pupil &amp; Instructor Accounts ({accounts.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{acc.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {acc.email} • Pick-up:{' '}
                    {acc.homeAddress
                      ? `${acc.homeAddress} (${acc.postcode.split('-')[0].trim()})`
                      : acc.postcode}
                  </p>
                </div>
                {acc.id !== currentUser.id && (
                  <button
                    onClick={() => onRequestDelete(acc)}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
                  >
                    Delete Account
                  </button>
                )}
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
    const areaCode = (selectedPupil.postcode || 'PO19 - Chichester City Centre')
      .split('-')[0]
      .trim();
    const resolvedPickup = selectedPupil.homeAddress?.trim()
      ? `${areaCode} - ${selectedPupil.homeAddress.trim()} (Home)`
      : selectedPupil.postcode;
    onCreate({
      pupilAccount: selectedPupil,
      date,
      startTime,
      durationMins,
      pickupLocation: resolvedPickup,
      dropoffLocation: resolvedPickup,
      pupilNotes: '',
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900">Schedule Lesson for Pupil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
            ✕
          </button>
        </div>

        {pupilsList.length === 0 ? (
          <p className="text-xs text-slate-600">
            No pupils registered yet. Create a pupil account in Settings first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Pupil</label>
              <select
                value={pupilId}
                onChange={(e) => setPupilId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                {pupilsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.postcode.split('-')[0].trim()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
              <select
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value={60}>1 Hour (60 mins)</option>
                <option value={90}>1.5 Hours (90 mins)</option>
                <option value={120}>2 Hours (120 mins)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lesson Focus</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Confirm Lesson
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: INSTRUCTOR CREATES A NEW PUPIL ACCOUNT
// ============================================================================
function CreateAccountModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pass123!');
  const [postcode, setPostcode] = useState(WEST_SUSSEX_POSTCODES[0]);
  const [homeAddress, setHomeAddress] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onCreate({
      id: `pupil-${Date.now()}`,
      role: 'pupil',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      postcode,
      homeAddress: homeAddress.trim(),
      savedLocations: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900">Create New Pupil Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pupil Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pupil Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pupil@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Postcode Area</label>
            <select
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
            >
              {WEST_SUSSEX_POSTCODES.map((pc) => (
                <option key={pc} value={pc}>
                  {pc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Home Street Address (Optional)
            </label>
            <input
              type="text"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Street & house number"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: GOOGLE CALENDAR GUIDE & CONFIRMATION DIALOG
// ============================================================================
function GoogleCalendarGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-3">
        <h3 className="text-base font-black text-slate-900">Calendar Sync Guide</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Paste your Connecteam or work rota `.ics` link in Settings and click{' '}
          <strong>Sync Rota Now</strong> (or upload your downloaded `.ics` file) to automatically
          block out all shifts plus 1 hour before and after each shift.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}