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
import { initializeApp } from 'firebase/app';
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
// FIREBASE CLOUD BACKEND INITIALIZATION (MANDATORY MULTI-DEVICE SYNC)
// ============================================================================
const USER_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDuA9CWlLcRbyHEVpW1hXaJ5hPnAmaOh2E",
  authDomain: "learn-2-pass-with-us.firebaseapp.com",
  projectId: "learn-2-pass-with-us",
  storageBucket: "learn-2-pass-with-us.firebasestorage.app",
  messagingSenderId: "131210341201",
  appId: "1:131210341201:web:b9e6ec1ae5466921e40170",
  measurementId: "G-YNMSVX22XL"
};

const firebaseConfig =
  typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : USER_FIREBASE_CONFIG;
const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'learn-to-pass-with-us';

// ============================================================================
// LOCALSTORAGE FALLBACK PERSISTENCE HELPER
// ============================================================================
const STORAGE_PREFIX = 'ltpwu_v2_';

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Storage read error:', err);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error:', err);
  }
}

// ============================================================================
// CHICHESTER & WEST SUSSEX POSTCODE / LOCATION COORDINATES & DISTANCE ENGINE
// ============================================================================
const WEST_SUSSEX_LOCATIONS = [
  { code: 'PO19', name: 'Chichester City Centre', lat: 50.8365, lng: -0.7792 },
  { code: 'PO18', name: 'Bosham / Lavant / Fishbourne', lat: 50.8318, lng: -0.8584 },
  { code: 'PO20', name: 'Selsey / Bracklesham / Witterings', lat: 50.7351, lng: -0.7905 },
  { code: 'PO21', name: 'Bognor Regis West / Aldwick', lat: 50.7834, lng: -0.6968 },
  { code: 'PO22', name: 'Bognor Regis East / Felpham / Middleton', lat: 50.7931, lng: -0.6425 },
  { code: 'BN18', name: 'Arundel / Walberton / Fontwell', lat: 50.8543, lng: -0.5562 },
  { code: 'PO10', name: 'Emsworth / Southbourne', lat: 50.8471, lng: -0.9365 },
  { code: 'PO9',  name: 'Havant / Rowlands Castle', lat: 50.8532, lng: -0.9821 },
  { code: 'PO1',  name: 'Portsmouth / Southsea', lat: 50.7989, lng: -1.0912 },
  { code: 'GU29', name: 'Midhurst / Cocking', lat: 50.9854, lng: -0.7405 },
  { code: 'BN17', name: 'Littlehampton / Rustington', lat: 50.8115, lng: -0.5408 }
];

