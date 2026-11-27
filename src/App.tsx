import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// 1. SAFE ENVIRONMENT & FIREBASE INITIALIZATION
// ---------------------------------------------------------------------------
const getEnvVar = (key, fallback = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (_) {}
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDummyKeyForLearnToPassWithUs'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'learn-2-pass-with-us.firebaseapp.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'learn-2-pass-with-us'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'learn-2-pass-with-us.appspot.com'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:123456789012:web:abcdef123456'),
};

let appInstance = null;
let authInstance = null;
let dbInstance = null;

try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
} catch (err) {
  console.warn('Firebase initialization warning:', err);
}

const INSTRUCTOR_ACCESS_CODE = 'EN56WXA';
const SCHOOL_NAME = 'Learn To Pass With Us';
const CAR_DETAILS = 'Black Volkswagen Golf Mk5 GTI (Manual 6-Speed • EN56 WXA)';

// ---------------------------------------------------------------------------
// 2. WEST SUSSEX POSTCODE AREAS & TRAVEL MATRIX
// ---------------------------------------------------------------------------
const POSTCODE_AREAS = [
  { code: 'PO19', label: 'PO19 — Chichester North / City Centre', driveMinutesFromBase: 5 },
  { code: 'PO20', label: 'PO20 — Chichester South / Selsey / Witterings', driveMinutesFromBase: 15 },
  { code: 'PO18', label: 'PO18 — Bosham / Lavant / Boxgrove', driveMinutesFromBase: 10 },
  { code: 'PO21', label: 'PO21 — Bognor Regis West / Aldwick / Pagham', driveMinutesFromBase: 15 },
  { code: 'PO22', label: 'PO22 — Bognor Regis East / Felpham / Barnham', driveMinutesFromBase: 20 },
  { code: 'BN18', label: 'BN18 — Arundel / Yapton / Walberton', driveMinutesFromBase: 20 },
  { code: 'BN17', label: 'BN17 — Littlehampton / Wick / Rustington', driveMinutesFromBase: 25 },
  { code: 'PO10', label: 'PO10 — Emsworth / Southbourne / Westbourne', driveMinutesFromBase: 15 },
  { code: 'PO9', label: 'PO9 — Havant / Rowland’s Castle', driveMinutesFromBase: 20 },
  { code: 'PO1-PO6', label: 'PO1–PO6 — Portsmouth / Cosham / Hilsea Test Centre', driveMinutesFromBase: 30 },
];

const estimateTravelMinutes = (areaA, areaB) => {
  if (!areaA || !areaB || areaA === areaB) return 10;
  const infoA = POSTCODE_AREAS.find((p) => p.code === areaA);
  const infoB = POSTCODE_AREAS.find((p) => p.code === areaB);
  if (!infoA || !infoB) return 15;
  return Math.min(35, Math.max(10, Math.abs(infoA.driveMinutesFromBase - infoB.driveMinutesFromBase) + 10));
};

// ---------------------------------------------------------------------------
// 3. DVSA 27-TOPIC SYLLABUS
// ---------------------------------------------------------------------------
const DVSA_SYLLABUS_TOPICS = [
  { id: 't1', category: '1. Basics & Controls', title: 'Cockpit Drill & Controls' },
  { id: 't2', category: '1. Basics & Controls', title: 'Moving Off & Stopping Safely' },
  { id: 't3', category: '1. Basics & Controls', title: 'Clutch Control & Gear Changing' },
  { id: 't4', category: '1. Basics & Controls', title: 'Steering & Road Positioning' },
  { id: 't5', category: '1. Basics & Controls', title: 'Mirrors — Signal — Manoeuvre (MSM)' },
  { id: 't6', category: '2. Junctions & Roundabouts', title: 'Approaching & Emerging at T-Junctions' },
  { id: 't7', category: '2. Junctions & Roundabouts', title: 'Crossroads & Box Junctions' },
  { id: 't8', category: '2. Junctions & Roundabouts', title: 'Mini Roundabouts' },
  { id: 't9', category: '2. Junctions & Roundabouts', title: 'Multi-Lane & Spiral Roundabouts' },
  { id: 't10', category: '2. Junctions & Roundabouts', title: 'Pedestrian Crossings & Traffic Lights' },
  { id: 't11', category: '3. Manoeuvres', title: 'Parallel Parking (Reverse)' },
  { id: 't12', category: '3. Manoeuvres', title: 'Forward Bay Parking' },
  { id: 't13', category: '3. Manoeuvres', title: 'Reverse Bay Parking' },
  { id: 't14', category: '3. Manoeuvres', title: 'Pulling Up on the Right & Reversing' },
  { id: 't15', category: '3. Manoeuvres', title: 'Emergency Stop Procedure' },
  { id: 't16', category: '4. Road Types & Speed', title: 'Meeting Traffic & Clearance' },
  { id: 't17', category: '4. Road Types & Speed', title: 'Anticipation & Hazard Perception' },
  { id: 't18', category: '4. Road Types & Speed', title: 'Country Roads & Bends' },
  { id: 't19', category: '4. Road Types & Speed', title: 'Dual Carriageways (A27) & Slip Roads' },
  { id: 't20', category: '4. Road Types & Speed', title: 'One-Way Streets & Bus Lanes' },
  { id: 't21', category: '5. Test Readiness', title: 'Night & All-Weather Driving' },
  { id: 't22', category: '5. Test Readiness', title: 'Independent Driving (Sat-Nav)' },
  { id: 't23', category: '5. Test Readiness', title: 'Independent Driving (Traffic Signs)' },
  { id: 't24', category: '5. Test Readiness', title: 'Show Me, Tell Me Safety Questions' },
  { id: 't25', category: '5. Test Readiness', title: 'Chichester / Portsmouth Test Routes' },
  { id: 't26', category: '5. Test Readiness', title: 'Mock Driving Test 1' },
  { id: 't27', category: '5. Test Readiness', title: 'Mock Driving Test 2 (Test Ready)' },
];