// Haversine driving distance & time estimator for West Sussex roads
function calculateTravelMetrics(locA, locB) {
  if (!locA || !locB) {
    return { miles: 3.0, driveMins: 10, wrapUpMins: 10, rawTotalMins: 20, bufferedMins: 30 };
  }
  const cleanA = locA.trim().toUpperCase();
  const cleanB = locB.trim().toUpperCase();

  if (cleanA === cleanB) {
    // Same exact location: 0 drive mins + 10 mins lesson write-up = 10 mins -> rounds up to 15 mins
    return { miles: 0, driveMins: 0, wrapUpMins: 10, rawTotalMins: 10, bufferedMins: 15 };
  }

  const findCoords = (str) => {
    const match = WEST_SUSSEX_LOCATIONS.find(
      (l) => str.includes(l.code) || str.toLowerCase().includes(l.name.split('/')[0].trim().toLowerCase())
    );
    if (match) return match;
    // Deterministic fallback hash for any custom UK postcode entered
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return {
      lat: 50.83 + ((hash % 20) * 0.01),
      lng: -0.77 + (((hash >> 3) % 25) * 0.012)
    };
  };

  const cA = findCoords(cleanA);
  const cB = findCoords(cleanB);

  const R = 3958.8; // Earth radius in miles
  const dLat = ((cB.lat - cA.lat) * Math.PI) / 180;
  const dLng = ((cB.lng - cA.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((cA.lat * Math.PI) / 180) *
      Math.cos((cB.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightMiles = R * c;
  // Road winding factor ~1.28x on Sussex A27 / coastal roads
  const roadMiles = Math.max(0.8, Number((straightMiles * 1.28).toFixed(1)));
  // Average local driving speed ~24 mph including roundabouts/traffic
  const driveMins = Math.max(4, Math.round((roadMiles / 24) * 60));
  const wrapUpMins = 10; // Mandatory 10 mins writing up lesson notes
  const rawTotalMins = driveMins + wrapUpMins;
  // Round UP to nearest 15-minute increment (e.g., 16 -> 30, 15 -> 15, 31 -> 45)
  const bufferedMins = Math.ceil(rawTotalMins / 15) * 15;

  return {
    miles: roadMiles,
    driveMins,
    wrapUpMins,
    rawTotalMins,
    bufferedMins
  };
}

// ============================================================================
// DVSA 'READY TO PASS?' SYLLABUS SKILLS (1-5 COMPETENCY SCALE)
// ============================================================================
const DVSA_SYLLABUS_SKILLS = [
  { id: 'cockpit', category: '1. Basics & Safety', title: 'Cockpit Drill, Controls & Mirrors', desc: 'DSSSM routine, seat/steering/mirrors, pedals & auxiliary controls' },
  { id: 'moving_off', category: '1. Basics & Safety', title: 'Moving Off & Stopping Safely', desc: 'POM routine, uphill/downhill starts, angled starts & kerb control' },
  { id: 'junctions', category: '2. Road Positioning & Junctions', title: 'Junctions, T-Junctions & Crossroads', desc: 'MSPSL routine, emerging left/right, unmarked junctions & box junctions' },
  { id: 'roundabouts', category: '2. Road Positioning & Junctions', title: 'Roundabouts & Mini-Roundabouts', desc: 'Lane discipline, Spiral roundabouts (e.g., A27 Chichester), blocker vehicles' },
  { id: 'crossings', category: '2. Road Positioning & Junctions', title: 'Pedestrian Crossings & Hazards', desc: 'Zebra, Pelican, Puffin, Toucan crossings & school zones' },
  { id: 'dual_carriageways', category: '3. Higher Speed & Open Roads', title: 'Dual Carriageways & National Speed Limits', desc: 'Joining via slip roads, overtaking, safe separation distances on A27/A259' },
  { id: 'manoeuvres_bay', category: '4. Manoeuvres', title: 'Bay Parking (Forward & Reverse)', desc: 'Observation, control, accuracy & straightening in test centre bays' },
  { id: 'manoeuvres_parallel', category: '4. Manoeuvres', title: 'Parallel Parking & Pull Up on Right', desc: 'Reverse parallel behind parked car & pull up on right + 2 car lengths reverse' },
  { id: 'emergency_stop', category: '4. Manoeuvres', title: 'Emergency Stop & Controlled Braking', desc: 'Prompt reaction without skidding, 360-degree check before moving off' },
  { id: 'independent', category: '5. Test Readiness', title: 'Independent Driving (Sat Nav & Signs)', desc: '20 mins following TomTom Sat Nav or road signs safely' },
  { id: 'mock_test', category: '5. Test Readiness', title: 'Full DVSA Mock Driving Test', desc: 'Show Me / Tell Me questions & full 40-min mock route under test conditions' }
];

const SKILL_LEVELS = [
  { value: 0, label: 'Not Started', color: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
  { value: 1, label: '1: Introduced', color: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  { value: 2, label: '2: Full Instruction', color: 'bg-orange-50 text-orange-800 border-orange-300', dot: 'bg-orange-500' },
  { value: 3, label: '3: Prompted', color: 'bg-blue-50 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { value: 4, label: '4: Seldom Prompted', color: 'bg-teal-50 text-teal-800 border-teal-300', dot: 'bg-teal-500' },
  { value: 5, label: '5: Independent / Ready', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-600' }
];

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================
function getUpcomingDateStr(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMins) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, totalMins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ============================================================================
// WORK ROTA .ICS FEED PARSER (TREATS ALL EVENTS AS UNAVAILABLE REGARDLESS OF BUSY/FREE)
// ============================================================================
function parseICSFeedEvents(icsText) {
  if (!icsText || typeof icsText !== 'string') return [];
  // Unfold folded RFC 5545 lines (CRLF + space/tab)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events = [];
  let inEvent = false;
  let current = null;

  const parseIcsDateTime = (rawVal) => {
    if (!rawVal) return null;
    const clean = rawVal.trim();
    // All-day format: YYYYMMDD
    if (/^\d{8}$/.test(clean)) {
      const y = clean.slice(0, 4);
      const m = clean.slice(4, 6);
      const d = clean.slice(6, 8);
      return { dateStr: `${y}-${m}-${d}`, timeStr: null, isAllDay: true };
    }
    // Date-time format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (!match) return null;
    const [, y, m, d, hh, mm, ss, isUtc] = match;
    if (isUtc === 'Z') {
      const utcDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
      const localY = utcDate.getFullYear();
      const localM = String(utcDate.getMonth() + 1).padStart(2, '0');
      const localD = String(utcDate.getDate()).padStart(2, '0');
      const localH = String(utcDate.getHours()).padStart(2, '0');
      const localMin = String(utcDate.getMinutes()).padStart(2, '0');
      return {
        dateStr: `${localY}-${localM}-${localD}`,
        timeStr: `${localH}:${localMin}`,
        isAllDay: false
      };
    }
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: `${hh}:${mm}`,
      isAllDay: false
    };
  };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (inEvent && current && current.dtstart) {
        const startParsed = parseIcsDateTime(current.dtstart);
        const endParsed = parseIcsDateTime(current.dtend);
        if (startParsed) {
          // NOTE: Intentionally ignores TRANSP:TRANSPARENT ("Free" in Google Calendar)
          // so EVERY event on the work rota blocks instructor availability.
          events.push({
            id: `rota-${current.uid || `${startParsed.dateStr}-${startParsed.timeStr || 'all'}-${events.length}`}`,
            title: current.summary || 'Work Rota Shift',
            date: startParsed.dateStr,
            allDay: startParsed.isAllDay,
            startTime: startParsed.isAllDay ? '00:00' : startParsed.timeStr,
            endTime:
              startParsed.isAllDay
                ? '23:59'
                : endParsed?.timeStr || minutesToTime(timeToMinutes(startParsed.timeStr) + 60),
            source: 'ical_rota'
          });
        }
      }
      inEvent = false;
      current = null;
      continue;
    }

    if (inEvent && current) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const rawKey = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 1);
      const baseKey = rawKey.split(';')[0].toUpperCase();

      if (baseKey === 'SUMMARY') current.summary = val.replace(/\\,/g, ',').replace(/\\n/g, ' ');
      if (baseKey === 'UID') current.uid = val.replace(/[^a-zA-Z0-9_-]/g, '');
      if (baseKey === 'DTSTART') current.dtstart = val;
      if (baseKey === 'DTEND') current.dtend = val;
    }
  }

  return events;
}

// ============================================================================
// MULTI-PLATFORM CALENDAR EXPORT HELPERS (GOOGLE, APPLE .ICS, OUTLOOK, YAHOO)
// ============================================================================
function buildLessonICSContent(lessonList, pupilName) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Learn To Pass With Us//Driving School Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Learn To Pass With Us - ${pupilName}`
  ];

  lessonList.forEach((l) => {
    const cleanDate = l.date.replace(/-/g, '');
    const startH = l.startTime.replace(':', '') + '00';
    const endMins = timeToMinutes(l.startTime) + l.durationMins;
    const endTimeStr = minutesToTime(endMins).replace(':', '') + '00';
    const desc = [
      'Driving Lesson with Learn To Pass With Us (Black VW Golf Mk5 GTI - EN56 WXA)',
      `Pick-up: ${l.pickupLocation}`,
      `Instructor Focus: ${l.notes || 'Syllabus driving progression'}`,
      l.pupilNotes ? `Pupil Note: ${l.pupilNotes}` : ''
    ]
      .filter(Boolean)
      .join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${l.id}@learntopasswithus.co.uk`,
      `DTSTAMP:${cleanDate}T080000Z`,
      `DTSTART:${cleanDate}T${startH}`,
      `DTEND:${cleanDate}T${endTimeStr}`,
      `SUMMARY:Driving Lesson - Learn To Pass With Us (${l.durationMins / 60}h)`,
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
  const cleanDate = lesson.date.replace(/-/g, '');
  const startH = lesson.startTime.replace(':', '') + '00';
  const endTimeStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins).replace(':', '') + '00';
  const title = encodeURIComponent(`Driving Lesson - Learn To Pass With Us`);
  const details = encodeURIComponent(
    `Vehicle: Black VW Golf Mk5 GTI (EN56 WXA)\nNext Lesson Focus: ${lesson.notes || 'Syllabus progression'}\nPupil Note: ${lesson.pupilNotes || 'None'}`
  );
  const loc = encodeURIComponent(lesson.pickupLocation);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${cleanDate}T${startH}/${cleanDate}T${endTimeStr}&details=${details}&location=${loc}`;
}

function buildOutlookWebUrl(lesson) {
  const endStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins);
  const startIso = `${lesson.date}T${lesson.startTime}:00`;
  const endIso = `${lesson.date}T${endStr}:00`;
  const subject = encodeURIComponent('Driving Lesson - Learn To Pass With Us');
  const body = encodeURIComponent(
    `Vehicle: Black VW Golf Mk5 GTI (EN56 WXA)\nNext Lesson Focus: ${lesson.notes || 'Syllabus progression'}\nPupil Note: ${lesson.pupilNotes || 'None'}`
  );
  const loc = encodeURIComponent(lesson.pickupLocation);
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${startIso}&enddt=${endIso}&body=${body}&location=${loc}`;
}

function buildYahooCalendarUrl(lesson) {
  const cleanDate = lesson.date.replace(/-/g, '');
  const startH = lesson.startTime.replace(':', '') + '00';
  const endTimeStr = minutesToTime(timeToMinutes(lesson.startTime) + lesson.durationMins).replace(':', '') + '00';
  const title = encodeURIComponent('Driving Lesson - Learn To Pass With Us');
  const desc = encodeURIComponent(
    `Vehicle: Black VW Golf Mk5 GTI (EN56 WXA) | Focus: ${lesson.notes || 'Syllabus progression'}`
  );
  const loc = encodeURIComponent(lesson.pickupLocation);
  return `https://calendar.yahoo.com/?v=60&title=${title}&st=${cleanDate}T${startH}&et=${cleanDate}T${endTimeStr}&desc=${desc}&in_loc=${loc}`;
}

// ============================================================================
// CUSTOM SVG ARTWORK & PHOTO UPLOADER: BLACK VW GOLF MK5 GTI (UK REG: EN56 WXA)
// ============================================================================
function VWGolfGTIBadge({ compact = false, customCarPhoto, onUploadCarPhoto, onResetCarPhoto, isInstructor }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUploadCarPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-neutral-900 to-zinc-800 border border-zinc-700/80 shadow-xl ${compact ? 'p-3' : 'p-5 sm:p-6'}`}>
      {/* Subtle GTI Red Honeycomb Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />
      <div className="flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold tracking-wide uppercase mb-2">
            <Car className="w-3.5 h-3.5" /> Official Dual-Control Training Car
          </div>
          <h3 className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-extrabold text-white tracking-tight`}>
            Black Volkswagen Golf Mk5 GTI
          </h3>
          <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
            Manual 6-Speed • Dual Controls Fitted • Air Con • Chichester &amp; West Sussex
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {/* Authentic UK Front/Rear Style Registration Plate */}
            <div className="inline-flex items-stretch rounded-md overflow-hidden border-2 border-zinc-950 shadow-md">
              <div className="bg-blue-700 px-1.5 flex flex-col items-center justify-center text-[9px] font-bold text-white leading-tight">
                <span>UK</span>
              </div>
              <div className="bg-amber-400 px-3.5 py-1 text-zinc-950 font-black tracking-widest text-sm sm:text-base font-mono">
                EN56 WXA
              </div>
            </div>

            {/* Car Photo Uploader / Reset Controls */}
            {!compact && onUploadCarPhoto && (
              <div className="flex items-center gap-2">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 text-xs font-bold transition shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {customCarPhoto ? 'Change Car Photo' : 'Upload Your Car Photo'}
                </button>
                {customCarPhoto && (
                  <button
                    type="button"
                    onClick={onResetCarPhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 text-xs font-semibold transition"
                    title="Reset to Default Golf GTI Illustration"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Either User's Uploaded Real Car Photo OR Custom Vector Illustration of Black VW Golf Mk5 GTI */}
        <div className={`${compact ? 'w-44' : 'w-full sm:w-80 md:w-80'} flex-shrink-0`}>
          {customCarPhoto ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl bg-zinc-950 aspect-[16/10]">
              <img
                src={customCarPhoto}
                alt="Learn To Pass With Us - Black VW Golf Mk5 GTI EN56 WXA"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/15">
                Learn To Pass With Us • EN56 WXA
              </div>
            </div>
          ) : (
            <svg viewBox="0 0 340 135" className="w-full h-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.75)]">
              <defs>
                <linearGradient id="golfBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3f3f46" />
                  <stop offset="35%" stopColor="#18181b" />
                  <stop offset="85%" stopColor="#09090b" />
                  <stop offset="100%" stopColor="#000000" />
                </linearGradient>
                <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#52525b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#18181b" stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id="wheelRim" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e4e4e7" />
                  <stop offset="70%" stopColor="#71717a" />
                  <stop offset="100%" stopColor="#27272a" />
                </radialGradient>
              </defs>

              {/* Ground Shadow */}
              <ellipse cx="170" cy="122" rx="148" ry="8" fill="#000000" opacity="0.65" />

              {/* Roof Spoiler */}
              <path d="M 65 40 L 50 38 L 54 44 L 72 44 Z" fill="#18181b" />

              {/* Main Hatchback Silhouette (VW Golf Mk5 Profile) */}
              <path
                d="M 48 98 L 36 95 C 33 88 35 72 43 62 L 62 41 C 88 33 145 31 195 36 L 245 58 C 276 62 301 69 308 82 L 310 96 L 296 101 L 278 101 C 278 78 242 78 242 101 L 106 101 C 106 78 70 78 70 101 Z"
                fill="url(#golfBody)"
                stroke="#52525b"
                strokeWidth="1.2"
              />

              {/* Glossy Shoulder Highlight */}
              <path
                d="M 55 64 Q 150 58 295 72"
                fill="none"
                stroke="#71717a"
                strokeWidth="1.3"
                opacity="0.65"
              />

              {/* Side Windows */}
              <path
                d="M 73 45 L 136 42 L 136 60 L 63 60 Z"
                fill="url(#glassGrad)"
                stroke="#3f3f46"
                strokeWidth="1"
              />
              <path
                d="M 144 42 L 191 43 L 228 60 L 144 60 Z"
                fill="url(#glassGrad)"
                stroke="#3f3f46"
                strokeWidth="1"
              />

              {/* B-Pillar & Door Cutlines */}
              <line x1="140" y1="42" x2="140" y2="96" stroke="#27272a" strokeWidth="1.5" />
              <line x1="205" y1="60" x2="202" y2="96" stroke="#27272a" strokeWidth="1" />
              {/* Door Handles */}
              <rect x="115" y="66" width="12" height="3" rx="1.5" fill="#52525b" />
              <rect x="180" y="67" width="12" height="3" rx="1.5" fill="#52525b" />

              {/* Side Mirror */}
              <path d="M 218 56 L 229 53 L 231 60 L 219 61 Z" fill="#27272a" stroke="#52525b" strokeWidth="0.8" />

              {/* Iconic GTI Red Grille Trim & Headlight */}
              <path d="M 288 73 L 306 77 L 303 82 L 285 78 Z" fill="#e4e4e7" />
              <line x1="304" y1="83" x2="309" y2="85" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

              {/* Red GTI Brake Calipers */}
              <rect x="82" y="92" width="7" height="10" rx="2" fill="#dc2626" />
              <rect x="254" y="92" width="7" height="10" rx="2" fill="#dc2626" />

              {/* Rear Wheel (Monza Alloy Style) */}
              <circle cx="88" cy="101" r="20" fill="#09090b" stroke="#27272a" strokeWidth="2" />
              <circle cx="88" cy="101" r="13.5" fill="url(#wheelRim)" />
              <circle cx="88" cy="101" r="4" fill="#18181b" />
              <circle cx="83" cy="96" r="2.3" fill="#18181b" />
              <circle cx="93" cy="96" r="2.3" fill="#18181b" />
              <circle cx="83" cy="106" r="2.3" fill="#18181b" />
              <circle cx="93" cy="106" r="2.3" fill="#18181b" />

              {/* Front Wheel (Monza Alloy Style) */}
              <circle cx="260" cy="101" r="20" fill="#09090b" stroke="#27272a" strokeWidth="2" />
              <circle cx="260" cy="101" r="13.5" fill="url(#wheelRim)" />
              <circle cx="260" cy="101" r="4" fill="#18181b" />
              <circle cx="255" cy="96" r="2.3" fill="#18181b" />
              <circle cx="265" cy="96" r="2.3" fill="#18181b" />
              <circle cx="255" cy="106" r="2.3" fill="#18181b" />
              <circle cx="265" cy="106" r="2.3" fill="#18181b" />

              {/* Roof Driving School L-Plate Top Box */}
              <polygon points="122,33 132,16 202,16 212,33" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1" />
              <text x="135" y="28" textAnchor="middle" fill="#dc2626" fontWeight="900" fontSize="10" fontFamily="sans-serif">L</text>
              <text x="167" y="24" textAnchor="middle" fill="#18181b" fontWeight="800" fontSize="4.6" fontFamily="sans-serif">Learn To Pass</text>
              <text x="167" y="29.5" textAnchor="middle" fill="#18181b" fontWeight="800" fontSize="4.6" fontFamily="sans-serif">With Us</text>
              <text x="199" y="28" textAnchor="middle" fill="#dc2626" fontWeight="900" fontSize="10" fontFamily="sans-serif">L</text>

              {/* Mini Rear Plate Badge */}
              <rect x="38" y="83" width="24" height="6.5" rx="1" fill="#facc15" />
              <text x="50" y="88" textAnchor="middle" fill="#09090b" fontWeight="800" fontSize="4.2" fontFamily="monospace">EN56 WXA</text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT SEED DATA GENERATORS
// ============================================================================
function getInitialSeedData() {
  const tomorrow = getUpcomingDateStr(1);
  const dayAfter = getUpcomingDateStr(2);
  const day3 = getUpcomingDateStr(3);

  const accounts = [
    {
      id: 'instructor-mark',
      name: 'Mark (Instructor)',
      role: 'instructor',
      email: 'mark@learntopasswithus.co.uk',
      phone: '07700 900123',
      postcode: 'PO19 - Chichester City Centre',
      transmission: 'Manual 6-Speed (Black VW Golf Mk5 GTI - EN56 WXA)'
    },
    {
      id: 'pupil-sarah',
      name: 'Sarah Jenkins',
      role: 'pupil',
      email: 'sarah.jenkins@example.co.uk',
      phone: '07700 900411',
      postcode: 'PO19 - Chichester City Centre',
      testDate: getUpcomingDateStr(28)
    },
    {
      id: 'pupil-callum',
      name: 'Callum Reed',
      role: 'pupil',
      email: 'callum.reed@example.co.uk',
      phone: '07700 900522',
      postcode: 'PO21 - Bognor Regis West / Aldwick',
      testDate: getUpcomingDateStr(45)
    },
    {
      id: 'pupil-chloe',
      name: 'Chloe Bennett',
      role: 'pupil',
      email: 'chloe.bennett@example.co.uk',
      phone: '07700 900633',
      postcode: 'PO20 - Selsey / Bracklesham / Witterings',
      testDate: ''
    },
    {
      id: 'pupil-oliver',
      name: 'Oliver Hughes',
      role: 'pupil',
      email: 'oliver.hughes@example.co.uk',
      phone: '07700 900744',
      postcode: 'PO18 - Bosham / Lavant / Fishbourne',
      testDate: getUpcomingDateStr(18)
    }
  ];

  const lessons = [
    {
      id: 'lesson-101',
      pupilId: 'pupil-sarah',
      pupilName: 'Sarah Jenkins',
      date: tomorrow,
      startTime: '09:00',
      durationMins: 90,
      pickupLocation: 'PO19 - Chichester City Centre',
      dropoffLocation: 'PO19 - Chichester City Centre',
      status: 'confirmed',
      notes: 'A27 Fishbourne & Stockbridge spiral roundabouts + lane discipline.',
      pupilNotes: 'Can we also practise parallel parking near Southgate?',
      reminderSent: false,
      pupilConfirmedAttendance: false,
      isOutOfHours: false
    },
    {
      id: 'lesson-102',
      pupilId: 'pupil-callum',
      pupilName: 'Callum Reed',
      date: tomorrow,
      startTime: '11:15',
      durationMins: 60,
      pickupLocation: 'PO21 - Bognor Regis West / Aldwick',
      dropoffLocation: 'PO21 - Bognor Regis West / Aldwick',
      status: 'pending',
      notes: 'Junctions & emerging onto busy A259 coast road.',
      pupilNotes: 'First time doing multi-lane roundabouts.',
      reminderSent: false,
      pupilConfirmedAttendance: false,
      isOutOfHours: false
    },
    {
      id: 'lesson-103',
      pupilId: 'pupil-oliver',
      pupilName: 'Oliver Hughes',
      date: dayAfter,
      startTime: '14:00',
      durationMins: 120,
      pickupLocation: 'PO18 - Bosham / Lavant / Fishbourne',
      dropoffLocation: 'PO18 - Bosham / Lavant / Fishbourne',
      status: 'confirmed',
      notes: 'Full DVSA Mock Test route around Chichester Test Centre.',
      pupilNotes: 'Ready for mock test!',
      reminderSent: false,
      pupilConfirmedAttendance: false,
      isOutOfHours: false
    }
  ];

  const unavailability = [
    {
      id: 'unavail-1',
      title: 'Dental Appointment (Chichester)',
      date: day3,
      allDay: false,
      startTime: '10:00',
      endTime: '12:30',
      source: 'manual'
    }
  ];

  const messages = [
    {
      id: 'msg-1',
      fromId: 'pupil-callum',
      fromName: 'Callum Reed',
      toId: 'instructor-mark',
      toName: 'Mark (Instructor)',
      text: 'Hi Mark! I requested the 11:15am 1-hour slot tomorrow from Aldwick (PO21). Does that give you enough travel time after Chichester?',
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      type: 'direct',
      read: false
    },
    {
      id: 'msg-2',
      fromId: 'instructor-mark',
      fromName: 'Learn To Pass With Us',
      toId: 'pupil-sarah',
      toName: 'Sarah Jenkins',
      text: `Your lesson with Learn To Pass With Us on ${formatReadableDate(tomorrow)} at 09:00 (1.5 hrs) is confirmed! Pick-up: PO19 - Chichester City Centre. Next lesson focus: A27 Fishbourne & Stockbridge spiral roundabouts.`,
      timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      type: 'system',
      read: true
    }
  ];

  const syllabus = {
    'pupil-sarah': {
      cockpit: { level: 5, note: 'Spotless DSSSM checks.' },
      moving_off: { level: 5, note: 'Smooth clutch control on hills.' },
      junctions: { level: 4, note: 'Good MSPSL timing.' },
      roundabouts: { level: 3, note: 'Working on A27 spiral lane markings.' },
      crossings: { level: 4, note: 'Confident around city centre.' },
      dual_carriageways: { level: 3, note: 'Building confidence on A27 slip roads.' },
      manoeuvres_bay: { level: 4, note: 'Reverse bay mastered.' },
      manoeuvres_parallel: { level: 2, note: 'Introduced next lesson.' },
      emergency_stop: { level: 4, note: 'Quick reaction.' },
      independent: { level: 2, note: 'Starting sat-nav drills soon.' },
      mock_test: { level: 0, note: 'Scheduled in 2 weeks.' }
    },
    'pupil-callum': {
      cockpit: { level: 4, note: 'Good setup.' },
      moving_off: { level: 3, note: 'Consistent.' },
      junctions: { level: 2, note: 'Watch speed on approach to closed T-junctions.' },
      roundabouts: { level: 1, note: 'Mini-roundabouts started.' }
    },
    'pupil-oliver': {
      cockpit: { level: 5, note: 'Test ready' },
      moving_off: { level: 5, note: 'Test ready' },
      junctions: { level: 5, note: 'Test ready' },
      roundabouts: { level: 5, note: 'Handled A27 Whyke & Portfield well' },
      crossings: { level: 5, note: 'Test ready' },
      dual_carriageways: { level: 5, note: 'Test ready' },
      manoeuvres_bay: { level: 5, note: 'Test ready' },
      manoeuvres_parallel: { level: 4, note: 'Just keep steering smooth' },
      emergency_stop: { level: 5, note: 'Test ready' },
      independent: { level: 4, note: 'Completed 20m sat nav route' },
      mock_test: { level: 3, note: 'Full mock test booked' }
    }
  };

  return { accounts, lessons, unavailability, messages, syllabus };
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

  // 1. Authenticate with Cloud Backend FIRST (Mandatory Auth-Before-Queries)
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

  // 2. Real-Time Cloud Firestore Listeners (Strict /artifacts/{appId}/public/data/... paths)
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
        if (snap.empty) {
          seed.accounts.forEach((acc) =>
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', acc.id), acc)
          );
        } else {
          setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
        setCloudReady(true);
      },
      (err) => console.error('Accounts sync error:', err)
    );

    const unsubLessons = onSnapshot(
      lessonsCol,
      (snap) => {
        if (snap.empty) {
          seed.lessons.forEach((l) =>
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'lessons', l.id), l)
          );
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
          setLessons(list);
        }
      },
      (err) => console.error('Lessons sync error:', err)
    );

    const unsubUnavail = onSnapshot(
      unavailCol,
      (snap) => {
        if (snap.empty) {
          seed.unavailability.forEach((u) =>
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'unavailability', u.id), u)
          );
        } else {
          setUnavailability(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      },
      (err) => console.error('Unavailability sync error:', err)
    );

    const unsubMessages = onSnapshot(
      messagesCol,
      (snap) => {
        if (snap.empty) {
          seed.messages.forEach((m) =>
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', m.id), m)
          );
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          setMessages(list);
        }
      },
      (err) => console.error('Messages sync error:', err)
    );

    const unsubSyllabus = onSnapshot(
      syllabusCol,
      (snap) => {
        if (snap.empty) {
          Object.entries(seed.syllabus).forEach(([pid, skillsObj]) =>
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'syllabus', pid), { skills: skillsObj })
          );
        } else {
          const map = {};
          snap.docs.forEach((d) => {
            map[d.id] = d.data().skills || {};
          });
          setSyllabusProgress(map);
        }
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

  // Keep localStorage cache updated as well
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
  const [selectedPupilForPlan, setSelectedPupilForPlan] = useState('pupil-sarah');
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  // Toast helper (Never uses alert() or confirm())
  const notify = (title, description, type = 'success') => {
    setToastNotification({ title, description, type, id: Date.now() });
    setTimeout(() => {
      setToastNotification((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  };

  // Derived Current User & Role (null when logged out)
  const currentUser = useMemo(() => {
    if (!activeUserId) return null;
    return accounts.find((a) => a.id === activeUserId) || null;
  }, [accounts, activeUserId]);

  const isInstructor = currentUser?.role === 'instructor';
  const pupilsList = useMemo(() => accounts.filter((a) => a.role === 'pupil'), [accounts]);

  // Unread messages count for current user
  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter((m) => m.toId === currentUser.id && !m.read).length;
  }, [messages, currentUser]);

  // ============================================================================
  // SMART AVAILABILITY & DISTANCE BUFFER ENGINE FOR ANY DATE + PUPIL + DURATION
  // ============================================================================
  const computeSlotAvailability = (targetDate, pupilAccount, durationMins) => {
    const startLimit = timeToMinutes(settings.workStart || '07:00');
    const endLimit = timeToMinutes(settings.workEnd || '18:00');
    const slots = [];

    // 1. Combine manual unavailability blocks + synced .ics work rota events (ignoring Google's "Free" status)
    const dayRotaBlocks = settings.secondaryShiftEnabled
      ? rotaEvents.filter((r) => r.date === targetDate)
      : [];
    const dayUnavailBlocks = [
      ...unavailability.filter((u) => u.date === targetDate),
      ...dayRotaBlocks
    ];
    const isAllDayBlocked = dayUnavailBlocks.some((u) => u.allDay);

    // 2. Check Secondary Google Calendar recurring weekday shift fallback (if configured)
    const [y, m, d] = targetDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0=Sun, 1=Mon...
    const hasSecondaryShift =
      settings.secondaryShiftEnabled &&
      Array.isArray(settings.secondaryShiftDays) &&
      settings.secondaryShiftDays.includes(dayOfWeek);

    // 3. Active lessons on targetDate (confirmed or pending)
    const dayLessons = lessons
      .filter((l) => l.date === targetDate && (l.status === 'confirmed' || l.status === 'pending'))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Generate 15-min candidate slots from 07:00 to 18:00
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

      // Check specific time unavailability blocks
      let blockedReason = null;
      for (const block of dayUnavailBlocks) {
        const bStart = timeToMinutes(block.startTime);
        const bEnd = timeToMinutes(block.endTime);
        if (candStart < bEnd && candEnd > bStart) {
          blockedReason = `Blocked: ${block.title} (${block.startTime}-${block.endTime})`;
          break;
        }
      }

      // Check Secondary Google Account Calendar Shift (e.g. 06:00 - 17:00)
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

      // Evaluate against existing lessons + Distance & 10-min Write-Up Buffer!
      let conflictReason = null;
      let travelNote = null;

      for (const existing of dayLessons) {
        const exStart = timeToMinutes(existing.startTime);
        const exEnd = exStart + existing.durationMins;

        // Direct overlap check
        if (candStart < exEnd && candEnd > exStart) {
          conflictReason = `Booked (${existing.startTime}-${minutesToTime(exEnd)})`;
          break;
        }

        const isSamePupil = pupilAccount && existing.pupilId === pupilAccount.id;
        const pupilLoc = pupilAccount?.postcode || 'PO19 - Chichester City Centre';

        // Case A: Candidate slot is AFTER an existing lesson
        if (candStart >= exEnd) {
          if (isSamePupil && candStart === exEnd) {
            // CONSECUTIVE SLOT EXCEPTION: Bypass distance formula if same pupil books back-to-back!
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

        // Case B: Candidate slot is BEFORE an existing lesson
        if (candEnd <= exStart) {
          if (isSamePupil && candEnd === exStart) {
            // CONSECUTIVE SLOT EXCEPTION
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
  // CORE ACTIONS (BOOK, APPROVE, DECLINE, CANCEL, REMIND, MESSAGES, ACCOUNTS)
  // ============================================================================
  const sendAutomatedMessage = (toId, toName, text, type = 'system') => {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromId: currentUser?.id || 'instructor-mark',
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
        'instructor-mark',
        'Mark (Instructor)',
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

  // Cancel lesson + Smart Distance-Based Broadcast to reachable pupils!
  const handleCancelLesson = (lesson, cancelledBy = 'instructor') => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, status: 'cancelled' } : l))
    );
    persistCloudDoc('lessons', lesson.id, { status: 'cancelled' });

    // Notify the pupil whose lesson was cancelled
    if (cancelledBy === 'instructor') {
      sendAutomatedMessage(
        lesson.pupilId,
        lesson.pupilName,
        `Update from Learn To Pass With Us: Your lesson on ${formatReadableDate(lesson.date)} at ${lesson.startTime} has been cancelled. Please check available slots to rebook.`
      );
    } else {
      sendAutomatedMessage(
        'instructor-mark',
        'Mark (Instructor)',
        `${lesson.pupilName} cancelled their lesson on ${formatReadableDate(lesson.date)} at ${lesson.startTime} (${lesson.pickupLocation}).`
      );
    }

    // SMART CANCELLATION BROADCAST: Find all other active pupils reachable within ~11 miles
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
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, pupilConfirmedAttendance: true } : l))
    );
    persistCloudDoc('lessons', lesson.id, { pupilConfirmedAttendance: true });
    sendAutomatedMessage(
      'instructor-mark',
      'Mark (Instructor)',
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

  // ============================================================================
  // DEDICATED LOGIN & SIGN-UP GATE (BRIGHT WHITE INPUTS + CAPS LOCK DETECTION)
  // ============================================================================
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* ==================================================================== */}
      {/* TOP NAVIGATION HEADER (INDIVIDUAL LOGGED-IN SESSION)                 */}
      {/* ==================================================================== */}
      <header className="bg-zinc-950 text-white border-b border-zinc-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-950">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                  Learn To Pass With Us
                </h1>
                <span className="hidden md:inline-block bg-amber-400 text-zinc-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded">
                  EN56 WXA
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    cloudReady
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  {cloudReady ? 'Cloud Live Sync' : 'Connecting Cloud...'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Chichester &amp; West Sussex Driving School
              </p>
            </div>
          </div>

          {/* Authenticated User Badge & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5">
              <span
                className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                  isInstructor
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isInstructor ? 'Instructor' : 'Pupil'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white">{currentUser.name}</span>
            </div>

            {isInstructor && (
              <button
                onClick={() => setShowCreateAccountModal(true)}
                className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                title="Add New Pupil or Instructor Account"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Add User</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveUserId(null);
                setActiveTab('dashboard');
                notify('Signed Out', 'You have been securely logged out.', 'info');
              }}
              className="inline-flex items-center gap-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-900/90 border-t border-zinc-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1 py-1.5">
            {[
              { id: 'dashboard', label: isInstructor ? 'Instructor Schedule & Requests' : 'My Lessons & Booking', icon: Calendar },
              { id: 'syllabus', label: isInstructor ? 'Pupil Lesson Plans (DVSA)' : 'My Lesson Plan & Progress', icon: Award },
              {
                id: 'messages',
                label: 'Messages & Alerts',
                icon: MessageSquare,
                badge: unreadCount
              },
              ...(isInstructor
                ? [{ id: 'calendar_sync', label: 'Unavailability & Google Sync', icon: RefreshCw }]
                : []),
              { id: 'accounts', label: 'Account Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
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

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA                                                    */}
      {/* ==================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Vehicle Banner on Dashboard (With Real Car Photo Uploader) */}
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

        {/* ================================================================== */}
        {/* TAB 1A: INSTRUCTOR DASHBOARD                                       */}
        {/* ================================================================== */}
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

        {/* ================================================================== */}
        {/* TAB 1B: PUPIL DASHBOARD & SMART BOOKING                            */}
        {/* ================================================================== */}
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

        {/* ================================================================== */}
        {/* TAB 2: DVSA SYLLABUS & LESSON PROGRESSION FLOWCHART                */}
        {/* ================================================================== */}
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

        {/* ================================================================== */}
        {/* TAB 3: DIRECT MESSAGES & AUTOMATED SYSTEM NOTIFICATIONS            */}
        {/* ================================================================== */}
        {activeTab === 'messages' && (
          <MessagingCenterView
            currentUser={currentUser}
            isInstructor={isInstructor}
            pupilsList={pupilsList}
            messages={messages}
            setMessages={setMessages}
            onMarkRead={(msgId) => persistCloudDoc('messages', msgId, { read: true })}
            onSendMessage={sendAutomatedMessage}
            notify={notify}
          />
        )}

        {/* ================================================================== */}
        {/* TAB 4: INSTRUCTOR UNAVAILABILITY & DUAL GOOGLE CALENDAR SYNC       */}
        {/* ================================================================== */}
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

        {/* ================================================================== */}
        {/* TAB 5: ACCOUNT SETTINGS & DELETION CONTROLS                        */}
        {/* ================================================================== */}
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

      {/* ==================================================================== */}
      {/* MODAL: DECLINE LESSON WITH CUSTOM NOTE                               */}
      {/* ==================================================================== */}
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
                Send Decline & Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: INSTRUCTOR DIRECTLY ADD LESSON FOR PUPIL                      */}
      {/* ==================================================================== */}
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

      {/* ==================================================================== */}
      {/* MODAL: CREATE NEW PUPIL OR INSTRUCTOR ACCOUNT                        */}
      {/* ==================================================================== */}
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

      {/* ==================================================================== */}
      {/* MODAL: STEP-BY-STEP GUIDE FOR 2ND GOOGLE CALENDAR (FREE ICAL SYNC)   */}
      {/* ==================================================================== */}
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
                <strong>Why this is the easiest &amp; £0 (completely free) method:</strong> Google provides a private read-only <strong>Secret iCal URL</strong> on every Google Calendar. You don&apos;t need to pay for Google Cloud APIs or share passwords—any shift you add to your other Google account (e.g. 6am–5pm work shift) automatically blocks out those hours here while leaving evening slots open for driving lessons!
              </div>

              <ol className="list-decimal pl-5 space-y-2.5 text-xs sm:text-sm">
                <li>
                  Open <strong>Google Calendar</strong> on a computer/browser logged into your <strong>other Google account</strong> (your 6am–5pm job calendar).
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
                  Paste that link into the <strong>Secondary Google Account iCal Feed</strong> box in this app. Any busy events on that calendar (like 06:00–17:00 shifts) will automatically block driving lesson bookings during those exact hours!
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

      {/* ==================================================================== */}
      {/* MODAL: GENERIC CONFIRMATION DIALOG (REPLACES window.confirm)         */}
      {/* ==================================================================== */}
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

  // Calculate travel impact badge for each pending request
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
      {/* Quick Action Bar */}
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
              2nd Google Cal Shift
            </span>
            <span className="text-sm font-extrabold text-indigo-600">
              {settings.secondaryShiftEnabled
                ? `Active (${settings.secondaryShiftStart}-${settings.secondaryShiftEnd})`
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

      {/* PENDING APPROVAL REQUESTS QUEUE */}
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
                          ⚡ Early/Late Out-of-Hours Request
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

                    {/* Smart Distance Buffer Breakdown Pill */}
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
                      Confirm & Send Message
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

      {/* DAILY SCHEDULE INSPECTOR & 24-HOUR REMINDER DISPATCH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Day View & Lesson Focus Notes */}
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
                                ✓ Attendance Confirmed
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

                      {/* Editable Next Lesson Focus Notes */}
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

                    {/* Visual Turnaround Connector between lessons */}
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

        {/* Right Column: 24-Hour Automated Reminder Queue */}
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
      {/* 24-HOUR ATTENDANCE CONFIRMATION BANNER IF TRIGGERED */}
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
                ✓ Confirm Still Attending
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
        {/* LEFT 7 COLS: SMART DISTANCE-AWARE LESSON BOOKER */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Book a Driving Lesson</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available times automatically adjust based on your pick-up location and the instructor&apos;s previous lesson drop-off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
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

            {/* Duration Selector (1hr, 1.5hr, 2hr) */}
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

          {/* Pick-up Postcode / Area */}
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

          {/* Available 15-Min Slots Grid */}
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

            {/* Selected Slot Travel Verification Info */}
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

          {/* Notes on what pupil wants to practise */}
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

          {/* Request Earlier / Later Out-of-Hours Slot */}
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

        {/* RIGHT 5 COLS: MY UPCOMING LESSONS + SYNC ALL LESSONS TO CALENDAR */}
        <div className="lg:col-span-5 space-y-5">
          {/* Sync All Lessons Live Calendar Feed Card */}
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

          {/* Pupil's Lessons List */}
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

                      {/* Shared Lesson Focus & Pupil Notes (Synced to Calendar Entries) */}
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

                      {/* One-Off Add to Calendar + Cancel Actions */}
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
  const targetPupilId = isInstructor ? selectedPupilId : currentUser.id;
  const targetPupil = pupilsList.find((p) => p.id === targetPupilId) || pupilsList[0];
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
      {/* Header & Pupil Selector */}
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

      {/* Overall Test Readiness Meter */}
      <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Test Readiness Score — {targetPupil?.name}
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

      {/* Visual Flowchart Nodes */}
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

                    {/* Instructor Note for this Syllabus Node */}
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

                {/* Progression Stage Selector */}
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

              {/* Downward Flowchart Arrow Connector */}
              {index < DVSA_SYLLABUS_SKILLS.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="w-0.5 h-4 bg-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  messages,
  setMessages,
  onMarkRead,
  onSendMessage,
  notify
}) {
  const [recipientId, setRecipientId] = useState(
    isInstructor ? pupilsList[0]?.id || 'pupil-sarah' : 'instructor-mark'
  );
  const [text, setText] = useState('');

  const myMessages = useMemo(() => {
    return messages.filter((m) => m.toId === currentUser.id || m.fromId === currentUser.id);
  }, [messages, currentUser.id]);

  // Mark incoming messages as read when opened
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
    if (!text.trim()) return;
    const targetName = isInstructor
      ? pupilsList.find((p) => p.id === recipientId)?.name || 'Pupil'
      : 'Mark (Instructor)';

    onSendMessage(recipientId, targetName, text.trim(), 'direct');
    setText('');
    notify('Message Sent', `Delivered to ${targetName}.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compose Box */}
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
                {pupilsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              To: <strong>Learn To Pass With Us (Instructor)</strong>
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
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm"
          >
            Send Message
          </button>
        </form>
      </div>

      {/* Message Feed */}
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

    // Convert webcal:// to https:// so browser fetch can retrieve it
    const httpUrl = cleanUrl.replace(/^webcal:\/\//i, 'https://');
    setIsSyncingRota(true);

    try {
      let icsContent = '';
      // Attempt direct fetch first, then fallback to public CORS relay if the rota server blocks cross-origin requests
      try {
        const directRes = await fetch(httpUrl);
        if (directRes.ok) {
          icsContent = await directRes.text();
        }
      } catch (_) {
        // Ignore direct CORS error and try proxy relay below
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
      {/* LEFT: HOLIDAYS & SPECIFIC-TIME UNAVAILABILITY */}
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

        {/* Active Blocks List */}
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

      {/* RIGHT: DUAL GOOGLE CALENDAR INTEGRATION & WORKING HOURS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Dual Google Calendar &amp; Working Hours
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sync your primary driving calendar + read busy shifts from your other Google account.
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
          {/* Default First & Last Lesson Times */}
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

          {/* Secondary Google Account Read-Only Private iCal Feed */}
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
                  ✓ {rotaEvents.length} work rota shift(s) actively blocking availability
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

      {/* Current User Self-Delete Card */}
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

      {/* Instructor-Only Directory of All Pupil & Instructor Accounts */}
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
              className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
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
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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

  // Detect Caps Lock whenever user types or clicks inside password / code fields
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

  // Force crisp white background & dark text on all form fields (even against browser dark mode/autofill)
  const lightInputClass =
    'w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 px-3.5 py-2.5 text-sm shadow-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none [color-scheme:light]';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between [color-scheme:light]">
      {/* Top Bar */}
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
            {cloudReady ? 'Live Booking Portal' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Split Showcase & Login Card */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left 7 Cols: Driving School Hero & Car Showcase */}
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

        {/* Right 5 Cols: Clean Light Login / Register Card */}
        <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          {/* Mode Switcher Tabs */}
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

          {/* CAPS LOCK WARNING BANNER */}
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