const STATUS_CYCLE = ['not_started', 'introduced', 'prompted', 'independent'];
const STATUS_META = {
  not_started: { label: 'Not Started', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  introduced: { label: 'Introduced', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  prompted: { label: 'Prompted', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  independent: { label: 'Independent', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

// ---------------------------------------------------------------------------
// 4. DATE, TIME, ICS PARSER & SLOT AVAILABILITY HELPERS
// ---------------------------------------------------------------------------
const normalizeDateStr = (raw) => {
  if (!raw) return '';
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTodayDateStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

const timeToMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const minutesToTime = (totalMins) => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(totalMins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatDisplayDate = (dateStr) => {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return '';
  const [y, m, d] = norm.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const parseICSTimestamp = (val) => {
  if (!val) return null;
  const clean = val.trim();
  // All-day YYYYMMDD
  if (/^\d{8}$/.test(clean)) {
    const y = parseInt(clean.slice(0, 4), 10);
    const m = parseInt(clean.slice(4, 6), 10) - 1;
    const d = parseInt(clean.slice(6, 8), 10);
    return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
  }
  // YYYYMMDDTHHMMSS(Z)
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (match) {
    const [, ys, ms, ds, hs, mins, secs, z] = match;
    if (z === 'Z') {
      return {
        date: new Date(Date.UTC(+ys, +ms - 1, +ds, +hs, +mins, +secs)),
        isAllDay: false,
      };
    }
    return {
      date: new Date(+ys, +ms - 1, +ds, +hs, +mins, +secs),
      isAllDay: false,
    };
  }
  return null;
};

const parseICSFeedEvents = (icsText) => {
  if (!icsText || typeof icsText !== 'string') return [];
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const rawEvents = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      rawEvents.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const keyPart = line.slice(0, colonIdx).split(';')[0].toUpperCase();
        const valuePart = line.slice(colonIdx + 1).trim();
        current[keyPart] = valuePart;
      }
    }
  }

  const expanded = [];
  rawEvents.forEach((ev, idx) => {
    const startParsed = parseICSTimestamp(ev.DTSTART);
    if (!startParsed) return;
    const endParsed = parseICSTimestamp(ev.DTEND);
    const summary = (ev.SUMMARY || 'Work Rota Shift').replace(/\\,/g, ',').replace(/\\n/g, ' ');

    if (startParsed.isAllDay) {
      const sDate = startParsed.date;
      const eDate = endParsed ? endParsed.date : new Date(sDate.getTime() + 86400000);
      const cursor = new Date(sDate);
      let guard = 0;
      while (cursor < eDate && guard < 60) {
        const dStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
          cursor.getDate()
        ).padStart(2, '0')}`;
        expanded.push({
          id: `ics-${idx}-${dStr}`,
          date: dStr,
          startTime: '00:00',
          endTime: '23:59',
          allDay: true,
          title: summary,
        });
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
      if (guard === 0) {
        const dStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(
          sDate.getDate()
        ).padStart(2, '0')}`;
        expanded.push({
          id: `ics-${idx}-${dStr}`,
          date: dStr,
          startTime: '00:00',
          endTime: '23:59',
          allDay: true,
          title: summary,
        });
      }
      return;
    }

    const startDt = startParsed.date;
    const endDt =
      endParsed && endParsed.date > startDt
        ? endParsed.date
        : new Date(startDt.getTime() + 60 * 60000);

    // Split multi-day / overnight shifts across midnight
    let cursor = new Date(startDt);
    let safety = 0;
    while (cursor < endDt && safety < 14) {
      const dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 0, 0, 0);
      const nextDayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 0, 0, 0);
      const segStart = cursor > dayStart ? cursor : dayStart;
      const segEnd = endDt < nextDayStart ? endDt : nextDayStart;

      const dStr = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(
        dayStart.getDate()
      ).padStart(2, '0')}`;
      const stStr = `${String(segStart.getHours()).padStart(2, '0')}:${String(
        segStart.getMinutes()
      ).padStart(2, '0')}`;
      const etMins =
        segEnd.getTime() === nextDayStart.getTime()
          ? 24 * 60
          : segEnd.getHours() * 60 + segEnd.getMinutes();

      if (etMins > timeToMinutes(stStr)) {
        expanded.push({
          id: `ics-${idx}-${dStr}-${safety}`,
          date: dStr,
          startTime: stStr,
          endTime: minutesToTime(etMins),
          allDay: false,
          title: summary,
        });
      }
      cursor = nextDayStart;
      safety++;
    }
  });

  return expanded;
};

// Core availability engine: blocks lessons overlapping confirmed/pending lessons,
// manual unavailability blocks, and imported rota shifts (with 1h pre & 1h post buffer).
const computeSlotAvailability = ({
  date,
  durationMinutes = 60,
  pickupArea = 'PO19',
  dropoffArea = 'PO19',
  lessons = [],
  unavailability = [],
  rotaEvents = [],
  settings = {},
}) => {
  const targetDate = normalizeDateStr(date);
  if (!targetDate) return [];

  const firstStart = timeToMinutes(settings.workStart || '07:00');
  const lastStart = timeToMinutes(settings.workEnd || '18:00');

  // Build blocked minute intervals [startMin, endMin] for this date
  const blockedIntervals = [];

  // 1. Existing confirmed & pending lessons (plus travel buffer)
  lessons.forEach((lesson) => {
    if (normalizeDateStr(lesson.date) !== targetDate) return;
    if (lesson.status === 'cancelled' || lesson.status === 'declined') return;
    const lStart = timeToMinutes(lesson.startTime);
    const lEnd = lStart + (Number(lesson.durationMinutes) || 60);
    const bufferBefore = estimateTravelMinutes(dropoffArea, lesson.pickupArea || 'PO19');
    const bufferAfter = estimateTravelMinutes(lesson.dropoffArea || lesson.pickupArea || 'PO19', pickupArea);
    blockedIntervals.push({
      start: Math.max(0, lStart - bufferBefore),
      end: Math.min(24 * 60, lEnd + bufferAfter),
      reason: 'Booked Lesson',
    });
  });

  // 2. Manual Unavailability blocks
  unavailability.forEach((block) => {
    if (normalizeDateStr(block.date) !== targetDate) return;
    if (block.allDay) {
      blockedIntervals.push({ start: 0, end: 24 * 60, reason: block.reason || 'Unavailable' });
    } else {
      blockedIntervals.push({
        start: timeToMinutes(block.startTime || '00:00'),
        end: timeToMinutes(block.endTime || '23:59'),
        reason: block.reason || 'Unavailable',
      });
    }
  });

  // 3. Imported Work Rota / Calendar shifts (including 60 mins BEFORE & 60 mins AFTER)
  rotaEvents.forEach((ev) => {
    if (normalizeDateStr(ev.date) !== targetDate) return;
    if (ev.allDay) {
      blockedIntervals.push({ start: 0, end: 24 * 60, reason: ev.title || 'Work Shift' });
    } else {
      const s = timeToMinutes(ev.startTime || '00:00');
      const e = timeToMinutes(ev.endTime || '23:59');
      blockedIntervals.push({
        start: Math.max(0, s - 60),
        end: Math.min(24 * 60, e + 60),
        reason: ev.title || 'Work Shift (+1h travel buffer)',
      });
    }
  });

  // Also check if a shift ending early next morning requires a 1h buffer or late-night shift on previous day spills over
  const [yy, mm, dd] = targetDate.split('-').map(Number);
  const prevDt = new Date(yy, mm - 1, dd - 1);
  const prevDateStr = `${prevDt.getFullYear()}-${String(prevDt.getMonth() + 1).padStart(2, '0')}-${String(
    prevDt.getDate()
  ).padStart(2, '0')}`;
  rotaEvents.forEach((ev) => {
    if (normalizeDateStr(ev.date) !== prevDateStr || ev.allDay) return;
    const e = timeToMinutes(ev.endTime || '00:00');
    // If shift ended after 23:00 the previous night, its 60-minute post-shift buffer extends into today
    if (e > 23 * 60) {
      const spillover = e + 60 - 24 * 60;
      if (spillover > 0) {
        blockedIntervals.push({
          start: 0,
          end: spillover,
          reason: 'Post-shift rest/travel buffer',
        });
      }
    }
  });

  // 4. Recurring External Shift Days (if configured in Settings)
  if (settings.externalShiftEnabled && Array.isArray(settings.externalShiftDays)) {
    const dayOfWeek = new Date(yy, mm - 1, dd).getDay();
    if (settings.externalShiftDays.includes(dayOfWeek)) {
      const s = timeToMinutes(settings.externalShiftStart || '06:00');
      const e = timeToMinutes(settings.externalShiftEnd || '17:00');
      blockedIntervals.push({
        start: Math.max(0, s - 60),
        end: Math.min(24 * 60, e + 60),
        reason: 'Recurring Shift (+1h buffer)',
      });
    }
  }

  // Generate 30-minute start slots between firstStart (07:00) and lastStart (18:00)
  const slots = [];
  const now = new Date();
  const todayStr = getTodayDateStr();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let startMin = firstStart; startMin <= lastStart; startMin += 30) {
    const endMin = startMin + durationMinutes;
    const startTime = minutesToTime(startMin);
    const endTime = minutesToTime(endMin);

    let available = true;
    let conflictReason = '';

    if (targetDate === todayStr && startMin <= nowMinutes + 30) {
      available = false;
      conflictReason = 'Time passed';
    }

    if (available) {
      for (const blk of blockedIntervals) {
        // Strict overlap check: [startMin, endMin) intersects [blk.start, blk.end)
        if (startMin < blk.end && endMin > blk.start) {
          available = false;
          conflictReason = blk.reason;
          break;
        }
      }
    }

    slots.push({
      startTime,
      endTime,
      available,
      conflictReason,
    });
  }

  return slots;
};

// Calendar Export Helpers (.ics & Google Calendar Quick Link)
const buildGoogleCalendarUrl = (lesson) => {
  const dateCompact = normalizeDateStr(lesson.date).replace(/-/g, '');
  const startMin = timeToMinutes(lesson.startTime);
  const endMin = startMin + (Number(lesson.durationMinutes) || 60);
  const startCompact = minutesToTime(startMin).replace(':', '') + '00';
  const endCompact = minutesToTime(endMin).replace(':', '') + '00';

  const title = encodeURIComponent(`Driving Lesson: ${lesson.pupilName || 'Pupil'} (${SCHOOL_NAME})`);
  const location = encodeURIComponent(lesson.pickupLocation || lesson.pickupArea || 'Chichester');
  const details = encodeURIComponent(
    `Instructor: Mark (${CAR_DETAILS})\nPick-up: ${lesson.pickupLocation || lesson.pickupArea}\nDrop-off: ${
      lesson.dropoffLocation || lesson.dropoffArea || lesson.pickupLocation
    }\nFocus: ${lesson.focusTopic || 'General Driving'}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateCompact}T${startCompact}/${dateCompact}T${endCompact}&details=${details}&location=${location}`;
};

const downloadLessonsICS = (lessonsList, filename = 'learn-to-pass-lessons.ics') => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn To Pass With Us//Driving School Portal//EN',
    'CALSCALE:GREGORIAN',
  ];

  lessonsList.forEach((l) => {
    const dCompact = normalizeDateStr(l.date).replace(/-/g, '');
    const sMin = timeToMinutes(l.startTime);
    const eMin = sMin + (Number(l.durationMinutes) || 60);
    const sStr = minutesToTime(sMin).replace(':', '') + '00';
    const eStr = minutesToTime(eMin).replace(':', '') + '00';
    const pickup = l.pickupLocation || l.pickupArea || 'Chichester';
    const dropoff = l.dropoffLocation || l.dropoffArea || pickup;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${l.id || Date.now()}@learntopasswithus.co.uk`);
    lines.push(`DTSTART:${dCompact}T${sStr}`);
    lines.push(`DTEND:${dCompact}T${eStr}`);
    lines.push(`SUMMARY:Driving Lesson - ${l.pupilName || 'Pupil'} (${SCHOOL_NAME})`);
    lines.push(`LOCATION:${pickup.replace(/,/g, '\\,')}`);
    lines.push(
      `DESCRIPTION:Pick-up: ${pickup.replace(/,/g, '\\,')}\\nDrop-off: ${dropoff.replace(
        /,/g,
        '\\,'
      )}\\nFocus: ${(l.focusTopic || 'Driving Lesson').replace(/,/g, '\\,')}`
    );
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// 5. VEHICLE BADGE COMPONENT
// ---------------------------------------------------------------------------
function VWGolfGTIBadge() {
  return (
    <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
          Dual-Control Training Car
        </span>
        <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-extrabold text-xs tracking-wider">
          EN56 WXA
        </span>
      </div>
      <h3 className="text-lg font-bold mt-3 text-white">Black Volkswagen Golf Mk5 GTI</h3>
      <p className="text-xs text-slate-300 mt-1">
        Manual 6-Speed • He-Man Dual Controls • Chichester &amp; West Sussex
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. MAIN APPLICATION COMPONENT
// ---------------------------------------------------------------------------
export default function App() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unavailability, setUnavailability] = useState([]);
  const [rotaEvents, setRotaEvents] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({
    workStart: '07:00',
    workEnd: '18:00',
    rotaFeedUrl: '',
    lastRotaSync: '',
    externalShiftEnabled: false,
    externalShiftStart: '06:00',
    externalShiftEnd: '17:00',
    externalShiftDays: [],
    autoReminderEnabled: true,
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
  });

  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem('ltpwu_user_id') || null;
    } catch (_) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChatPupilId, setSelectedChatPupilId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Firebase Auth & Real-Time Firestore Listeners
  useEffect(() => {
    if (!authInstance || !dbInstance) return;

    signInAnonymously(authInstance).catch((err) =>
      console.warn('Anonymous auth warning:', err)
    );

    const unsubAuth = onAuthStateChanged(authInstance, (user) => {
      if (user) setFirebaseReady(true);
    });

    const unsubAccounts = onSnapshot(collection(dbInstance, 'accounts'), (snap) => {
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubLessons = onSnapshot(collection(dbInstance, 'lessons'), (snap) => {
      setLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubMessages = onSnapshot(collection(dbInstance, 'messages'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setMessages(list);
    });

    const unsubUnavail = onSnapshot(collection(dbInstance, 'unavailability'), (snap) => {
      setUnavailability(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubRota = onSnapshot(collection(dbInstance, 'rotaEvents'), (snap) => {
      setRotaEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(dbInstance, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        setSchoolSettings((prev) => ({ ...prev, ...snap.data() }));
      }
    });

    return () => {
      unsubAuth();
      unsubAccounts();
      unsubLessons();
      unsubMessages();
      unsubUnavail();
      unsubRota();
      unsubSettings();
    };
  }, []);

  const currentUser = useMemo(
    () => accounts.find((a) => a.id === currentUserId) || null,
    [accounts, currentUserId]
  );

  // Automatic 24-Hour Reminder Engine (In-App + Optional EmailJS)
  useEffect(() => {
    if (!firebaseReady || !dbInstance || !schoolSettings.autoReminderEnabled) return;
    if (lessons.length === 0 || accounts.length === 0) return;

    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    lessons.forEach(async (lesson) => {
      if (lesson.status !== 'confirmed' || lesson.reminderSent) return;
      const [y, m, d] = normalizeDateStr(lesson.date).split('-').map(Number);
      const [hh, mm] = (lesson.startTime || '09:00').split(':').map(Number);
      if (!y || !m || !d) return;

      const lessonStartMs = new Date(y, m - 1, d, hh || 0, mm || 0, 0).getTime();
      const diff = lessonStartMs - now;

      if (diff > 0 && diff <= twentyFourHoursMs) {
        try {
          await updateDoc(doc(dbInstance, 'lessons', lesson.id), {
            reminderSent: true,
            reminderSentAt: new Date().toISOString(),
          });

          const pupil = accounts.find((a) => a.id === lesson.pupilId);
          const instructor = accounts.find((a) => a.role === 'instructor');

          await addDoc(collection(dbInstance, 'messages'), {
            senderId: instructor?.id || 'system',
            senderName: SCHOOL_NAME,
            recipientId: lesson.pupilId,
            text: `24-Hour Reminder: Your ${lesson.durationMinutes || 60}min driving lesson is tomorrow (${formatDisplayDate(
              lesson.date
            )}) at ${lesson.startTime}. Pick-up: ${
              lesson.pickupLocation || lesson.pickupArea
            }. Please tap "Confirm Still Attending" on your Lessons tab.`,
            createdAt: new Date().toISOString(),
          });

          // Optional EmailJS delivery
          if (
            pupil?.email &&
            schoolSettings.emailjsServiceId &&
            schoolSettings.emailjsTemplateId &&
            schoolSettings.emailjsPublicKey
          ) {
            fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: schoolSettings.emailjsServiceId,
                template_id: schoolSettings.emailjsTemplateId,
                user_id: schoolSettings.emailjsPublicKey,
                template_params: {
                  to_email: pupil.email,
                  to_name: pupil.name,
                  school_name: SCHOOL_NAME,
                  lesson_date: formatDisplayDate(lesson.date),
                  lesson_time: lesson.startTime,
                  pickup_location: lesson.pickupLocation || lesson.pickupArea,
                  lesson_focus: lesson.focusTopic || 'Manual Driving Lesson',
                },
              }),
            }).catch((err) => console.warn('EmailJS warning:', err));
          }
        } catch (err) {
          console.warn('Auto reminder error:', err);
        }
      }
    });
  }, [firebaseReady, lessons, accounts, schoolSettings]);

  // Auth Handlers
  const handleLogin = (email, password) => {
    const match = accounts.find(
      (a) =>
        (a.email || '').trim().toLowerCase() === email.trim().toLowerCase() &&
        a.password === password
    );
    if (!match) {
      return 'No matching account found. Check your email/password or sign up for a new account.';
    }
    setCurrentUserId(match.id);
    setActiveTab('dashboard');
    try {
      localStorage.setItem('ltpwu_user_id', match.id);
    } catch (_) {}
    return '';
  };

  const handleRegister = async (formData) => {
    const emailClean = formData.email.trim().toLowerCase();
    if (accounts.some((a) => (a.email || '').toLowerCase() === emailClean)) {
      return 'An account with this email already exists. Please Sign In instead.';
    }
    if (
      formData.role === 'instructor' &&
      formData.accessCode.trim().toUpperCase() !== INSTRUCTOR_ACCESS_CODE
    ) {
      return 'Invalid Instructor Access Code.';
    }

    const newAccount = {
      name: formData.name.trim(),
      email: emailClean,
      phone: formData.phone.trim(),
      password: formData.password,
      role: formData.role,
      postcodeArea: formData.postcodeArea || 'PO19',
      homeAddress: formData.homeAddress || '',
      savedLocations: [],
      syllabusProgress: {},
      instructorNotes: '',
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(dbInstance, 'accounts'), newAccount);
    setCurrentUserId(docRef.id);
    setActiveTab('dashboard');
    try {
      localStorage.setItem('ltpwu_user_id', docRef.id);
    } catch (_) {}
    showToast(`Welcome to ${SCHOOL_NAME}, ${newAccount.name}!`);
    return '';
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setActiveTab('dashboard');
    try {
      localStorage.removeItem('ltpwu_user_id');
    } catch (_) {}
  };

  // Lesson Handlers
  const handleCreateBookingRequest = async (bookingData) => {
    const newLesson = {
      pupilId: currentUser.id,
      pupilName: currentUser.name,
      pupilPhone: currentUser.phone || '',
      date: normalizeDateStr(bookingData.date),
      startTime: bookingData.startTime,
      durationMinutes: Number(bookingData.durationMinutes) || 60,
      pickupArea: bookingData.pickupArea || currentUser.postcodeArea || 'PO19',
      pickupLocation: bookingData.pickupLocation || currentUser.homeAddress || bookingData.pickupArea,
      dropoffArea: bookingData.dropoffArea || bookingData.pickupArea || 'PO19',
      dropoffLocation:
        bookingData.dropoffLocation || bookingData.pickupLocation || bookingData.pickupArea,
      focusTopic: bookingData.focusTopic || 'General Driving & Junctions',
      status: 'pending',
      pupilConfirmed24h: false,
      reminderSent: false,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(dbInstance, 'lessons'), newLesson);
    showToast('Lesson request sent! Mark will confirm shortly.');
  };

  const handleUpdateLessonStatus = async (lessonId, status) => {
    await updateDoc(doc(dbInstance, 'lessons', lessonId), { status });
    showToast(`Lesson marked as ${status}.`);
  };

  const handleConfirm24hAttendance = async (lessonId) => {
    await updateDoc(doc(dbInstance, 'lessons', lessonId), { pupilConfirmed24h: true });
    showToast('Attendance confirmed for your upcoming lesson!');
  };

  // Account & Address Handlers
  const handleUpdateAccount = async (accountId, updates) => {
    await updateDoc(doc(dbInstance, 'accounts', accountId), updates);
    showToast('Account & address details saved.');
  };

  const handleDeleteAccount = async (accountId) => {
    await deleteDoc(doc(dbInstance, 'accounts', accountId));
    showToast('Account deleted permanently.');
  };

  // Syllabus Handlers
  const handleUpdateTopicStatus = async (pupilId, topicId, nextStatus) => {
    const pupil = accounts.find((a) => a.id === pupilId);
    if (!pupil) return;
    const updatedProgress = { ...(pupil.syllabusProgress || {}), [topicId]: nextStatus };
    await updateDoc(doc(dbInstance, 'accounts', pupilId), { syllabusProgress: updatedProgress });
  };

  const handleUpdateInstructorNotes = async (pupilId, notes) => {
    await updateDoc(doc(dbInstance, 'accounts', pupilId), { instructorNotes: notes });
    showToast('Instructor notes saved.');
  };

  // Messaging Handler
  const handleSendMessage = async (recipientId, text) => {
    if (!text.trim() || !currentUser) return;
    await addDoc(collection(dbInstance, 'messages'), {
      senderId: currentUser.id,
      senderName: currentUser.name,
      recipientId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
  };

  // Unavailability & Settings Handlers
  const handleAddUnavailabilityRange = async ({ fromDate, toDate, allDay, startTime, endTime, reason }) => {
    const startNorm = normalizeDateStr(fromDate);
    const endNorm = normalizeDateStr(toDate || fromDate);
    if (!startNorm) return;

    const [sy, sm, sd] = startNorm.split('-').map(Number);
    const [ey, em, ed] = endNorm.split('-').map(Number);
    const cursor = new Date(sy, sm - 1, sd);
    const endDt = new Date(ey, em - 1, ed);

    let count = 0;
    while (cursor <= endDt && count < 90) {
      const dStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
        cursor.getDate()
      ).padStart(2, '0')}`;
      await addDoc(collection(dbInstance, 'unavailability'), {
        date: dStr,
        allDay: Boolean(allDay),
        startTime: allDay ? '00:00' : startTime || '07:00',
        endTime: allDay ? '23:59' : endTime || '18:00',
        reason: reason || 'Unavailable',
      });
      cursor.setDate(cursor.getDate() + 1);
      count++;
    }
    showToast(`Blocked ${count} day(s) on your calendar.`);
  };

  const handleDeleteUnavailability = async (blockId) => {
    await deleteDoc(doc(dbInstance, 'unavailability', blockId));
    showToast('Unavailability block removed.');
  };

  const handleSaveSettings = async (newSettings) => {
    await setDoc(doc(dbInstance, 'settings', 'general'), newSettings, { merge: true });
    showToast('Settings & calendar rules saved.');
  };

  const handleImportRotaEvents = async (parsedList, feedUrl = '') => {
    // Replace previous imported rota events cleanly
    for (const existing of rotaEvents) {
      await deleteDoc(doc(dbInstance, 'rotaEvents', existing.id));
    }
    for (const ev of parsedList) {
      await addDoc(collection(dbInstance, 'rotaEvents'), ev);
    }
    await setDoc(
      doc(dbInstance, 'settings', 'general'),
      {
        rotaFeedUrl: feedUrl || schoolSettings.rotaFeedUrl,
        lastRotaSync: new Date().toLocaleString('en-GB'),
      },
      { merge: true }
    );
    showToast(`Synced ${parsedList.length} work rota shift block(s) (with 1h pre/post buffer).`);
  };

  const handleOpenPupilMessages = (pupilId) => {
    setSelectedChatPupilId(pupilId);
    setActiveTab('messages');
  };

  // Render Auth Screen if not signed in
  if (!currentUser) {
    return (
      <AuthScreen
        firebaseReady={firebaseReady}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  const isInstructor = currentUser.role === 'instructor';
  const navItems = isInstructor
    ? [
        { id: 'dashboard', label: 'Home' },
        { id: 'diary', label: 'Diary' },
        { id: 'pupils', label: 'Pupils' },
        { id: 'messages', label: 'Messages' },
      ]
    : [
        { id: 'dashboard', label: 'Lessons' },
        { id: 'diary', label: 'Diary' },
        { id: 'progress', label: 'Progress' },
        { id: 'messages', label: 'Messages' },
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-amber-600 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-red-500 font-black text-lg flex items-center justify-center border border-slate-700 shadow-inner">
              L
            </div>
            <div>
              <h1 className="font-black tracking-tight text-sm sm:text-base leading-none uppercase">
                Learn To Pass With Us
              </h1>
              <span className="text-[11px] text-amber-100 font-medium">
                {isInstructor ? 'Instructor Portal • EN56 WXA' : `Pupil Portal • ${currentUser.name}`}
              </span>
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wide transition-all ${
                    active
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-white/95 hover:bg-amber-700/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Top-Right Settings Cog & Sign Out */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              title="Account & Calendar Settings"
              className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-slate-950 text-white'
                  : 'text-white hover:bg-amber-700/70'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-[10px] font-bold leading-none mt-0.5">Settings</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-950/25 hover:bg-slate-950/40 text-white text-xs font-bold transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-sm font-medium">
          {toastMsg}
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        {activeTab === 'dashboard' && isInstructor && (
          <InstructorDashboardView
            lessons={lessons}
            accounts={accounts}
            onUpdateLessonStatus={handleUpdateLessonStatus}
          />
        )}

        {activeTab === 'dashboard' && !isInstructor && (
          <PupilDashboardView
            currentUser={currentUser}
            lessons={lessons}
            unavailability={unavailability}
            rotaEvents={rotaEvents}
            settings={schoolSettings}
            onCreateBookingRequest={handleCreateBookingRequest}
            onConfirm24hAttendance={handleConfirm24hAttendance}
            onGoToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'diary' && (
          <GoogleStyleDiaryView
            isInstructor={isInstructor}
            currentUser={currentUser}
            lessons={lessons}
            unavailability={unavailability}
            rotaEvents={rotaEvents}
          />
        )}

        {activeTab === 'pupils' && isInstructor && (
          <InstructorPupilsDirectoryView
            accounts={accounts}
            lessons={lessons}
            onUpdateTopicStatus={handleUpdateTopicStatus}
            onUpdateInstructorNotes={handleUpdateInstructorNotes}
            onMessagePupil={handleOpenPupilMessages}
          />
        )}

        {activeTab === 'progress' && !isInstructor && (
          <SyllabusFlowchartView
            currentUser={currentUser}
            accounts={accounts}
            forcedPupilId={currentUser.id}
            onUpdateTopicStatus={handleUpdateTopicStatus}
            onUpdateInstructorNotes={handleUpdateInstructorNotes}
          />
        )}

        {activeTab === 'messages' && (
          <MessagingCenterView
            currentUser={currentUser}
            accounts={accounts}
            messages={messages}
            initialRecipientId={selectedChatPupilId}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'settings' && (
          <AccountAndCalendarSettingsView
            currentUser={currentUser}
            accounts={accounts}
            lessons={lessons}
            unavailability={unavailability}
            rotaEvents={rotaEvents}
            settings={schoolSettings}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onAddUnavailabilityRange={handleAddUnavailabilityRange}
            onDeleteUnavailability={handleDeleteUnavailability}
            onSaveSettings={handleSaveSettings}
            onImportRotaEvents={handleImportRotaEvents}
          />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. LIGHT-THEME AUTH SCREEN WITH CAPS LOCK DETECTION
// ---------------------------------------------------------------------------
function AuthScreen({ firebaseReady, onLogin, onRegister }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [role, setRole] = useState('pupil');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postcodeArea, setPostcodeArea] = useState('PO19');
  const [homeAddress, setHomeAddress] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkCapsLock = (e) => {
    if (e && typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const err = onLogin(email, password);
        if (err) setErrorMsg(err);
      } else {
        if (!name.trim() || !email.trim() || !password) {
          setErrorMsg('Please complete all required fields.');
          setSubmitting(false);
          return;
        }
        const err = await onRegister({
          name,
          email,
          phone,
          postcodeArea,
          homeAddress,
          password,
          role,
          accessCode,
        });
        if (err) setErrorMsg(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center">
              L
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">{SCHOOL_NAME}</h1>
              <p className="text-xs text-slate-500">Chichester &amp; West Sussex Driving School</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              firebaseReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {firebaseReady ? '● Live Booking Portal' : '○ Connecting...'}
          </span>
        </div>
      </header>

      <div className="max-w-5xl w-full mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Info Column */}
        <div className="lg:col-span-6 space-y-5">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            DVSA Approved Driving Instruction
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Book Lessons, Track Your DVSA Progress &amp; Sync Your Calendar.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Sign in to your personal pupil portal to book 1hr, 1.5hr, or 2hr manual driving
            lessons across Chichester, Bognor Regis, Arundel, and Portsmouth, manage your pick-up
            addresses, and track all 27 DVSA syllabus skills.
          </p>
          <VWGolfGTIBadge />
        </div>

        {/* Right Light Form Card */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
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
                setMode('signup');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Pupil Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registering As
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pupil">Learner Pupil</option>
                    <option value="instructor">Driving Instructor</option>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07700 900123"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Postcode Area
                    </label>
                    <select
                      value={postcodeArea}
                      onChange={(e) => setPostcodeArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {POSTCODE_AREAS.map((area) => (
                        <option key={area.code} value={area.code}>
                          {area.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {role === 'pupil' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Pick-Up Address (Optional — can also edit in Settings)
                    </label>
                    <input
                      type="text"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="e.g. 14 Westgate, Chichester, PO19 3EU"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {role === 'instructor' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instructor Access Code
                    </label>
                    <input
                      type="text"
                      required
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter access code"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                {capsLockOn && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    CAPS LOCK IS ON
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onKeyUp={checkCapsLock}
                  onKeyDown={checkCapsLock}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-16 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {capsLockOn && (
                <p className="text-xs text-amber-700 mt-1 font-medium">
                  Heads up: Caps Lock is turned on, which may affect your password.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In to My Portal'
                : 'Create Account & Enter Portal'}
            </button>
          </form>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 py-4">
        © {new Date().getFullYear()} {SCHOOL_NAME} • Chichester, West Sussex
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. INSTRUCTOR HOME DASHBOARD
// ---------------------------------------------------------------------------
function InstructorDashboardView({ lessons, accounts, onUpdateLessonStatus }) {
  const pendingLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.status === 'pending')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [lessons]
  );

  const upcomingConfirmed = useMemo(() => {
    const today = getTodayDateStr();
    return lessons
      .filter((l) => l.status === 'confirmed' && normalizeDateStr(l.date) >= today)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [lessons]);

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Pending Requests
          </p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{pendingLessons.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Upcoming Confirmed
          </p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">
            {upcomingConfirmed.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Pupils</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {accounts.filter((a) => a.role === 'pupil').length}
          </p>
        </div>
      </div>

      {/* Pending Lesson Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Lesson Requests</h2>
        {pendingLessons.length === 0 ? (
          <p className="text-sm text-slate-500">No pending lesson requests right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingLessons.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{l.pupilName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                      {formatDisplayDate(l.date)} • {l.startTime} ({l.durationMinutes} mins)
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">
                    <strong>Pick-up:</strong> {l.pickupLocation || l.pickupArea} •{' '}
                    <strong>Drop-off:</strong> {l.dropoffLocation || l.dropoffArea || l.pickupArea}
                  </p>
                  <p className="text-xs text-slate-500">Focus: {l.focusTopic}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateLessonStatus(l.id, 'confirmed')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    Approve Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLessonStatus(l.id, 'declined')}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Confirmed Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Confirmed Lessons</h2>
          {upcomingConfirmed.length > 0 && (
            <button
              type="button"
              onClick={() => downloadLessonsICS(upcomingConfirmed, 'instructor-lessons.ics')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              Export All (.ics)
            </button>
          )}
        </div>

        {upcomingConfirmed.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming confirmed lessons scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcomingConfirmed.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{l.pupilName}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {formatDisplayDate(l.date)} • {l.startTime} ({l.durationMinutes} mins)
                    </span>
                    {l.pupilConfirmed24h && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                        ✓ Pupil Confirmed 24h
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700">
                    <strong>Pick-up:</strong> {l.pickupLocation || l.pickupArea} •{' '}
                    <strong>Drop-off:</strong> {l.dropoffLocation || l.dropoffArea || l.pickupArea}
                  </p>
                  <p className="text-xs text-slate-500">Focus: {l.focusTopic}</p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={buildGoogleCalendarUrl(l)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold"
                  >
                    + Google Cal
                  </a>
                  <button
                    type="button"
                    onClick={() => onUpdateLessonStatus(l.id, 'cancelled')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold"
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

// ---------------------------------------------------------------------------
// 9. PUPIL LESSONS & BOOKING DASHBOARD
// ---------------------------------------------------------------------------
function PupilDashboardView({
  currentUser,
  lessons,
  unavailability,
  rotaEvents,
  settings,
  onCreateBookingRequest,
  onConfirm24hAttendance,
  onGoToSettings,
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedTime, setSelectedTime] = useState('');
  const [focusTopic, setFocusTopic] = useState('Junctions, Roundabouts & Road Positioning');

  // Build dropdown choices from pupil's saved home address, saved alternative locations, and postcode areas
  const locationOptions = useMemo(() => {
    const opts = [];
    if (currentUser.homeAddress && currentUser.homeAddress.trim()) {
      opts.push({
        id: 'home',
        label: `Home: ${currentUser.homeAddress.trim()}`,
        value: currentUser.homeAddress.trim(),
        area: currentUser.postcodeArea || 'PO19',
      });
    }
    if (Array.isArray(currentUser.savedLocations)) {
      currentUser.savedLocations.forEach((loc, idx) => {
        const display = loc.label ? `${loc.label}: ${loc.address}` : loc.address;
        opts.push({
          id: loc.id || `saved-${idx}`,
          label: display,
          value: display,
          area: loc.postcodeArea || currentUser.postcodeArea || 'PO19',
        });
      });
    }
    POSTCODE_AREAS.forEach((p) => {
      opts.push({
        id: `area-${p.code}`,
        label: `Area: ${p.label}`,
        value: p.label,
        area: p.code,
      });
    });
    return opts;
  }, [currentUser]);

  const [pickupChoiceId, setPickupChoiceId] = useState(locationOptions[0]?.id || 'area-PO19');
  const [dropoffChoiceId, setDropoffChoiceId] = useState(locationOptions[0]?.id || 'area-PO19');

  useEffect(() => {
    if (locationOptions.length > 0 && !locationOptions.some((o) => o.id === pickupChoiceId)) {
      setPickupChoiceId(locationOptions[0].id);
    }
    if (locationOptions.length > 0 && !locationOptions.some((o) => o.id === dropoffChoiceId)) {
      setDropoffChoiceId(locationOptions[0].id);
    }
  }, [locationOptions, pickupChoiceId, dropoffChoiceId]);

  const pickupOption =
    locationOptions.find((o) => o.id === pickupChoiceId) || locationOptions[0];
  const dropoffOption =
    locationOptions.find((o) => o.id === dropoffChoiceId) || locationOptions[0];

  const computedSlots = useMemo(
    () =>
      computeSlotAvailability({
        date: selectedDate,
        durationMinutes,
        pickupArea: pickupOption?.area || 'PO19',
        dropoffArea: dropoffOption?.area || 'PO19',
        lessons,
        unavailability,
        rotaEvents,
        settings,
      }),
    [
      selectedDate,
      durationMinutes,
      pickupOption,
      dropoffOption,
      lessons,
      unavailability,
      rotaEvents,
      settings,
    ]
  );

  const myLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.pupilId === currentUser.id && l.status !== 'cancelled')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [lessons, currentUser.id]
  );

  const lessonsNeeding24hConfirm = useMemo(
    () => myLessons.filter((l) => l.status === 'confirmed' && l.reminderSent && !l.pupilConfirmed24h),
    [myLessons]
  );

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTime) return;
    await onCreateBookingRequest({
      date: selectedDate,
      startTime: selectedTime,
      durationMinutes,
      pickupArea: pickupOption?.area || 'PO19',
      pickupLocation: pickupOption?.value || 'Chichester',
      dropoffArea: dropoffOption?.area || 'PO19',
      dropoffLocation: dropoffOption?.value || 'Chichester',
      focusTopic,
    });
    setSelectedTime('');
  };

  return (
    <div className="space-y-6">
      {/* 24-Hour Attendance Confirmation Banner */}
      {lessonsNeeding24hConfirm.map((l) => (
        <div
          key={l.id}
          className="p-4 rounded-2xl bg-amber-100 border border-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              24-Hour Lesson Confirmation Needed
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              Tomorrow ({formatDisplayDate(l.date)}) at {l.startTime} • Pick-up:{' '}
              {l.pickupLocation || l.pickupArea}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onConfirm24hAttendance(l.id)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold self-start sm:self-auto"
          >
            Confirm Still Attending
          </button>
        </div>
      ))}

      {/* Helpful Note Pointing to Settings for Addresses & Calendar Sync */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs sm:text-sm text-sky-900">
          <strong>Tip:</strong> Need to save your full home address, add alternative pick-up/drop-off
          locations, or sync your lessons to Apple/Google Calendar? You can manage all of those in{' '}
          <strong>Settings (⚙️)</strong>.
        </p>
        <button
          type="button"
          onClick={onGoToSettings}
          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold whitespace-nowrap self-start sm:self-auto"
        >
          Open Settings
        </button>
      </div>

      {/* Book a Lesson Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Request a Driving Lesson</h2>
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lesson Date</label>
              <input
                type="date"
                min={getTodayDateStr()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => {
                  setDurationMinutes(Number(e.target.value));
                  setSelectedTime('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm"
              >
                <option value={60}>1 Hour (60 mins)</option>
                <option value={90}>1.5 Hours (90 mins)</option>
                <option value={120}>2 Hours (120 mins)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pick-Up Location
              </label>
              <select
                value={pickupChoiceId}
                onChange={(e) => {
                  setPickupChoiceId(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm"
              >
                {locationOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Drop-Off Location
              </label>
              <select
                value={dropoffChoiceId}
                onChange={(e) => {
                  setDropoffChoiceId(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm"
              >
                {locationOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lesson Focus / Skill Goal
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="e.g. Roundabouts, Parallel Parking, Dual Carriageway"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 [color-scheme:light] text-sm"
            />
          </div>

          {/* Available Time Slot Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Available Start Times on {formatDisplayDate(selectedDate)} (07:00 – 18:00)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {computedSlots.map((slot) => {
                const isSelected = selectedTime === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.startTime)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      !slot.available
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                        : isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500'
                    }`}
                  >
                    {slot.startTime}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedTime}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm disabled:opacity-40"
          >
            {selectedTime
              ? `Request ${durationMinutes}min Lesson at ${selectedTime}`
              : 'Select an Available Start Time Above'}
          </button>
        </form>
      </div>

      {/* Pupil's Lessons List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">My Booked &amp; Requested Lessons</h2>
        {myLessons.length === 0 ? (
          <p className="text-sm text-slate-500">You haven’t requested any lessons yet.</p>
        ) : (
          <div className="space-y-3">
            {myLessons.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {formatDisplayDate(l.date)} at {l.startTime} ({l.durationMinutes} mins)
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        l.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'declined'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Pick-up:</strong> {l.pickupLocation || l.pickupArea} •{' '}
                    <strong>Drop-off:</strong> {l.dropoffLocation || l.dropoffArea || l.pickupArea}
                  </p>
                </div>

                {l.status === 'confirmed' && (
                  <a
                    href={buildGoogleCalendarUrl(l)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold self-start sm:self-auto"
                  >
                    + Google Calendar
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. GOOGLE CALENDAR-STYLE DIARY VIEW (MONTH / WEEK / SCHEDULE)
// ---------------------------------------------------------------------------
function GoogleStyleDiaryView({
  isInstructor,
  currentUser,
  lessons,
  unavailability,
  rotaEvents,
}) {
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'schedule'
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [cursorDate, setCursorDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const visibleLessons = useMemo(() => {
    const active = lessons.filter((l) => l.status !== 'cancelled' && l.status !== 'declined');
    if (isInstructor) return active;
    return active.filter((l) => l.pupilId === currentUser.id);
  }, [lessons, isInstructor, currentUser.id]);

  const getEventsForDate = (dateStr) => {
    const dayLessons = visibleLessons.filter((l) => normalizeDateStr(l.date) === dateStr);
    const dayUnavail = isInstructor
      ? unavailability.filter((u) => normalizeDateStr(u.date) === dateStr)
      : [];
    const dayRota = isInstructor
      ? rotaEvents.filter((r) => normalizeDateStr(r.date) === dateStr)
      : [];
    return { dayLessons, dayUnavail, dayRota };
  };

  const navigatePeriod = (dir) => {
    const next = new Date(cursorDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + dir);
    } else {
      next.setDate(next.getDate() + dir * 7);
    }
    setCursorDate(next);
  };

  // Build Month Grid Days (Monday start)
  const monthGridDays = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(year, month, 1 - startOffset);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      days.push({
        dateObj: d,
        dateStr: dStr,
        inCurrentMonth: d.getMonth() === month,
      });
    }
    return days;
  }, [cursorDate]);

  // Build Week Grid Days (Monday to Sunday around cursorDate)
  const weekGridDays = useMemo(() => {
    const dayOffset = (cursorDate.getDay() + 6) % 7;
    const monday = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      cursorDate.getDate() - dayOffset
    );
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      days.push({ dateObj: d, dateStr: dStr });
    }
    return days;
  }, [cursorDate]);

  const selectedDayAgenda = useMemo(() => getEventsForDate(selectedDate), [
    selectedDate,
    visibleLessons,
    unavailability,
    rotaEvents,
    isInstructor,
  ]);

  const upcomingScheduleLessons = useMemo(() => {
    const today = getTodayDateStr();
    return [...visibleLessons]
      .filter((l) => normalizeDateStr(l.date) >= today)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [visibleLessons]);

  return (
    <div className="space-y-6">
      {/* Top Google Calendar-Style Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCursorDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
              setSelectedDate(getTodayDateStr());
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigatePeriod(-1)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-bold"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => navigatePeriod(1)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-bold"
          >
            ›
          </button>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 ml-2">
            {cursorDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* View Toggle: Month / Week / Schedule */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {['month', 'week', 'schedule'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2 text-xs font-bold text-slate-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGridDays.map(({ dateObj, dateStr, inCurrentMonth }) => {
              const { dayLessons, dayUnavail, dayRota } = getEventsForDate(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === getTodayDateStr();

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[82px] p-2 border-b border-r border-slate-100 text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/70 ring-2 ring-inset ring-emerald-500'
                      : inCurrentMonth
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/60 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      isToday ? 'bg-emerald-600 text-white' : ''
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>

                  {/* Coloured Horizontal Indicator Lines */}
                  <div className="space-y-1 w-full mt-1">
                    {dayLessons.some((l) => l.status === 'confirmed') && (
                      <div
                        className="h-1.5 w-full rounded-full bg-emerald-500"
                        title="Confirmed Lesson(s)"
                      />
                    )}
                    {dayLessons.some((l) => l.status === 'pending') && (
                      <div
                        className="h-1.5 w-full rounded-full bg-amber-400"
                        title="Pending Lesson Request"
                      />
                    )}
                    {(dayUnavail.length > 0 || dayRota.length > 0) && (
                      <div
                        className="h-1.5 w-full rounded-full bg-indigo-400"
                        title="Work Rota / Unavailable"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 divide-x divide-slate-200">
            {weekGridDays.map(({ dateObj, dateStr }) => {
              const { dayLessons, dayUnavail, dayRota } = getEventsForDate(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === getTodayDateStr();

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[150px] p-3 text-left flex flex-col justify-between transition-colors ${
                    isSelected ? 'bg-emerald-50/70' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-400">
                      {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </p>
                    <span
                      className={`mt-1 inline-flex w-7 h-7 rounded-full text-xs font-bold items-center justify-center ${
                        isToday ? 'bg-emerald-600 text-white' : 'text-slate-900'
                      }`}
                    >
                      {dateObj.getDate()}
                    </span>
                  </div>

                  {/* Coloured Lines + Compact Labels */}
                  <div className="space-y-1.5 w-full mt-3">
                    {dayLessons.map((l) => (
                      <div key={l.id} className="space-y-0.5">
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            l.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-400'
                          }`}
                        />
                        <p className="text-[10px] font-bold text-slate-700 truncate">
                          {l.startTime} {isInstructor ? l.pupilName : 'Lesson'}
                        </p>
                      </div>
                    ))}
                    {(dayUnavail.length > 0 || dayRota.length > 0) && (
                      <div className="h-1.5 w-full rounded-full bg-indigo-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE VIEW */}
      {viewMode === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900">Upcoming Agenda Schedule</h3>
          {upcomingScheduleLessons.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming lessons on your schedule.</p>
          ) : (
            upcomingScheduleLessons.map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <span className="text-xs font-extrabold uppercase text-emerald-700">
                    {formatDisplayDate(l.date)} • {l.startTime} ({l.durationMinutes} mins)
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {isInstructor ? l.pupilName : SCHOOL_NAME} — {l.focusTopic}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pick-up: {l.pickupLocation || l.pickupArea} • Drop-off:{' '}
                    {l.dropoffLocation || l.dropoffArea || l.pickupArea}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-center ${
                    l.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Selected Day Agenda Details (for Month & Week Views) */}
      {viewMode !== 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Agenda for {formatDisplayDate(selectedDate)}
            </h3>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" /> Confirmed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-amber-400 inline-block" /> Pending
              </span>
              {isInstructor && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-indigo-400 inline-block" /> Work Rota /
                  Blocked
                </span>
              )}
            </div>
          </div>

          {selectedDayAgenda.dayLessons.length === 0 &&
          selectedDayAgenda.dayUnavail.length === 0 &&
          selectedDayAgenda.dayRota.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing scheduled for this date.</p>
          ) : (
            <div className="space-y-2.5">
              {selectedDayAgenda.dayLessons.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {l.startTime} ({l.durationMinutes} mins) —{' '}
                      {isInstructor ? l.pupilName : 'Driving Lesson'}
                    </p>
                    <p className="text-xs text-slate-700 mt-0.5">
                      <strong>Pick-up:</strong> {l.pickupLocation || l.pickupArea} •{' '}
                      <strong>Drop-off:</strong>{' '}
                      {l.dropoffLocation || l.dropoffArea || l.pickupArea}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-white border border-slate-200">
                    {l.status}
                  </span>
                </div>
              ))}

              {selectedDayAgenda.dayRota.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs text-indigo-900 font-semibold"
                >
                  Work Rota: {r.title} ({r.allDay ? 'All Day' : `${r.startTime} – ${r.endTime}`}) •
                  Blocks 1h before &amp; 1h after
                </div>
              ))}

              {selectedDayAgenda.dayUnavail.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl border border-slate-300 bg-slate-100 text-xs text-slate-800 font-semibold"
                >
                  Unavailable: {u.reason} ({u.allDay ? 'All Day' : `${u.startTime} – ${u.endTime}`})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. INSTRUCTOR PUPILS DIRECTORY (LIST -> 3 ACTION BUTTONS)
// ---------------------------------------------------------------------------
function InstructorPupilsDirectoryView({
  accounts,
  lessons,
  onUpdateTopicStatus,
  onUpdateInstructorNotes,
  onMessagePupil,
}) {
  const pupils = useMemo(() => accounts.filter((acc) => acc.role === 'pupil'), [accounts]);
  const [selectedPupilId, setSelectedPupilId] = useState(null);
  const [activeSubView, setActiveSubView] = useState('addresses'); // 'addresses' | 'syllabus'

  const selectedPupil = useMemo(
    () => pupils.find((p) => p.id === selectedPupilId) || null,
    [pupils, selectedPupilId]
  );

  const calculateProgressPct = (pupil) => {
    const progressMap = pupil.syllabusProgress || {};
    const total = DVSA_SYLLABUS_TOPICS.length;
    if (!total) return 0;
    let score = 0;
    DVSA_SYLLABUS_TOPICS.forEach((topic) => {
      const status = progressMap[topic.id] || 'not_started';
      if (status === 'introduced') score += 0.33;
      else if (status === 'prompted') score += 0.66;
      else if (status === 'independent') score += 1;
    });
    return Math.round((score / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pupil Directory</h2>
          <p className="text-sm text-slate-500 mt-1">
            Click on a pupil below to view their pick-up &amp; drop-off addresses, update their DVSA
            syllabus progress, or send them a message.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
          {pupils.length} {pupils.length === 1 ? 'Registered Pupil' : 'Registered Pupils'}
        </span>
      </div>

      {pupils.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          No pupils registered yet. Once pupils sign up with your portal link, they will appear
          here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pupils.map((pupil) => {
            const isSelected = pupil.id === selectedPupilId;
            const pct = calculateProgressPct(pupil);
            const upcomingCount = lessons.filter(
              (l) => l.pupilId === pupil.id && l.status === 'confirmed'
            ).length;

            return (
              <button
                key={pupil.id}
                type="button"
                onClick={() => {
                  setSelectedPupilId(pupil.id);
                  setActiveSubView('addresses');
                }}
                className={`text-left p-5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">{pupil.name}</h3>
                    <p
                      className={`text-xs mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {pupil.postcodeArea || 'Area not set'} • {pupil.email}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {pct}% Ready
                  </span>
                </div>

                <div className="mt-4">
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${
                      isSelected ? 'bg-slate-700' : 'bg-slate-100'
                    }`}
                  >
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div
                    className={`flex justify-between text-xs mt-2 ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    <span>DVSA Syllabus</span>
                    <span>{upcomingCount} confirmed lesson(s)</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Pupil Action Panel */}
      {selectedPupil && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Selected Pupil
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedPupil.name}</h3>
              <p className="text-sm text-slate-500">
                {selectedPupil.phone || 'No phone number'} • {selectedPupil.email}
              </p>
            </div>

            {/* 3 Action Buttons */}
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setActiveSubView('addresses')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  activeSubView === 'addresses'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Pick-up &amp; Drop-off Addresses
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('syllabus')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  activeSubView === 'syllabus'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Syllabus &amp; Progress
              </button>

              <button
                type="button"
                onClick={() => onMessagePupil(selectedPupil.id)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Send Message →
              </button>
            </div>
          </div>

          {/* Sub-View 1: Pick-up & Drop-off Addresses */}
          {activeSubView === 'addresses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Primary Home Address
                </p>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  {selectedPupil.homeAddress || 'Not yet added by pupil'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Postcode Area: {selectedPupil.postcodeArea || 'Not set'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Saved Alternative Pick-up / Drop-off Locations
                </p>
                {Array.isArray(selectedPupil.savedLocations) &&
                selectedPupil.savedLocations.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {selectedPupil.savedLocations.map((loc, idx) => (
                      <li
                        key={loc.id || idx}
                        className="text-sm text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 flex justify-between items-center gap-2"
                      >
                        <span className="font-medium">
                          {loc.label ? `${loc.label}: ${loc.address}` : loc.address}
                        </span>
                        {loc.postcodeArea && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                            {loc.postcodeArea}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">
                    No alternative locations saved yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sub-View 2: Syllabus & Progress */}
          {activeSubView === 'syllabus' && (
            <SyllabusFlowchartView
              currentUser={{ role: 'instructor' }}
              accounts={accounts}
              forcedPupilId={selectedPupil.id}
              onUpdateTopicStatus={onUpdateTopicStatus}
              onUpdateInstructorNotes={onUpdateInstructorNotes}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. DVSA SYLLABUS & PROGRESS VIEW
// ---------------------------------------------------------------------------
function SyllabusFlowchartView({
  currentUser,
  accounts,
  forcedPupilId,
  onUpdateTopicStatus,
  onUpdateInstructorNotes,
}) {
  const isInstructor = currentUser.role === 'instructor';
  const targetPupil = useMemo(
    () => accounts.find((a) => a.id === forcedPupilId) || currentUser,
    [accounts, forcedPupilId, currentUser]
  );

  const [notesDraft, setNotesDraft] = useState(targetPupil?.instructorNotes || '');

  useEffect(() => {
    setNotesDraft(targetPupil?.instructorNotes || '');
  }, [targetPupil?.id, targetPupil?.instructorNotes]);

  const progressMap = targetPupil?.syllabusProgress || {};

  const categories = useMemo(() => {
    const map = {};
    DVSA_SYLLABUS_TOPICS.forEach((t) => {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    });
    return Object.entries(map);
  }, []);

  const handleCycleStatus = (topicId) => {
    if (!isInstructor || !targetPupil) return;
    const current = progressMap[topicId] || 'not_started';
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    onUpdateTopicStatus(targetPupil.id, topicId, STATUS_CYCLE[nextIdx]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">
          DVSA 27-Topic Syllabus Progress — {targetPupil?.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isInstructor
            ? 'Click any skill below to cycle progress: Not Started → Introduced → Prompted → Independent.'
            : 'Track your driving test readiness across all 27 DVSA syllabus skills.'}
        </p>

        <div className="mt-5 space-y-5">
          {categories.map(([catName, topics]) => (
            <div key={catName} className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {catName}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {topics.map((topic) => {
                  const status = progressMap[topic.id] || 'not_started';
                  const meta = STATUS_META[status];
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      disabled={!isInstructor}
                      onClick={() => handleCycleStatus(topic.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                        isInstructor
                          ? 'hover:border-slate-400 cursor-pointer bg-slate-50/70'
                          : 'bg-slate-50/70 cursor-default'
                      } border-slate-200`}
                    >
                      <span className="text-xs font-bold text-slate-800">{topic.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor Feedback Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-2">Instructor Feedback &amp; Notes</h4>
        {isInstructor ? (
          <div className="space-y-3">
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Write lesson feedback or next lesson goals..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
            />
            <button
              type="button"
              onClick={() => onUpdateInstructorNotes(targetPupil.id, notesDraft)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Save Instructor Notes
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {targetPupil?.instructorNotes || 'No instructor notes recorded yet.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13. MESSAGING CENTER VIEW (AUTO-SELECTS PUPIL FROM DIRECTORY)
// ---------------------------------------------------------------------------
function MessagingCenterView({
  currentUser,
  accounts,
  messages,
  initialRecipientId,
  onSendMessage,
}) {
  const isInstructor = currentUser.role === 'instructor';
  const contacts = useMemo(() => {
    if (isInstructor) return accounts.filter((a) => a.role === 'pupil');
    return accounts.filter((a) => a.role === 'instructor');
  }, [accounts, isInstructor]);

  const [selectedRecipientId, setSelectedRecipientId] = useState(
    initialRecipientId || contacts[0]?.id || ''
  );
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (initialRecipientId) {
      setSelectedRecipientId(initialRecipientId);
    } else if (!selectedRecipientId && contacts.length > 0) {
      setSelectedRecipientId(contacts[0].id);
    }
  }, [initialRecipientId, contacts, selectedRecipientId]);

  const activeContact = contacts.find((c) => c.id === selectedRecipientId) || contacts[0];

  const threadMessages = useMemo(() => {
    if (!activeContact) return [];
    return messages.filter(
      (m) =>
        (m.senderId === currentUser.id && m.recipientId === activeContact.id) ||
        (m.senderId === activeContact.id && m.recipientId === currentUser.id) ||
        (m.recipientId === currentUser.id && m.senderId === 'system' && !isInstructor)
    );
  }, [messages, currentUser.id, activeContact, isInstructor]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeContact || !draftText.trim()) return;
    await onSendMessage(activeContact.id, draftText);
    setDraftText('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
      {/* Contact Sidebar */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 p-4 space-y-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-2">
          {isInstructor ? 'Pupil Conversations' : 'Instructor'}
        </h3>
        {contacts.length === 0 ? (
          <p className="text-xs text-slate-500 px-2 py-4">No contacts available yet.</p>
        ) : (
          contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedRecipientId(c.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                activeContact?.id === c.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-400'
              }`}
            >
              <div>{c.name}</div>
              <div
                className={`text-[11px] font-normal ${
                  activeContact?.id === c.id ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {c.postcodeArea || c.email}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Chat Thread */}
      <div className="md:col-span-8 flex flex-col justify-between p-4 sm:p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-900">
            {activeContact ? activeContact.name : 'Select a Conversation'}
          </h3>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
          {threadMessages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              No messages yet. Send a message below to start the conversation.
            </p>
          ) : (
            threadMessages.map((m) => {
              const mine = m.senderId === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm ${
                      mine
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {m.senderName}{' '}
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
          />
          <button
            type="submit"
            disabled={!activeContact || !draftText.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14. SETTINGS TAB (ADDRESSES, CALENDAR SYNC, ROTA & EMAILJS)
// ---------------------------------------------------------------------------
function AccountAndCalendarSettingsView({
  currentUser,
  accounts,
  lessons,
  unavailability,
  rotaEvents,
  settings,
  onUpdateAccount,
  onDeleteAccount,
  onAddUnavailabilityRange,
  onDeleteUnavailability,
  onSaveSettings,
  onImportRotaEvents,
}) {
  const isInstructor = currentUser.role === 'instructor';

  // Pupil Address & Alternative Locations State
  const [homeAddress, setHomeAddress] = useState(currentUser.homeAddress || '');
  const [postcodeArea, setPostcodeArea] = useState(currentUser.postcodeArea || 'PO19');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [newLocLabel, setNewLocLabel] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocArea, setNewLocArea] = useState(currentUser.postcodeArea || 'PO19');

  // Instructor Unavailability & Calendar Sync State
  const [fromDate, setFromDate] = useState(getTodayDateStr());
  const [toDate, setToDate] = useState(getTodayDateStr());
  const [allDayBlock, setAllDayBlock] = useState(true);
  const [blockStartTime, setBlockStartTime] = useState('07:00');
  const [blockEndTime, setBlockEndTime] = useState('18:00');
  const [blockReason, setBlockReason] = useState('Holiday / Personal Appointment');

  const [rotaUrl, setRotaUrl] = useState(settings.rotaFeedUrl || '');
  const [pasteIcsText, setPasteIcsText] = useState('');
  const [syncingRota, setSyncingRota] = useState(false);
  const [rotaError, setRotaError] = useState('');

  const [localSettings, setLocalSettings] = useState(settings);
  useEffect(() => {
    setLocalSettings(settings);
    if (settings.rotaFeedUrl && !rotaUrl) setRotaUrl(settings.rotaFeedUrl);
  }, [settings]);

  // Save Pupil Home Address & Phone
  const handleSavePupilProfile = async (e) => {
    e.preventDefault();
    await onUpdateAccount(currentUser.id, {
      homeAddress: homeAddress.trim(),
      postcodeArea,
      phone: phone.trim(),
    });
  };

  // Add Alternative Pick-Up / Drop-Off Location
  const handleAddAlternativeLocation = async (e) => {
    e.preventDefault();
    if (!newLocAddress.trim()) return;
    const existing = Array.isArray(currentUser.savedLocations) ? currentUser.savedLocations : [];
    const updated = [
      ...existing,
      {
        id: `loc-${Date.now()}`,
        label: newLocLabel.trim() || 'Alternative Location',
        address: newLocAddress.trim(),
        postcodeArea: newLocArea,
      },
    ];
    await onUpdateAccount(currentUser.id, { savedLocations: updated });
    setNewLocLabel('');
    setNewLocAddress('');
  };

  const handleRemoveAlternativeLocation = async (locId) => {
    const existing = Array.isArray(currentUser.savedLocations) ? currentUser.savedLocations : [];
    await onUpdateAccount(currentUser.id, {
      savedLocations: existing.filter((l) => l.id !== locId),
    });
  };

  // Fetch & Parse Connecteam / Google .ics Feed via Multi-Proxy Fallback
  const handleSyncRotaUrl = async () => {
    if (!rotaUrl.trim()) return;
    setSyncingRota(true);
    setRotaError('');
    const normalizedUrl = rotaUrl.trim().replace(/^webcal:\/\//i, 'https://');

    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    ];

    let fetchedText = '';
    for (const makeProxy of proxies) {
      try {
        const res = await fetch(makeProxy(normalizedUrl));
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.includes('BEGIN:VCALENDAR')) {
            fetchedText = txt;
            break;
          }
        }
      } catch (_) {}
    }

    if (!fetchedText) {
      setRotaError(
        'Could not fetch directly due to S3/CORS restrictions. Click "Download .ics File" below, then upload it using "Upload .ics File".'
      );
      setSyncingRota(false);
      return;
    }

    const parsed = parseICSFeedEvents(fetchedText);
    await onImportRotaEvents(parsed, normalizedUrl);
    setSyncingRota(false);
  };

  const handleUploadICSFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseICSFeedEvents(text);
    await onImportRotaEvents(parsed, rotaUrl);
    setRotaError('');
  };

  const handleImportPastedICS = async () => {
    if (!pasteIcsText.trim()) return;
    const parsed = parseICSFeedEvents(pasteIcsText);
    await onImportRotaEvents(parsed, rotaUrl);
    setPasteIcsText('');
    setRotaError('');
  };

  const pupilConfirmedLessons = useMemo(
    () => lessons.filter((l) => l.pupilId === currentUser.id && l.status === 'confirmed'),
    [lessons, currentUser.id]
  );

  return (
    <div className="space-y-6">
      {/* PUPIL SETTINGS: FULL HOME ADDRESS, ALTERNATIVE LOCATIONS & CALENDAR SYNC */}
      {!isInstructor && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                My Home Address &amp; Contact Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your full street address so Mark knows where to pick you up for lessons.
              </p>
            </div>

            <form onSubmit={handleSavePupilProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Home Pick-Up Address
                </label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="e.g. 14 Westgate, Chichester, West Sussex, PO19 3EU"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Home Postcode Area
                  </label>
                  <select
                    value={postcodeArea}
                    onChange={(e) => setPostcodeArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                  >
                    {POSTCODE_AREAS.map((area) => (
                      <option key={area.code} value={area.code}>
                        {area.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07700 900123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Save Home Address &amp; Details
              </button>
            </form>
          </div>

          {/* Alternative Pick-up & Drop-off Locations Manager */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Saved Alternative Pick-Up &amp; Drop-Off Locations
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Save college, workplace, or family addresses so you can pick them from the dropdown
                when booking a lesson.
              </p>
            </div>

            <form
              onSubmit={handleAddAlternativeLocation}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <input
                type="text"
                value={newLocLabel}
                onChange={(e) => setNewLocLabel(e.target.value)}
                placeholder="Label (e.g. College / Work)"
                className="sm:col-span-3 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
              />
              <input
                type="text"
                required
                value={newLocAddress}
                onChange={(e) => setNewLocAddress(e.target.value)}
                placeholder="Full Address & Postcode"
                className="sm:col-span-5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
              />
              <select
                value={newLocArea}
                onChange={(e) => setNewLocArea(e.target.value)}
                className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
              >
                {POSTCODE_AREAS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                + Add Location
              </button>
            </form>

            {Array.isArray(currentUser.savedLocations) && currentUser.savedLocations.length > 0 && (
              <div className="space-y-2">
                {currentUser.savedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900">{loc.label}: </span>
                      <span className="text-xs text-slate-700">{loc.address}</span>
                      <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                        {loc.postcodeArea}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlternativeLocation(loc.id)}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pupil Calendar Export */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Sync Lessons to Your Phone Calendar</h2>
            <p className="text-xs text-slate-500">
              Download an `.ics` file for Apple Calendar / Outlook or add confirmed lessons
              directly to Google Calendar.
            </p>
            <button
              type="button"
              disabled={pupilConfirmedLessons.length === 0}
              onClick={() => downloadLessonsICS(pupilConfirmedLessons, 'my-driving-lessons.ics')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40"
            >
              Download All Confirmed Lessons (.ics)
            </button>
          </div>
        </>
      )}

      {/* INSTRUCTOR SETTINGS: WORK ROTA SYNC, UNAVAILABILITY, HOURS & EMAILJS */}
      {isInstructor && (
        <>
          {/* 1. Work Rota / Connecteam .ics Sync */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Work Rota &amp; External Calendar Sync (.ics)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Imports all shifts from your Connecteam or Google `.ics` feed (even if marked
                &ldquo;Free&rdquo;) and automatically blocks <strong>1 hour before</strong> and{' '}
                <strong>1 hour after</strong> every shift.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={rotaUrl}
                onChange={(e) => setRotaUrl(e.target.value)}
                placeholder="https://...Connecteam_Coach_Driver_Rota.ics"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
              />
              <button
                type="button"
                disabled={syncingRota}
                onClick={handleSyncRotaUrl}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap"
              >
                {syncingRota ? 'Syncing...' : 'Sync Rota URL Now'}
              </button>
            </div>

            {rotaError && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium">
                {rotaError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {rotaUrl && (
                <a
                  href={rotaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                >
                  Download .ics File
                </a>
              )}
              <label className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">
                Upload Downloaded .ics File
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={handleUploadICSFile}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500">
                Currently blocking <strong>{rotaEvents.length}</strong> imported shift segment(s).
                {settings.lastRotaSync ? ` Last synced: ${settings.lastRotaSync}` : ''}
              </span>
            </div>

            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer font-bold text-slate-700">
                Or Paste Raw .ics Calendar Text
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={pasteIcsText}
                  onChange={(e) => setPasteIcsText(e.target.value)}
                  placeholder="Paste BEGIN:VCALENDAR ... END:VCALENDAR text here"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportPastedICS}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white font-bold"
                >
                  Import Pasted .ics Text
                </button>
              </div>
            </details>
          </div>

          {/* 2. Multi-Day Holiday & Appointment Unavailability */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Holiday &amp; Personal Unavailability Blocks
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddUnavailabilityRange({
                  fromDate,
                  toDate,
                  allDay: allDayBlock,
                  startTime: blockStartTime,
                  endTime: blockEndTime,
                  reason: blockReason,
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      if (e.target.value > toDate) setToDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    min={fromDate}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allDayBlock}
                    onChange={(e) => setAllDayBlock(e.target.checked)}
                  />
                  Block Entire Day(s)
                </label>

                {!allDayBlock && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Block Dates on Calendar
                </button>
              </div>
            </form>

            {unavailability.length > 0 && (
              <div className="space-y-2 pt-2">
                {unavailability.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span>
                      <strong>{formatDisplayDate(u.date)}</strong> — {u.reason} (
                      {u.allDay ? 'All Day' : `${u.startTime}–${u.endTime}`})
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteUnavailability(u.id)}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Working Hours & Automatic 24-Hour EmailJS Reminders */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900">
              Driving Lesson Hours &amp; Automatic 24-Hour Pupil Reminders
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  First Lesson Start Time
                </label>
                <input
                  type="time"
                  value={localSettings.workStart || '07:00'}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, workStart: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Last Lesson Start Time
                </label>
                <input
                  type="time"
                  value={localSettings.workEnd || '18:00'}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, workEnd: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(localSettings.autoReminderEnabled)}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, autoReminderEnabled: e.target.checked })
                  }
                />
                Enable Automatic 24-Hour In-App &amp; Email Reminders
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    EmailJS Service ID
                  </label>
                  <input
                    type="text"
                    value={localSettings.emailjsServiceId || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, emailjsServiceId: e.target.value })
                    }
                    placeholder="service_xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    EmailJS Template ID
                  </label>
                  <input
                    type="text"
                    value={localSettings.emailjsTemplateId || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, emailjsTemplateId: e.target.value })
                    }
                    placeholder="template_xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    EmailJS Public Key
                  </label>
                  <input
                    type="text"
                    value={localSettings.emailjsPublicKey || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, emailjsPublicKey: e.target.value })
                    }
                    placeholder="Public Key"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSaveSettings(localSettings)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Save Working Hours &amp; Reminder Settings
            </button>
          </div>

          {/* 4. Registered Accounts Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Registered Pupil Accounts</h2>
            {accounts.filter((a) => a.role === 'pupil').length === 0 ? (
              <p className="text-xs text-slate-500">No pupil accounts registered.</p>
            ) : (
              accounts
                .filter((a) => a.role === 'pupil')
                .map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{acc.name}</span> ({acc.email}) •{' '}
                      {acc.postcodeArea}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAccount(acc.id)}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Delete Account
                    </button>
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  );
}