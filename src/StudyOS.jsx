import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Calendar as CalIcon,
  BookOpen,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Sparkles,
  Bot,
  Send,
  User,
  Zap,
  TrendingUp,
  Languages,
  Sun,
  Moon,
  Pin,
  PinOff,
  Archive,
  Copy,
  GripVertical,
  AlertTriangle,
  ListChecks,
  Play,
  Pause,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  RotateCw,
  Undo2,
  GraduationCap,
  BookMarked,
  ClipboardList,
} from 'lucide-react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import {
  LANG_META,
  DEFAULT_LANG,
  CATEGORY_LABELS,
  getUIText,
  coerceLang,
  CATEGORY_ALIASES,
  DEFAULT_CATEGORIES,
  INITIAL_NOTE_SEEDS,
  INITIAL_TASK_SEEDS,
  SEED_NOTE_TEXTS,
  SEED_TASK_TEXTS,
} from './App.i18n';
import AuthScreen from './AuthScreen';
import { aiApi, authApi, pushApi, userDataApi } from './api';
import {
  ensureServiceWorker,
  getExistingSubscription,
  isIosDevice,
  isPushSupported,
  isStandaloneMode,
  subscribeToPush,
  unsubscribeFromPush,
} from './push';

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');`;

const STYLES = `
  *, body { font-family: 'Plus Jakarta Sans', sans-serif; }
  .syne { font-family: 'Syne', sans-serif; }

  :root {
    --navy:   #0A1628;
    --navy-2: #0F2244;
    --blue:   #1B5FD9;
    --sky:    #0EA5E9;
    --cyan:   #06B6D4;
    --ice:    #E0F2FE;
    --bg:     #F0F9FF;
  }

  .scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .scroll::-webkit-scrollbar-track { background: transparent; }
  .scroll::-webkit-scrollbar-thumb { background: #BAE6FD; border-radius: 4px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes bounceDot {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-5px); }
  }
  @keyframes layoutEnter {
    0% { opacity: 0; transform: translateY(18px) scale(0.985); filter: blur(6px) saturate(0.92); }
    55% { opacity: 1; filter: blur(1px) saturate(1.04); }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) saturate(1); }
  }
  @keyframes layoutVeil {
    0% { opacity: 0; transform: scale(1.03); }
    25% { opacity: 0.6; }
    100% { opacity: 0; transform: scale(1); }
  }
  .anim-tab { animation: fadeUp .3s ease both; }
  .anim-fade { animation: fadeIn .25s ease both; }
  .layout-enter { animation: layoutEnter .9s cubic-bezier(0.22, 1, 0.36, 1) both; will-change: transform, opacity, filter; }
  .layout-enter::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 40;
    background:
      radial-gradient(60% 50% at 45% 28%, rgba(125,211,252,0.45) 0%, rgba(125,211,252,0) 70%),
      radial-gradient(45% 40% at 85% 80%, rgba(186,230,253,0.4) 0%, rgba(186,230,253,0) 70%);
    animation: layoutVeil 1.2s ease-out both;
  }
  .dot-1 { animation: bounceDot .9s 0ms infinite; }
  .dot-2 { animation: bounceDot .9s 150ms infinite; }
  .dot-3 { animation: bounceDot .9s 300ms infinite; }

  @media (prefers-reduced-motion: reduce) {
    .layout-enter { animation: none; }
    .layout-enter::before { animation: none; opacity: 0; }
  }

  .mesh-bg {
    background-color: var(--bg);
    background-image:
      radial-gradient(ellipse 60% 50% at 20% 0%, #BFDBFE88 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 90% 80%, #BAE6FD55 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 60% 40%, #E0F2FE44 0%, transparent 70%);
  }

  .theme-dark { --bg: #020617; }
  .theme-dark .mesh-bg {
    background-image:
      radial-gradient(ellipse 60% 50% at 20% 0%, #1E3A8A66 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 90% 80%, #0F766E55 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 60% 40%, #1E293B66 0%, transparent 70%);
  }

  .glass {
    background: rgba(255,255,255,0.78);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(186,230,253,0.55);
  }

  .theme-dark .glass {
    background: rgba(15,23,42,0.72);
    border: 1px solid rgba(56,189,248,0.24);
  }

  .theme-dark .text-slate-900 { color: #E2E8F0 !important; }
  .theme-dark .text-slate-800 { color: #E2E8F0 !important; }
  .theme-dark .text-slate-700 { color: #CBD5E1 !important; }
  .theme-dark .text-slate-600 { color: #CBD5E1 !important; }
  .theme-dark .text-slate-500 { color: #94A3B8 !important; }
  .theme-dark .text-slate-400 { color: #94A3B8 !important; }
  .theme-dark [class*='text-[#0A1628]'] { color: #E2E8F0 !important; }
  .theme-dark .text-sky-700,
  .theme-dark .text-sky-600 { color: #7DD3FC !important; }
  .theme-dark [class*='text-sky-500/70'] { color: rgba(125, 211, 252, 0.85) !important; }
  .theme-dark .text-indigo-600 { color: #A5B4FC !important; }
  .theme-dark .text-amber-500 { color: #FCD34D !important; }
  .theme-dark .text-emerald-700 { color: #6EE7B7 !important; }
  .theme-dark .text-rose-700 { color: #FDA4AF !important; }

  .theme-dark .border-sky-100 { border-color: rgba(56,189,248,0.25) !important; }
  .theme-dark .border-slate-200,
  .theme-dark .border-slate-300 { border-color: rgba(71,85,105,0.72) !important; }

  .theme-dark [class*='bg-white/'],
  .theme-dark .bg-white,
  .theme-dark .bg-slate-50,
  .theme-dark .bg-slate-100,
  .theme-dark .bg-slate-200,
  .theme-dark [class*='bg-sky-50'],
  .theme-dark [class*='bg-slate-50/'] {
    background-color: rgba(15,23,42,0.6) !important;
  }

  .theme-dark .bg-sky-100,
  .theme-dark .bg-sky-200 { background-color: rgba(14,165,233,0.16) !important; }

  .theme-dark input,
  .theme-dark textarea,
  .theme-dark select { color: #E2E8F0; }

  .theme-dark input::placeholder,
  .theme-dark textarea::placeholder { color: #94A3B8; }

  .theme-dark input[type='file']::file-selector-button {
    background: rgba(14,165,233,0.2);
    color: #BAE6FD;
  }

  .nav-active {
    background: var(--sky);
    box-shadow: 0 4px 20px 0 #0EA5E960;
  }

  .strike {
    text-decoration: line-through;
    text-decoration-color: #94a3b8;
  }
`;

const FOOTER_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com/trungnguyen191105', icon: FaFacebookF, iconClass: 'text-[#1877F2]' },
  { label: 'Instagram', href: 'https://www.instagram.com/peekk_apoo/', icon: FaInstagram, iconClass: 'text-[#E1306C]' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ngtrung05/', icon: FaLinkedinIn, iconClass: 'text-[#0A66C2]' },
  { label: 'GitHub', href: 'https://github.com/peekkapoo', icon: FaGithub, iconClass: 'text-slate-700' },
];

const AUTH_TOKEN_KEY = 'bs3-auth-token';
const AUTH_USER_KEY = 'bs3-auth-user';
const DEV_AUTH_BYPASS_ENABLED = import.meta.env.DEV && ['1', 'true', 'yes', 'on'].includes(String(import.meta.env.VITE_AUTH_BYPASS || '').trim().toLowerCase());
const DEV_BYPASS_USER = {
  name: 'Local Developer',
  email: 'local@blue-study.dev',
  picture: null,
};

const DISPLAY_NAME_TAKEN_MESSAGE = 'Display name is already in use. Please choose another one.';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_INPUT_BYTES = 10 * 1024 * 1024;
const AVATAR_MAX_DIMENSION = 512;
const AVATAR_JPEG_QUALITY = 0.82;

const normalizeCategory = (value) => CATEGORY_ALIASES[value] || value;
const pad2 = (n) => String(n).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const parseDateKey = (dateKey) => {
  if (!dateKey || typeof dateKey !== 'string') return new Date();
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const normalizeDateKey = (input, fallbackDate = new Date()) => {
  if (!input) return toDateKey(fallbackDate);
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return toDateKey(d);
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) return toDateKey(input);
  return toDateKey(fallbackDate);
};

const addDays = (dateKey, days) => {
  const d = typeof dateKey === 'string' ? parseDateKey(dateKey) : new Date(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameWeek = (dateKey, pivot) => {
  const d = parseDateKey(dateKey);
  const s1 = startOfWeek(d).getTime();
  const s2 = startOfWeek(pivot).getTime();
  return s1 === s2;
};

const isoNow = () => new Date().toISOString();

const buildAvatarUrl = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=bfdbfe`;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const readBlobAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const compressImageFile = async (file) => {
  if (file.type === 'image/svg+xml') {
    return readBlobAsDataUrl(file);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height));
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const encode = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    let outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    let quality = outputType === 'image/jpeg' ? AVATAR_JPEG_QUALITY : undefined;
    let blob = await encode(outputType, quality);

    if (!blob) throw new Error('encode');

    if (blob.size > MAX_AVATAR_BYTES && outputType === 'image/png') {
      outputType = 'image/jpeg';
      quality = AVATAR_JPEG_QUALITY;
      blob = await encode(outputType, quality);
    }

    while (blob && outputType === 'image/jpeg' && blob.size > MAX_AVATAR_BYTES && quality > 0.6) {
      quality = Math.max(0.6, Number((quality - 0.08).toFixed(2)));
      blob = await encode(outputType, quality);
    }

    if (!blob || blob.size > MAX_AVATAR_BYTES) {
      throw new Error('too-large');
    }

    const dataUrl = await readBlobAsDataUrl(blob);
    if (!dataUrl) throw new Error('encode');
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const getTimeGreeting = (hour, text) => {
  if (hour >= 5 && hour < 11) return text.greetingMorning || text.greeting;
  if (hour >= 11 && hour < 14) return text.greetingNoon || text.greeting;
  if (hour >= 14 && hour < 18) return text.greetingAfternoon || text.greeting;
  return text.greetingEvening || text.greeting;
};

const CAT_COLORS = {
  general: { pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600' },
  tech: { pill: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', icon: 'bg-cyan-50 text-cyan-600' },
  language: { pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', icon: 'bg-indigo-50 text-indigo-600' },
  skill: { pill: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', icon: 'bg-sky-50 text-sky-600' },
};
const catColor = (cat) => CAT_COLORS[cat] ?? { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: 'bg-slate-50 text-slate-500' };

const PRIORITY_META = {
  low: { labelKey: 'priorityLow', cls: 'bg-slate-100 text-slate-600' },
  medium: { labelKey: 'priorityMedium', cls: 'bg-amber-100 text-amber-700' },
  high: { labelKey: 'priorityHigh', cls: 'bg-rose-100 text-rose-700' },
};

const RECURRENCE_LABEL_KEYS = {
  none: 'recurrenceNone',
  daily: 'recurrenceDaily',
  weekly: 'recurrenceWeekly',
  monthly: 'recurrenceMonthly',
};

const RECURRENCE_STEP = {
  none: 0,
  daily: 1,
  weekly: 7,
  monthly: 30,
};

const POMODORO_MODES = ['focus', 'short', 'long'];

const DEFAULT_POMODORO_CONFIG = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
};

const clampNumber = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const normalizePomodoroMode = (mode) => (POMODORO_MODES.includes(mode) ? mode : 'focus');

const normalizePomodoroConfig = (config) => ({
  focusMinutes: clampNumber(config?.focusMinutes, 10, 90, DEFAULT_POMODORO_CONFIG.focusMinutes),
  shortBreakMinutes: clampNumber(config?.shortBreakMinutes, 3, 30, DEFAULT_POMODORO_CONFIG.shortBreakMinutes),
  longBreakMinutes: clampNumber(config?.longBreakMinutes, 10, 60, DEFAULT_POMODORO_CONFIG.longBreakMinutes),
  cyclesBeforeLongBreak: clampNumber(config?.cyclesBeforeLongBreak, 2, 8, DEFAULT_POMODORO_CONFIG.cyclesBeforeLongBreak),
  autoStartBreaks: Boolean(config?.autoStartBreaks),
  autoStartFocus: Boolean(config?.autoStartFocus),
  soundEnabled: config?.soundEnabled !== false,
});

const getPomodoroSecondsByMode = (config) => {
  const safe = normalizePomodoroConfig(config);
  return {
    focus: safe.focusMinutes * 60,
    short: safe.shortBreakMinutes * 60,
    long: safe.longBreakMinutes * 60,
  };
};

const normalizePomodoroSnapshot = (rawPomodoro, todayKey) => {
  const config = normalizePomodoroConfig(rawPomodoro?.config || {});
  const secondsByMode = getPomodoroSecondsByMode(config);
  const mode = normalizePomodoroMode(rawPomodoro?.mode);
  const maxSeconds = secondsByMode[mode];
  const secondsLeft = clampNumber(rawPomodoro?.secondsLeft, 0, maxSeconds, maxSeconds);
  const completed = clampNumber(rawPomodoro?.completed, 0, 9999, 0);
  const statsDateKey = normalizeDateKey(rawPomodoro?.stats?.dateKey, parseDateKey(todayKey));
  const focusMinutes = statsDateKey === todayKey
    ? clampNumber(rawPomodoro?.stats?.focusMinutes, 0, 2000, 0)
    : 0;

  return {
    config,
    mode,
    secondsLeft,
    completed,
    stats: {
      dateKey: todayKey,
      focusMinutes,
    },
  };
};

const formatCountdown = (seconds) => `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;
const SHORT_DATE_OPTIONS = { day: '2-digit', month: '2-digit', year: 'numeric' };
const SHORT_DATE_TIME_OPTIONS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
const isNumericDateParts = (options = SHORT_DATE_OPTIONS) => {
  const hasNumericDay = options?.day === '2-digit' || options?.day === 'numeric';
  const hasNumericMonth = options?.month === '2-digit' || options?.month === 'numeric';
  const hasNumericYear = options?.year === 'numeric';
  return hasNumericDay && hasNumericMonth && hasNumericYear && !options?.weekday;
};
const formatDateDmy = (date, options = SHORT_DATE_OPTIONS) => {
  const dayValue = date.getDate();
  const monthValue = date.getMonth() + 1;
  const day = options?.day === '2-digit' ? pad2(dayValue) : String(dayValue);
  const month = options?.month === '2-digit' ? pad2(monthValue) : String(monthValue);
  return `${day}/${month}/${date.getFullYear()}`;
};

const getWorkflowNav = (text) => [
  { id: 'today', label: text.navToday, icon: LayoutDashboard },
  { id: 'plan', label: text.navPlan, icon: CalIcon },
  { id: 'learn', label: text.navLearn, icon: GraduationCap },
  { id: 'library', label: text.navLibrary, icon: BookOpen },
];

const Stat = ({ label, value, sub }) => (
  <div className="bg-white/20 rounded-2xl px-4 py-3 flex-1 text-center">
    <p className="text-2xl font-bold syne">{value}</p>
    <p className="text-[11px] text-blue-200 font-medium mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-blue-300 mt-0.5">{sub}</p>}
  </div>
);

const getBacklinkTitles = (note, notes, fallbackTitle) => {
  const title = (note.title || '').trim();
  if (!title) return [];
  return notes
    .filter((n) => n.id !== note.id)
    .filter((n) => (n.content || '').includes(`[[${title}]]`))
    .map((n) => n.title || fallbackTitle || 'Untitled');
};

const summarizeNote = (content) => {
  const clean = String(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= 140) return clean;
  return `${clean.slice(0, 140)}...`;
};

const extractFlashcards = (content) => {
  const lines = String(content || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines
    .map((line) => {
      const delimiter = line.includes('::') ? '::' : (line.includes(':') ? ':' : null);
      if (!delimiter) return null;
      const parts = line.split(delimiter);
      if (parts.length < 2) return null;
      const q = parts[0].trim();
      const a = parts.slice(1).join(delimiter).trim();
      if (!q || !a) return null;
      return { question: q, answer: a };
    })
    .filter(Boolean);
};

const normalizeTask = (task, fallbackDateKey) => ({
  ...task,
  dateKey: normalizeDateKey(task.dateKey || task.scheduledDate || task.date, parseDateKey(fallbackDateKey)),
  dueDateKey: normalizeDateKey(task.dueDateKey || task.dateKey || task.date, parseDateKey(fallbackDateKey)),
  subject: normalizeCategory(task.subject || task.category || 'general'),
  priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
  recurring: ['none', 'daily', 'weekly', 'monthly'].includes(task.recurring) ? task.recurring : 'none',
  duration: Number(task.duration || 45),
  archived: Boolean(task.archived),
  completed: Boolean(task.completed),
  reminderAt: task.reminderAt || '',
  updatedAt: task.updatedAt || isoNow(),
  createdAt: task.createdAt || isoNow(),
});

const normalizeNote = (note, fallbackDateKey) => ({
  ...note,
  dateKey: normalizeDateKey(note.dateKey || note.date, parseDateKey(fallbackDateKey)),
  category: normalizeCategory(note.category || 'general'),
  pinned: Boolean(note.pinned),
  archived: Boolean(note.archived),
  tags: Array.isArray(note.tags) ? note.tags : [],
  versions: Array.isArray(note.versions) ? note.versions : [],
  attachments: Array.isArray(note.attachments) ? note.attachments : [],
  flashcards: Array.isArray(note.flashcards) ? note.flashcards : [],
  updatedAt: note.updatedAt || isoNow(),
  createdAt: note.createdAt || isoNow(),
});

export default function StudyOS() {
  const [authToken, setAuthToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [authUser, setAuthUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady] = useState(false);
  const [mainEnter, setMainEnter] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: '', picture: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileAvatarError, setProfileAvatarError] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [pushInfo, setPushInfo] = useState('');
  const [pushStandalone, setPushStandalone] = useState(false);
  const [pushIos, setPushIos] = useState(false);
  const [theme, setTheme] = useState(() => (localStorage.getItem('bs3-theme') === 'dark' ? 'dark' : 'light'));
  const [now, setNow] = useState(() => new Date());
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [view, setView] = useState('today');

  const [curMonth, setCurMonth] = useState(new Date());
  const [selDate, setSelDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  const [plannerMode, setPlannerMode] = useState('today');

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCatInput, setNewCatInput] = useState('');

  const t = getUIText(lang);
  const workflowNav = useMemo(() => getWorkflowNav(t), [t]);
  const tutorialSteps = useMemo(() => ([
    { key: 'welcome', title: t.tutorialStepWelcomeTitle, body: t.tutorialStepWelcomeBody, target: 'tutorial-button' },
    { key: 'nav-today', title: t.tutorialStepNavTodayTitle, body: t.tutorialStepNavTodayBody, target: 'nav-today', view: 'today' },
    { key: 'today-dashboard', title: t.tutorialStepTodayDashboardTitle, body: t.tutorialStepTodayDashboardBody, target: 'today-dashboard', view: 'today' },
    { key: 'today-decision', title: t.tutorialStepTodayDecisionTitle, body: t.tutorialStepTodayDecisionBody, target: 'today-decision', view: 'today' },
    { key: 'today-rhythm', title: t.tutorialStepTodayRhythmTitle, body: t.tutorialStepTodayRhythmBody, target: 'today-rhythm', view: 'today' },
    { key: 'today-risk', title: t.tutorialStepTodayRiskTitle, body: t.tutorialStepTodayRiskBody, target: 'today-risk', view: 'today' },
    { key: 'nav-plan', title: t.tutorialStepNavPlanTitle, body: t.tutorialStepNavPlanBody, target: 'nav-plan', view: 'plan' },
    { key: 'task-engine', title: t.tutorialStepTaskEngineTitle, body: t.tutorialStepTaskEngineBody, target: 'task-engine', view: 'plan' },
    { key: 'task-views', title: t.tutorialStepTaskViewsTitle, body: t.tutorialStepTaskViewsBody, target: 'task-views', view: 'plan' },
    { key: 'task-quick-add', title: t.tutorialStepTaskQuickAddTitle, body: t.tutorialStepTaskQuickAddBody, target: 'task-add', view: 'plan' },
    { key: 'task-filters', title: t.tutorialStepTaskFiltersTitle, body: t.tutorialStepTaskFiltersBody, target: 'task-filters', view: 'plan' },
    { key: 'task-bulk', title: t.tutorialStepTaskBulkTitle, body: t.tutorialStepTaskBulkBody, target: 'task-bulk', view: 'plan' },
    { key: 'task-list', title: t.tutorialStepTaskListTitle, body: t.tutorialStepTaskListBody, target: 'task-list', view: 'plan' },
    { key: 'nav-learn', title: t.tutorialStepNavLearnTitle, body: t.tutorialStepNavLearnBody, target: 'nav-learn', view: 'learn' },
    { key: 'learn-pomodoro', title: t.tutorialStepPomodoroTitle, body: t.tutorialStepPomodoroBody, target: 'learn-pomodoro', view: 'learn' },
    { key: 'learn-pomodoro-settings', title: t.tutorialStepPomodoroSettingsTitle, body: t.tutorialStepPomodoroSettingsBody, target: 'learn-pomodoro-settings', view: 'learn' },
    { key: 'learn-sessions', title: t.tutorialStepStudySessionsTitle, body: t.tutorialStepStudySessionsBody, target: 'learn-sessions', view: 'learn' },
    { key: 'learn-goals', title: t.tutorialStepGoalsTitle, body: t.tutorialStepGoalsBody, target: 'learn-goals', view: 'learn' },
    { key: 'learn-progress', title: t.tutorialStepProgressTitle, body: t.tutorialStepProgressBody, target: 'learn-progress', view: 'learn' },
    { key: 'nav-library', title: t.tutorialStepNavLibraryTitle, body: t.tutorialStepNavLibraryBody, target: 'nav-library', view: 'library' },
    { key: 'note-capture', title: t.tutorialStepNoteCaptureTitle, body: t.tutorialStepNoteCaptureBody, target: 'note-save', view: 'library' },
    { key: 'ai', title: t.tutorialStepAiTitle, body: t.tutorialStepAiBody, target: 'ai-toggle' },
  ]), [t]);
  const priorityLabel = useCallback(
    (priority) => t[PRIORITY_META[priority]?.labelKey ?? PRIORITY_META.medium.labelKey],
    [t],
  );
  const recurrenceLabel = useCallback(
    (recurrence) => t[RECURRENCE_LABEL_KEYS[recurrence] ?? RECURRENCE_LABEL_KEYS.none],
    [t],
  );
  const weekDayLabels = useMemo(
    () => t.weekdaysShort,
    [t],
  );
  const locale = LANG_META[lang].locale;
  const formatDate = (date, options = SHORT_DATE_OPTIONS) => {
    if (isNumericDateParts(options)) return formatDateDmy(date, options);
    return date.toLocaleDateString(locale, options);
  };
  const formatDateFromKey = (dateKey, options = SHORT_DATE_OPTIONS) => formatDate(parseDateKey(dateKey), options);
  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const timeLabel = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${formatDateDmy(d, SHORT_DATE_TIME_OPTIONS)} ${timeLabel}`;
  };
  const categoryLabel = useCallback((cat) => (CATEGORY_LABELS[lang][cat] ?? cat), [lang]);
  const seedNoteText = useCallback((seedKey) => SEED_NOTE_TEXTS[seedKey]?.[lang], [lang]);
  const seedTaskText = useCallback((seedKey) => SEED_TASK_TEXTS[seedKey]?.[lang], [lang]);
  const getNoteTitle = useCallback((note) => note.seedKey ? seedNoteText(note.seedKey)?.title || note.title || '' : note.title || '', [seedNoteText]);
  const getNoteContent = useCallback((note) => note.seedKey ? seedNoteText(note.seedKey)?.content || note.content || '' : note.content || '', [seedNoteText]);
  const getTaskTitle = useCallback((task) => task.seedKey ? seedTaskText(task.seedKey) || task.task || '' : task.task || '', [seedTaskText]);
  const avatarSeed = useMemo(() => {
    const seed = authUser?.email || authUser?.name || 'study-blue';
    return seed || 'study-blue';
  }, [authUser?.email, authUser?.name]);
  const avatarFallback = useMemo(() => buildAvatarUrl(avatarSeed), [avatarSeed]);
  const avatarSrc = authUser?.picture || avatarFallback;
  const profileAvatarSrc = profileDraft.picture || authUser?.picture || avatarFallback;

  const todayKey = toDateKey(now);

  const [notes, setNotes] = useState(
    INITIAL_NOTE_SEEDS.map((n) => normalizeNote({ ...n, dateKey: todayKey }, todayKey)),
  );
  const [tasks, setTasks] = useState(
    INITIAL_TASK_SEEDS.map((task) => normalizeTask({ ...task, task: seedTaskText(task.seedKey), dateKey: todayKey }, todayKey)),
  );
  const [goals, setGoals] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [exams, setExams] = useState([]);

  const [newTask, setNewTask] = useState({
    title: '',
    time: '09:00',
    dueDateKey: todayKey,
    priority: 'medium',
    recurring: 'none',
    duration: 45,
    subject: 'general',
    reminderAt: '',
  });

  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    subject: 'all',
    overdueOnly: false,
    sort: 'dueAsc',
    query: '',
  });

  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [taskFiltersOpen, setTaskFiltersOpen] = useState(false);

  const [noteFilters, setNoteFilters] = useState({
    category: 'all',
    tag: 'all',
    sort: 'updated',
    search: '',
    archived: false,
  });

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'general',
    tagsInput: '',
    attachmentInput: '',
  });

  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);

  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState(null);

  const [newGoal, setNewGoal] = useState({ title: '', subject: 'general', targetDateKey: addDays(todayKey, 14) });
  const [newSession, setNewSession] = useState({ subject: 'general', duration: 60, dateKey: todayKey, focus: 4, note: '' });
  const [newExam, setNewExam] = useState({ subject: 'general', dateKey: addDays(todayKey, 21), title: '' });
  const initialPomodoro = normalizePomodoroSnapshot(null, todayKey);
  const [pomodoroConfig, setPomodoroConfig] = useState(initialPomodoro.config);
  const [pomodoroMode, setPomodoroMode] = useState(initialPomodoro.mode);
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(initialPomodoro.secondsLeft);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroCompleted, setPomodoroCompleted] = useState(initialPomodoro.completed);
  const [pomodoroFocusStats, setPomodoroFocusStats] = useState(initialPomodoro.stats);

  const [undoState, setUndoState] = useState(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', content: t.aiWelcome }]);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialRect, setTutorialRect] = useState(null);
  const [tutorialTooltip, setTutorialTooltip] = useState({ top: 0, left: 0, placement: 'bottom' });

  const chatEndRef = useRef(null);
  const userDataLoadedRef = useRef(false);
  const dragTaskIdRef = useRef(null);
  const preloginSeenRef = useRef(false);
  const lastTodayKeyRef = useRef(todayKey);

  const pomodoroSecondsByMode = useMemo(() => getPomodoroSecondsByMode(pomodoroConfig), [pomodoroConfig]);
  const pushStatusLabel = useMemo(() => {
    if (!pushSupported) return t.pushStatusUnsupported;
    if (pushPermission === 'denied') return t.pushStatusDenied;
    if (pushSubscribed) return t.pushStatusEnabled;
    return t.pushStatusDisabled;
  }, [pushPermission, pushSubscribed, pushSupported, t]);

  const playPomodoroBell = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      const nowAt = audioContext.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, nowAt + offset);
        gain.gain.setValueAtTime(0.0001, nowAt + offset);
        gain.gain.exponentialRampToValueAtTime(0.08, nowAt + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, nowAt + offset + 0.12);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(nowAt + offset);
        oscillator.stop(nowAt + offset + 0.14);
      });
      setTimeout(() => audioContext.close().catch(() => {}), 700);
    } catch {
      // Ignore audio errors (autoplay policy or missing device).
    }
  }, []);

  const logout = () => {
    setAuthToken('');
    setAuthUser(null);
    setAuthReady(true);
    setProfileOpen(false);
    setProfileDraft({ name: '', picture: '' });
    setProfileSaving(false);
    setProfileError('');
    setProfileSuccess('');
    setProfileAvatarError('');
    setPushError('');
    setPushInfo('');
    setPushSubscribed(false);
    userDataLoadedRef.current = false;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };


  const openProfileEditor = () => {
    if (!authUser) return;
    setProfileDraft({
      name: authUser.name || '',
      picture: authUser.picture || '',
    });
    setProfileError('');
    setProfileSuccess('');
    setProfileAvatarError('');
    setPushError('');
    setPushInfo('');
    setProfileOpen(true);
  };

  const closeProfileEditor = () => {
    setProfileOpen(false);
    setProfileError('');
    setProfileSuccess('');
    setProfileAvatarError('');
    setPushError('');
    setPushInfo('');
  };

  const generateProfileAvatar = () => {
    const seedBase = profileDraft.name || authUser?.name || authUser?.email || 'study-blue';
    const seed = `${seedBase}-${Date.now()}`;
    setProfileDraft((prev) => ({ ...prev, picture: buildAvatarUrl(seed) }));
  };

  const clearProfileAvatar = () => {
    setProfileDraft((prev) => ({ ...prev, picture: '' }));
    setProfileAvatarError('');
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProfileAvatarError('');

    if (!file.type.startsWith('image/')) {
      setProfileAvatarError(t.profileAvatarFileTypeError);
      return;
    }

    if (file.size > MAX_AVATAR_INPUT_BYTES) {
      setProfileAvatarError(t.profileAvatarFileTooLarge);
      return;
    }

    try {
      const dataUrl = await compressImageFile(file);
      if (!dataUrl) {
        setProfileAvatarError(t.profileAvatarUploadError);
        return;
      }
      setProfileDraft((prev) => ({ ...prev, picture: dataUrl }));
    } catch (err) {
      if (err?.message === 'too-large') {
        setProfileAvatarError(t.profileAvatarFileTooLarge);
        return;
      }
      setProfileAvatarError(t.profileAvatarUploadError);
    }
  };

  const enablePushNotifications = async () => {
    setPushError('');
    setPushInfo('');

    if (!pushSupported) {
      setPushError(t.pushNotSupported);
      return;
    }
    if (!authToken) {
      setPushError(t.pushAuthRequired);
      return;
    }
    if (pushIos && !pushStandalone) {
      setPushError(t.pushStandaloneHint);
      return;
    }

    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        setPushError(permission === 'denied' ? '' : t.pushPermissionDismissed);
        return;
      }

      const { publicKey } = await pushApi.publicKey();
      if (!publicKey) {
        setPushError(t.pushKeyMissing);
        return;
      }

      await ensureServiceWorker();
      const existing = await getExistingSubscription();
      const subscription = existing || await subscribeToPush(publicKey);
      await pushApi.subscribe(authToken, subscription);
      setPushSubscribed(true);
      setPushInfo(t.pushEnabled);
    } catch (err) {
      setPushError(err?.message || t.genericError);
    } finally {
      setPushBusy(false);
    }
  };

  const disablePushNotifications = async () => {
    setPushError('');
    setPushInfo('');

    if (!authToken) {
      setPushError(t.pushAuthRequired);
      return;
    }

    setPushBusy(true);
    try {
      const subscription = await unsubscribeFromPush();
      if (subscription?.endpoint) {
        await pushApi.unsubscribe(authToken, subscription.endpoint);
      }
      setPushSubscribed(false);
      setPushInfo(t.pushDisabled);
    } catch (err) {
      setPushError(err?.message || t.genericError);
    } finally {
      setPushBusy(false);
    }
  };

  const sendTestPush = async () => {
    setPushError('');
    setPushInfo('');

    if (!authToken) {
      setPushError(t.pushAuthRequired);
      return;
    }

    setPushBusy(true);
    try {
      await pushApi.send(authToken, {
        title: 'Blue Study',
        body: t.pushTestBody,
        url: window.location.href,
      });
      setPushInfo(t.pushTestSent);
    } catch (err) {
      setPushError(err?.message || t.genericError);
    } finally {
      setPushBusy(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!authUser) return;

    const nextName = profileDraft.name.trim();
    if (nextName.length < 2 || nextName.length > 40) {
      setProfileError(t.profileNameLengthError);
      return;
    }

    const nextPicture = profileDraft.picture.trim();
    const payload = { name: nextName, picture: nextPicture || null };

    if (!authToken) {
      const updatedUser = { ...authUser, name: nextName, picture: nextPicture || null };
      setAuthUser(updatedUser);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      setProfileSuccess(t.profileSavedLocal);
      setProfileError('');
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError('');
      const res = await authApi.updateProfile(authToken, payload);
      setAuthUser(res.user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      setProfileSuccess(t.profileSaved);
    } catch (err) {
      const message = String(err?.message || '').trim();
      if (message === DISPLAY_NAME_TAKEN_MESSAGE) {
        setProfileError(t.profileDisplayNameTaken || message);
      } else {
        setProfileError(message || t.profileUpdateError);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const hydrateUserData = useCallback(async (token) => {
    const { data } = await userDataApi.get(token);
    if (!data) {
      userDataLoadedRef.current = true;
      return;
    }
    setNotes(Array.isArray(data.notes) ? data.notes.map((n) => normalizeNote(n, todayKey)) : []);
    setTasks(Array.isArray(data.tasks) ? data.tasks.map((task) => normalizeTask(task, todayKey)) : []);
    setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories.map(normalizeCategory) : DEFAULT_CATEGORIES);
    setLang(coerceLang(data.lang));
    setGoals(Array.isArray(data.goals) ? data.goals : []);
    setStudySessions(Array.isArray(data.studySessions) ? data.studySessions : []);
    setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
    setExams(Array.isArray(data.exams) ? data.exams : []);
    const pomodoroSnapshot = normalizePomodoroSnapshot(data.pomodoro, todayKey);
    setPomodoroConfig(pomodoroSnapshot.config);
    setPomodoroMode(pomodoroSnapshot.mode);
    setPomodoroSecondsLeft(pomodoroSnapshot.secondsLeft);
    setPomodoroRunning(false);
    setPomodoroCompleted(pomodoroSnapshot.completed);
    setPomodoroFocusStats(pomodoroSnapshot.stats);
    userDataLoadedRef.current = true;
  }, [todayKey]);

  const onAuthSuccess = async (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    try {
      await hydrateUserData(token);
    } catch {
      userDataLoadedRef.current = true;
    }
    setAuthReady(true);
  };

  const activateDevBypass = useCallback(() => {
    if (!DEV_AUTH_BYPASS_ENABLED) return;
    userDataLoadedRef.current = true;
    setAuthToken('');
    setAuthUser({ ...DEV_BYPASS_USER });
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!authToken) {
        if (DEV_AUTH_BYPASS_ENABLED) {
          setAuthUser((prev) => prev || { ...DEV_BYPASS_USER });
          userDataLoadedRef.current = true;
        }
        setAuthReady(true);
        return;
      }
      try {
        const res = await authApi.me(authToken);
        setAuthUser(res.user);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
        await hydrateUserData(authToken);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        setAuthToken('');
        setAuthUser(null);
      } finally {
        setAuthReady(true);
      }
    };
    bootstrapAuth();
  }, [authToken, hydrateUserData]);

  useEffect(() => {
    setChatHistory((prev) => {
      if (!prev.length) return [{ role: 'ai', content: t.aiWelcome }];
      return prev;
    });
  }, [t.aiWelcome]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const prevTodayKey = lastTodayKeyRef.current;
    if (prevTodayKey === todayKey) return;

    lastTodayKeyRef.current = todayKey;
    const nextTodayDate = parseDateKey(todayKey);

    setSelDate((prev) => (toDateKey(prev) === prevTodayKey ? nextTodayDate : prev));
    setCurMonth((prev) => (toDateKey(prev) === prevTodayKey ? nextTodayDate : prev));
    setNewTask((prev) => (prev.dueDateKey === prevTodayKey ? { ...prev, dueDateKey: todayKey } : prev));
    setNewSession((prev) => (prev.dateKey === prevTodayKey ? { ...prev, dateKey: todayKey } : prev));
    setNewGoal((prev) => {
      const prevDefaultTargetDateKey = addDays(prevTodayKey, 14);
      if (prev.targetDateKey !== prevDefaultTargetDateKey) return prev;
      return { ...prev, targetDateKey: addDays(todayKey, 14) };
    });
    setNewExam((prev) => {
      const prevDefaultExamDateKey = addDays(prevTodayKey, 21);
      if (prev.dateKey !== prevDefaultExamDateKey) return prev;
      return { ...prev, dateKey: addDays(todayKey, 21) };
    });
  }, [todayKey]);

  useEffect(() => {
    localStorage.setItem('bs3-theme', theme);
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, aiOpen]);

  useEffect(() => {
    if (authToken) return;
    try {
      const saved = JSON.parse(localStorage.getItem('bs3-workspace') || '{}');
      const l = localStorage.getItem('bs3-lang');
      if (l) setLang(coerceLang(l));
      if (saved.notes) setNotes(saved.notes.map((n) => normalizeNote(n, todayKey)));
      if (saved.tasks) setTasks(saved.tasks.map((task) => normalizeTask(task, todayKey)));
      if (saved.categories?.length) setCategories(saved.categories.map(normalizeCategory));
      if (Array.isArray(saved.goals)) setGoals(saved.goals);
      if (Array.isArray(saved.studySessions)) setStudySessions(saved.studySessions);
      if (Array.isArray(saved.revisions)) setRevisions(saved.revisions);
      if (Array.isArray(saved.exams)) setExams(saved.exams);
      const pomodoroSnapshot = normalizePomodoroSnapshot(saved.pomodoro, todayKey);
      setPomodoroConfig(pomodoroSnapshot.config);
      setPomodoroMode(pomodoroSnapshot.mode);
      setPomodoroSecondsLeft(pomodoroSnapshot.secondsLeft);
      setPomodoroRunning(false);
      setPomodoroCompleted(pomodoroSnapshot.completed);
      setPomodoroFocusStats(pomodoroSnapshot.stats);
    } catch {
      return undefined;
    }
    return undefined;
  }, [authToken, todayKey]);

  useEffect(() => {
    if (authToken) return;
    localStorage.setItem('bs3-lang', lang);
    localStorage.setItem('bs3-workspace', JSON.stringify({
      notes,
      tasks,
      categories,
      goals,
      studySessions,
      revisions,
      exams,
      pomodoro: {
        config: pomodoroConfig,
        mode: pomodoroMode,
        secondsLeft: pomodoroSecondsLeft,
        completed: pomodoroCompleted,
        stats: pomodoroFocusStats,
      },
    }));
  }, [authToken, lang, notes, tasks, categories, goals, studySessions, revisions, exams, pomodoroConfig, pomodoroMode, pomodoroSecondsLeft, pomodoroCompleted, pomodoroFocusStats]);

  useEffect(() => {
    if (!authToken || !authReady || !userDataLoadedRef.current) return;
    const timer = setTimeout(() => {
      userDataApi.save(authToken, {
        notes,
        tasks,
        categories,
        lang,
        goals,
        studySessions,
        revisions,
        exams,
        pomodoro: {
          config: pomodoroConfig,
          mode: pomodoroMode,
          secondsLeft: pomodoroSecondsLeft,
          completed: pomodoroCompleted,
          stats: pomodoroFocusStats,
        },
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [authToken, authReady, notes, tasks, categories, lang, goals, studySessions, revisions, exams, pomodoroConfig, pomodoroMode, pomodoroSecondsLeft, pomodoroCompleted, pomodoroFocusStats]);

  const calDays = useMemo(() => {
    const y = curMonth.getFullYear();
    const m = curMonth.getMonth();
    const total = new Date(y, m + 1, 0).getDate();
    const startDay = new Date(y, m, 1).getDay();
    const blanks = startDay === 0 ? 6 : startDay - 1;
    return [...Array(blanks).fill(null), ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))];
  }, [curMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selDate]);

  const addCategory = () => {
    const value = normalizeCategory(newCatInput.trim());
    if (!value || categories.includes(value)) return;
    setCategories((prev) => [...prev, value]);
    setNewCatInput('');
  };

  const removeCategory = (cat) => {
    if (cat === 'general') return;
    setCategories((prev) => prev.filter((c) => c !== cat));
    setTasks((prev) => prev.map((task) => task.subject === cat ? { ...task, subject: 'general', updatedAt: isoNow() } : task));
    setNotes((prev) => prev.map((note) => note.category === cat ? { ...note, category: 'general', updatedAt: isoNow() } : note));
  };

  const addTask = (e) => {
    e?.preventDefault();
    if (!newTask.title.trim()) return;
    const scheduledDateKey = plannerMode === 'today' ? todayKey : toDateKey(selDate);
    const base = {
      id: Date.now() + Math.random(),
      task: newTask.title.trim(),
      time: newTask.time || '09:00',
      completed: false,
      dateKey: scheduledDateKey,
      dueDateKey: normalizeDateKey(newTask.dueDateKey || scheduledDateKey),
      subject: normalizeCategory(newTask.subject || 'general'),
      priority: newTask.priority || 'medium',
      recurring: newTask.recurring || 'none',
      duration: Number(newTask.duration || 45),
      reminderAt: newTask.reminderAt || '',
      archived: false,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    setTasks((prev) => [normalizeTask(base, todayKey), ...prev]);
    setNewTask({
      title: '',
      time: '09:00',
      dueDateKey: scheduledDateKey,
      priority: 'medium',
      recurring: 'none',
      duration: 45,
      subject: 'general',
      reminderAt: '',
    });
  };

  const spawnRecurringFromTask = (task) => {
    const step = RECURRENCE_STEP[task.recurring] || 0;
    if (!step) return null;
    const nextDateKey = addDays(task.dateKey, step);
    return normalizeTask({
      ...task,
      id: Date.now() + Math.random(),
      completed: false,
      dateKey: nextDateKey,
      dueDateKey: task.dueDateKey ? addDays(task.dueDateKey, step) : nextDateKey,
      reminderAt: task.reminderAt ? `${nextDateKey}T${(task.time || '09:00').slice(0, 5)}` : '',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }, todayKey);
  };

  const toggleTask = (id) => {
    setTasks((prev) => {
      const target = prev.find((task) => task.id === id);
      if (!target) return prev;
      const toggledToCompleted = !target.completed;
      let next = prev.map((task) => task.id === id ? { ...task, completed: toggledToCompleted, updatedAt: isoNow() } : task);
      if (toggledToCompleted && target.recurring !== 'none') {
        const newRecurring = spawnRecurringFromTask(target);
        if (newRecurring) next = [newRecurring, ...next];
      }
      return next;
    });
  };

  const openTaskEdit = (task) => {
    setEditingTaskId(task.id);
    setTaskDraft({ ...task });
  };

  const saveTaskEdit = () => {
    if (!taskDraft || !String(taskDraft.task || '').trim()) return;
    setTasks((prev) => prev.map((task) => task.id === editingTaskId ? normalizeTask({ ...taskDraft, task: taskDraft.task.trim(), updatedAt: isoNow() }, todayKey) : task));
    setEditingTaskId(null);
    setTaskDraft(null);
  };

  const duplicateTask = (task) => {
    const clone = normalizeTask({
      ...task,
      id: Date.now() + Math.random(),
      task: `${getTaskTitle(task)} ${t.copySuffix}`,
      completed: false,
      dateKey: task.dateKey,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }, todayKey);
    setTasks((prev) => [clone, ...prev]);
  };

  const archiveTask = (id, archived = true) => {
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, archived, updatedAt: isoNow() } : task));
  };

  const quickMoveTask = (id, days) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id !== id) return task;
      return {
        ...task,
        dateKey: addDays(task.dateKey, days),
        dueDateKey: task.dueDateKey ? addDays(task.dueDateKey, days) : addDays(task.dateKey, days),
        updatedAt: isoNow(),
      };
    }));
  };

  const deleteTask = (id) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    setUndoState({ type: 'task', payload: target, createdAt: Date.now() });
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setSelectedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
  };

  const addNote = () => {
    if (!newNote.title.trim()) return;
    const tags = newNote.tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean);
    const attachmentSeed = newNote.attachmentInput.trim();
    const note = normalizeNote({
      id: Date.now() + Math.random(),
      title: newNote.title.trim(),
      content: newNote.content,
      category: newNote.category || 'general',
      tags,
      attachments: attachmentSeed ? [attachmentSeed] : [],
      versions: [],
      flashcards: [],
      pinned: false,
      archived: false,
      dateKey: toDateKey(selDate),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }, todayKey);
    setNotes((prev) => [note, ...prev]);
    setNewNote({ title: '', content: '', category: categories[0] || 'general', tagsInput: '', attachmentInput: '' });
    setSelectedNoteId(note.id);
  };

  const openNoteEdit = (note) => {
    setEditingNoteId(note.id);
    setSelectedNoteId(note.id);
    setNoteDraft({
      ...note,
      tagsInput: (note.tags || []).join(', '),
      attachmentInput: '',
    });
  };

  const saveNoteEdit = () => {
    if (!noteDraft || !String(noteDraft.title || '').trim()) return;
    setNotes((prev) => prev.map((note) => {
      if (note.id !== editingNoteId) return note;
      const nextVersion = {
        title: note.title,
        content: note.content,
        updatedAt: note.updatedAt,
      };
      const tags = String(noteDraft.tagsInput || '').split(',').map((tag) => tag.trim()).filter(Boolean);
      const attachments = [...(Array.isArray(note.attachments) ? note.attachments : [])];
      if (noteDraft.attachmentInput?.trim()) attachments.unshift(noteDraft.attachmentInput.trim());
      return normalizeNote({
        ...note,
        ...noteDraft,
        title: noteDraft.title.trim(),
        tags,
        attachments,
        versions: [nextVersion, ...(note.versions || [])].slice(0, 6),
        updatedAt: isoNow(),
      }, todayKey);
    }));
    setEditingNoteId(null);
    setNoteDraft(null);
  };

  const duplicateNote = (note) => {
    const clone = normalizeNote({
      ...note,
      id: Date.now() + Math.random(),
      title: `${getNoteTitle(note)} ${t.copySuffix}`,
      pinned: false,
      archived: false,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }, todayKey);
    setNotes((prev) => [clone, ...prev]);
  };

  const togglePinNote = (id) => {
    setNotes((prev) => prev.map((note) => note.id === id ? { ...note, pinned: !note.pinned, updatedAt: isoNow() } : note));
  };

  const archiveNote = (id, archived = true) => {
    setNotes((prev) => prev.map((note) => note.id === id ? { ...note, archived, updatedAt: isoNow() } : note));
  };

  const deleteNote = (id) => {
    const target = notes.find((note) => note.id === id);
    if (!target) return;
    setUndoState({ type: 'note', payload: target, createdAt: Date.now() });
    setNotes((prev) => prev.filter((note) => note.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const restoreVersion = (noteId, version) => {
    setNotes((prev) => prev.map((note) => {
      if (note.id !== noteId) return note;
      return {
        ...note,
        title: version.title,
        content: version.content,
        updatedAt: isoNow(),
      };
    }));
  };

  const convertNoteToFlashcards = (noteId) => {
    setNotes((prev) => prev.map((note) => {
      if (note.id !== noteId) return note;
      const flashcards = extractFlashcards(getNoteContent(note));
      if (!flashcards.length) return note;
      const nextReviewKey = addDays(todayKey, 2);
      setRevisions((old) => [
        ...flashcards.map((card) => ({
          id: Date.now() + Math.random(),
          noteId,
          subject: note.category || 'general',
          question: card.question,
          answer: card.answer,
          intervalDays: 2,
          nextReviewKey,
          lastReviewedKey: todayKey,
        })),
        ...old,
      ]);
      return { ...note, flashcards, updatedAt: isoNow() };
    }));
  };

  const undoDelete = () => {
    if (!undoState) return;
    if (undoState.type === 'task') {
      setTasks((prev) => [undoState.payload, ...prev]);
    }
    if (undoState.type === 'task-bulk') {
      const restored = Array.isArray(undoState.payload) ? undoState.payload : [];
      if (restored.length) {
        setTasks((prev) => [...restored, ...prev]);
      }
    }
    if (undoState.type === 'note') {
      setNotes((prev) => [undoState.payload, ...prev]);
    }
    setUndoState(null);
  };

  const toggleTaskSelect = (id) => {
    setSelectedTaskIds((prev) => prev.includes(id) ? prev.filter((taskId) => taskId !== id) : [...prev, id]);
  };

  const toggleBulkSelectMode = () => {
    setBulkSelectMode((prev) => {
      const next = !prev;
      if (!next) setSelectedTaskIds([]);
      return next;
    });
  };

  const bulkTaskAction = (action) => {
    if (!selectedTaskIds.length) return;
    if (action === 'complete') {
      setTasks((prev) => prev.map((task) => selectedTaskIds.includes(task.id) ? { ...task, completed: true, updatedAt: isoNow() } : task));
    }
    if (action === 'archive') {
      setTasks((prev) => prev.map((task) => selectedTaskIds.includes(task.id) ? { ...task, archived: true, updatedAt: isoNow() } : task));
    }
    if (action === 'delete') {
      const deleted = tasks.filter((task) => selectedTaskIds.includes(task.id));
      if (deleted.length) {
        setUndoState({ type: 'task-bulk', payload: deleted, createdAt: Date.now() });
      }
      setTasks((prev) => prev.filter((task) => !selectedTaskIds.includes(task.id)));
    }
    if (action === 'tomorrow') {
      setTasks((prev) => prev.map((task) => {
        if (!selectedTaskIds.includes(task.id)) return task;
        return {
          ...task,
          dateKey: addDays(task.dateKey, 1),
          dueDateKey: task.dueDateKey ? addDays(task.dueDateKey, 1) : addDays(task.dateKey, 1),
          updatedAt: isoNow(),
        };
      }));
    }
    if (action === 'nextWeek') {
      setTasks((prev) => prev.map((task) => {
        if (!selectedTaskIds.includes(task.id)) return task;
        return {
          ...task,
          dateKey: addDays(task.dateKey, 7),
          dueDateKey: task.dueDateKey ? addDays(task.dueDateKey, 7) : addDays(task.dateKey, 7),
          updatedAt: isoNow(),
        };
      }));
    }
    setSelectedTaskIds([]);
  };

  useEffect(() => {
    if (!undoState) return;
    const timer = setTimeout(() => setUndoState(null), 6000);
    return () => clearTimeout(timer);
  }, [undoState]);

  useEffect(() => {
    if (pomodoroFocusStats.dateKey === todayKey) return;
    setPomodoroFocusStats({ dateKey: todayKey, focusMinutes: 0 });
  }, [pomodoroFocusStats.dateKey, todayKey]);

  const advancePomodoroPhase = useCallback((countCompletedFocus = true) => {
    const wasFocus = pomodoroMode === 'focus';
    let nextCompleted = pomodoroCompleted;

    if (wasFocus && countCompletedFocus) {
      nextCompleted += 1;
      setPomodoroCompleted(nextCompleted);
      setPomodoroFocusStats((prev) => ({
        dateKey: todayKey,
        focusMinutes: (prev.dateKey === todayKey ? prev.focusMinutes : 0) + pomodoroConfig.focusMinutes,
      }));
    }

    const nextMode = wasFocus
      ? (nextCompleted % pomodoroConfig.cyclesBeforeLongBreak === 0 ? 'long' : 'short')
      : 'focus';

    setPomodoroMode(nextMode);
    setPomodoroSecondsLeft(pomodoroSecondsByMode[nextMode]);

    const autoStart = nextMode === 'focus' ? pomodoroConfig.autoStartFocus : pomodoroConfig.autoStartBreaks;
    setPomodoroRunning(autoStart);

    if (countCompletedFocus && pomodoroConfig.soundEnabled) {
      playPomodoroBell();
    }
  }, [pomodoroMode, pomodoroCompleted, pomodoroConfig, pomodoroSecondsByMode, playPomodoroBell, todayKey]);

  useEffect(() => {
    if (!pomodoroRunning) return undefined;
    const timer = setInterval(() => {
      setPomodoroSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pomodoroRunning]);

  useEffect(() => {
    if (!pomodoroRunning || pomodoroSecondsLeft > 0) return;
    advancePomodoroPhase(true);
  }, [pomodoroRunning, pomodoroSecondsLeft, advancePomodoroPhase]);

  useEffect(() => {
    if (pomodoroRunning) return;
    const maxSeconds = pomodoroSecondsByMode[pomodoroMode];
    setPomodoroSecondsLeft((prev) => {
      if (!Number.isFinite(prev) || prev <= 0) return maxSeconds;
      return Math.min(prev, maxSeconds);
    });
  }, [pomodoroRunning, pomodoroSecondsByMode, pomodoroMode]);

  const addGoal = (e) => {
    e?.preventDefault();
    if (!newGoal.title.trim()) return;
    const item = {
      id: Date.now() + Math.random(),
      title: newGoal.title.trim(),
      subject: newGoal.subject || 'general',
      targetDateKey: normalizeDateKey(newGoal.targetDateKey, parseDateKey(addDays(todayKey, 14))),
      completed: false,
      createdAt: isoNow(),
    };
    setGoals((prev) => [item, ...prev]);
    setNewGoal({ title: '', subject: newGoal.subject, targetDateKey: addDays(todayKey, 14) });
  };

  const addStudySession = (e) => {
    e?.preventDefault();
    const session = {
      id: Date.now() + Math.random(),
      subject: newSession.subject || 'general',
      duration: Number(newSession.duration || 60),
      dateKey: normalizeDateKey(newSession.dateKey, now),
      focus: Number(newSession.focus || 4),
      note: newSession.note || '',
      createdAt: isoNow(),
    };
    setStudySessions((prev) => [session, ...prev]);
    setNewSession({ subject: newSession.subject, duration: 60, dateKey: todayKey, focus: 4, note: '' });
  };

  const setPomodoroModeAndReset = (mode) => {
    const safeMode = normalizePomodoroMode(mode);
    setPomodoroMode(safeMode);
    setPomodoroSecondsLeft(pomodoroSecondsByMode[safeMode]);
    setPomodoroRunning(false);
  };

  const updatePomodoroConfig = (key, value) => {
    setPomodoroConfig((prev) => {
      const next = normalizePomodoroConfig({ ...prev, [key]: value });
      const durationKeyChanged = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes'].includes(key);
      if (!pomodoroRunning && durationKeyChanged) {
        const nextSecondsByMode = getPomodoroSecondsByMode(next);
        setPomodoroSecondsLeft(nextSecondsByMode[pomodoroMode]);
      }
      return next;
    });
  };

  const togglePomodoro = () => {
    if (pomodoroRunning) {
      setPomodoroRunning(false);
      return;
    }
    if (pomodoroSecondsLeft <= 0) {
      setPomodoroSecondsLeft(pomodoroSecondsByMode[pomodoroMode]);
    }
    setPomodoroRunning(true);
  };

  const resetPomodoro = () => {
    setPomodoroSecondsLeft(pomodoroSecondsByMode[pomodoroMode]);
    setPomodoroRunning(false);
  };

  const skipPomodoroPhase = () => {
    setPomodoroRunning(false);
    advancePomodoroPhase(false);
  };

  const addExam = (e) => {
    e?.preventDefault();
    if (!newExam.title.trim()) return;
    const exam = {
      id: Date.now() + Math.random(),
      title: newExam.title.trim(),
      subject: newExam.subject || 'general',
      dateKey: normalizeDateKey(newExam.dateKey, parseDateKey(addDays(todayKey, 21))),
      createdAt: isoNow(),
    };
    setExams((prev) => [exam, ...prev]);
    setNewExam({ title: '', subject: newExam.subject, dateKey: addDays(todayKey, 21) });
  };

  const reviewRevision = (id, remembered) => {
    setRevisions((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const nextInterval = remembered ? Math.min((item.intervalDays || 2) * 2, 21) : 1;
      return {
        ...item,
        intervalDays: nextInterval,
        lastReviewedKey: todayKey,
        nextReviewKey: addDays(todayKey, nextInterval),
      };
    }));
  };

  const subjectProgress = useMemo(() => {
    return categories.map((subject) => {
      const subjectTasks = tasks.filter((task) => task.subject === subject && !task.archived);
      const done = subjectTasks.filter((task) => task.completed).length;
      const completion = subjectTasks.length ? Math.round((done / subjectTasks.length) * 100) : 0;
      const minutes = studySessions.filter((session) => session.subject === subject).reduce((sum, s) => sum + Number(s.duration || 0), 0);
      return {
        subject,
        completion,
        minutes,
        score: completion * 0.6 + Math.min(minutes, 240) * 0.4,
      };
    });
  }, [categories, tasks, studySessions]);

  const laggingSubjects = useMemo(() => subjectProgress.slice().sort((a, b) => a.score - b.score).slice(0, 2), [subjectProgress]);

  const todayTasks = tasks.filter((task) => task.dateKey === todayKey && !task.archived);
  const completedToday = todayTasks.filter((task) => task.completed).length;
  const progress = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  const overdueTasks = useMemo(() => tasks.filter((task) => !task.archived && !task.completed && task.dueDateKey < todayKey), [tasks, todayKey]);

  const reviewDueItems = useMemo(() => revisions.filter((item) => item.nextReviewKey <= todayKey), [revisions, todayKey]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.archived && !task.completed && task.dateKey > todayKey)
      .sort((a, b) => (a.dateKey + a.time).localeCompare(b.dateKey + b.time))
      .slice(0, 6);
  }, [tasks, todayKey]);

  const upcomingExams = useMemo(() => {
    return exams
      .map((exam) => ({ ...exam, daysLeft: Math.ceil((parseDateKey(exam.dateKey) - parseDateKey(todayKey)) / 86400000) }))
      .filter((exam) => exam.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [exams, todayKey]);

  const nextTaskRecommendation = useMemo(() => {
    const queue = tasks
      .filter((task) => !task.archived && !task.completed)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aOverdue = a.dueDateKey < todayKey ? 0 : 1;
        const bOverdue = b.dueDateKey < todayKey ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
        return (a.dueDateKey + a.time).localeCompare(b.dueDateKey + b.time);
      });
    return queue[0] || null;
  }, [tasks, todayKey]);

  const weeklyStats = useMemo(() => {
    const currentWeekStart = startOfWeek(now);
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(currentWeekStart.getDate() - 7);

    const inWeek = (dateKey, startDate) => {
      const date = parseDateKey(dateKey);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return date >= startDate && date <= endDate;
    };

    const thisWeekDone = tasks.filter((task) => task.completed && inWeek(task.dateKey, currentWeekStart)).length;
    const prevWeekDone = tasks.filter((task) => task.completed && inWeek(task.dateKey, prevWeekStart)).length;
    const thisWeekMinutes = studySessions.filter((s) => inWeek(s.dateKey, currentWeekStart)).reduce((sum, s) => sum + Number(s.duration || 0), 0);
    const prevWeekMinutes = studySessions.filter((s) => inWeek(s.dateKey, prevWeekStart)).reduce((sum, s) => sum + Number(s.duration || 0), 0);

    return {
      thisWeekDone,
      prevWeekDone,
      thisWeekMinutes,
      prevWeekMinutes,
      taskDelta: thisWeekDone - prevWeekDone,
      minuteDelta: thisWeekMinutes - prevWeekMinutes,
    };
  }, [tasks, studySessions, now]);

  const nextWeekConflicts = useMemo(() => {
    const nextWeekStart = startOfWeek(now);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const buckets = {};
    tasks.forEach((task) => {
      if (task.archived || task.completed) return;
      const date = parseDateKey(task.dateKey);
      const end = new Date(nextWeekStart);
      end.setDate(nextWeekStart.getDate() + 6);
      if (date < nextWeekStart || date > end) return;
      buckets[task.dateKey] = (buckets[task.dateKey] || 0) + Number(task.duration || 0);
    });
    return Object.entries(buckets)
      .filter(([, minutes]) => minutes >= 240)
      .map(([dateKey, minutes]) => ({ dateKey, minutes }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [tasks, now]);

  const todayModeDateKey = toDateKey(selDate);

  const baseVisibleTasks = useMemo(() => {
    let list = tasks.filter((task) => !task.archived);

    if (plannerMode === 'today') {
      list = list.filter((task) => task.dateKey === todayKey);
    }
    if (plannerMode === 'week') {
      list = list.filter((task) => isSameWeek(task.dateKey, selDate));
    }
    if (plannerMode === 'upcoming') {
      list = list.filter((task) => task.dateKey >= todayKey && task.dateKey <= addDays(todayKey, 14));
    }
    if (plannerMode === 'day') {
      list = list.filter((task) => task.dateKey === todayModeDateKey);
    }

    if (taskFilters.status === 'open') list = list.filter((task) => !task.completed);
    if (taskFilters.status === 'done') list = list.filter((task) => task.completed);
    if (taskFilters.priority !== 'all') list = list.filter((task) => task.priority === taskFilters.priority);
    if (taskFilters.subject !== 'all') list = list.filter((task) => task.subject === taskFilters.subject);
    if (taskFilters.overdueOnly) list = list.filter((task) => !task.completed && task.dueDateKey < todayKey);
    if (taskFilters.query.trim()) {
      const q = taskFilters.query.toLowerCase();
      list = list.filter((task) => getTaskTitle(task).toLowerCase().includes(q));
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (taskFilters.sort === 'dueAsc') {
      list = list.slice().sort((a, b) => (a.dueDateKey + a.time).localeCompare(b.dueDateKey + b.time));
    }
    if (taskFilters.sort === 'priority') {
      list = list.slice().sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }
    if (taskFilters.sort === 'updated') {
      list = list.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    if (taskFilters.sort === 'duration') {
      list = list.slice().sort((a, b) => Number(b.duration) - Number(a.duration));
    }

    return list;
  }, [tasks, plannerMode, todayKey, selDate, todayModeDateKey, taskFilters, getTaskTitle]);

  const tasksBySubject = useMemo(() => {
    const grouped = {};
    baseVisibleTasks.forEach((task) => {
      if (!grouped[task.subject]) grouped[task.subject] = [];
      grouped[task.subject].push(task);
    });
    return grouped;
  }, [baseVisibleTasks]);

  const taskFilterCount = useMemo(() => {
    let count = 0;
    if (taskFilters.status !== 'all') count += 1;
    if (taskFilters.priority !== 'all') count += 1;
    if (taskFilters.subject !== 'all') count += 1;
    if (taskFilters.sort !== 'dueAsc') count += 1;
    if (taskFilters.overdueOnly) count += 1;
    if (taskFilters.query.trim()) count += 1;
    return count;
  }, [taskFilters]);

  const plannerScopeLabel = useMemo(() => {
    const formatScopeDate = (dateKey) => formatDateDmy(parseDateKey(dateKey), SHORT_DATE_OPTIONS);

    if (plannerMode === 'week') {
      const weekStartKey = toDateKey(startOfWeek(selDate));
      const weekEndKey = addDays(weekStartKey, 6);
      return `${t.thisWeek}: ${formatScopeDate(weekStartKey)} - ${formatScopeDate(weekEndKey)}`;
    }

    if (plannerMode === 'upcoming') {
      const upcomingEndKey = addDays(todayKey, 14);
      return `${t.upcoming}: ${formatScopeDate(todayKey)} - ${formatScopeDate(upcomingEndKey)}`;
    }

    if (plannerMode === 'day') {
      return `${t.selectedDay}: ${formatScopeDate(toDateKey(selDate))}`;
    }

    return `${t.today}: ${formatScopeDate(todayKey)}`;
  }, [plannerMode, selDate, t.selectedDay, t.thisWeek, t.today, t.upcoming, todayKey]);

  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach((note) => (note.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [notes]);

  const displayedNotes = useMemo(() => {
    let list = notes.filter((note) => note.archived === noteFilters.archived);
    if (noteFilters.category !== 'all') list = list.filter((note) => note.category === noteFilters.category);
    if (noteFilters.tag !== 'all') list = list.filter((note) => (note.tags || []).includes(noteFilters.tag));
    if (noteFilters.search.trim()) {
      const q = noteFilters.search.toLowerCase();
      list = list.filter((note) =>
        getNoteTitle(note).toLowerCase().includes(q) ||
        getNoteContent(note).toLowerCase().includes(q),
      );
    }

    if (noteFilters.sort === 'updated') {
      list = list.slice().sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    }
    if (noteFilters.sort === 'title') {
      list = list.slice().sort((a, b) => getNoteTitle(a).localeCompare(getNoteTitle(b)));
    }

    return list;
  }, [notes, noteFilters, getNoteContent, getNoteTitle]);

  const selectedNote = displayedNotes.find((note) => note.id === selectedNoteId)
    || notes.find((note) => note.id === selectedNoteId)
    || displayedNotes[0]
    || null;

  useEffect(() => {
    if (!selectedNoteId && displayedNotes.length) {
      setSelectedNoteId(displayedNotes[0].id);
    }
  }, [displayedNotes, selectedNoteId]);

  const handleAI = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const systemPrompt = `You are BlueStudy AI, a study assistant. Reply in ${t.aiReplyLang}.
Today: ${formatDateFromKey(todayKey)}.
Open tasks: ${JSON.stringify(tasks.filter((task) => !task.completed).slice(0, 15).map((task) => ({
  title: getTaskTitle(task), date: task.dateKey, due: task.dueDateKey, priority: task.priority,
})))}

Return plain JSON only:
{"reply":"text","action":"CHAT|ADD_TASK|ADD_NOTE","newTasks":[{"title":"","time":"HH:MM","dateString":"YYYY-MM-DD","dueDate":"YYYY-MM-DD","priority":"low|medium|high"}],"newNotes":[{"title":"","content":"","category":""}]}`;

      const data = await aiApi.chat({
        systemPrompt,
        userMessage: userMsg,
      });
      const raw = data.content?.[0]?.text || '{}';
      let result;
      try {
        result = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch {
        result = { reply: raw, action: 'CHAT' };
      }

      setChatHistory((prev) => [...prev, { role: 'ai', content: result.reply || t.genericError }]);

      if (result.action === 'ADD_TASK' && result.newTasks?.length) {
        setTasks((prev) => [
          ...result.newTasks.map((task) => normalizeTask({
            id: Date.now() + Math.random(),
            task: task.title,
            time: task.time || '09:00',
            dateKey: normalizeDateKey(task.dateString, now),
            dueDateKey: normalizeDateKey(task.dueDate || task.dateString, now),
            priority: task.priority || 'medium',
            recurring: 'none',
            duration: 45,
            subject: 'general',
            completed: false,
            archived: false,
            createdAt: isoNow(),
            updatedAt: isoNow(),
          }, todayKey)),
          ...prev,
        ]);
      }

      if (result.action === 'ADD_NOTE' && result.newNotes?.length) {
        setNotes((prev) => [
          ...result.newNotes.map((note) => normalizeNote({
            id: Date.now() + Math.random(),
            title: note.title,
            content: note.content,
            category: categories.includes(normalizeCategory(note.category)) ? normalizeCategory(note.category) : 'general',
            tags: [],
            pinned: false,
            archived: false,
            dateKey: todayKey,
            createdAt: isoNow(),
            updatedAt: isoNow(),
          }, todayKey)),
          ...prev,
        ]);
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'ai', content: err?.message || t.connectionError }]);
    } finally {
      setAiLoading(false);
    }
  };

  const currentHour = now.getHours();
  const timeGreeting = getTimeGreeting(currentHour, t);
  const currentTimeLabel = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pomodoroModeLabel = {
    focus: t.pomodoroFocus,
    short: t.pomodoroShortBreak,
    long: t.pomodoroLongBreak,
  };
  const pomodoroTotalSeconds = pomodoroSecondsByMode[pomodoroMode] || pomodoroSecondsByMode.focus;
  const pomodoroProgress = pomodoroTotalSeconds
    ? Math.min(100, Math.max(0, Math.round(((pomodoroTotalSeconds - pomodoroSecondsLeft) / pomodoroTotalSeconds) * 100)))
    : 0;
  const tutorialProgress = tutorialSteps.length
    ? Math.round(((tutorialStep + 1) / tutorialSteps.length) * 100)
    : 0;
  const tutorialStepData = tutorialSteps[tutorialStep] || tutorialSteps[0] || { title: '', body: '' };
  const tutorialTooltipStyle = tutorialRect
    ? {
      top: tutorialTooltip.top,
      left: tutorialTooltip.left,
      transform: tutorialTooltip.placement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
    }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  const pomodoroTodayFocusMinutes = pomodoroFocusStats.dateKey === todayKey ? pomodoroFocusStats.focusMinutes : 0;
  const completedInCurrentCycle = pomodoroCompleted % pomodoroConfig.cyclesBeforeLongBreak;
  const pomodoroUntilLongBreak = completedInCurrentCycle === 0
    ? pomodoroConfig.cyclesBeforeLongBreak
    : pomodoroConfig.cyclesBeforeLongBreak - completedInCurrentCycle;

  const toggleTheme = () => setTheme((prev) => prev === 'dark' ? 'light' : 'dark');
  const openTutorial = () => {
    setTutorialStep(0);
    setTutorialRect(null);
    setTutorialOpen(true);
  };
  const closeTutorial = () => {
    setTutorialOpen(false);
    setTutorialRect(null);
  };
  const nextTutorialStep = () => {
    if (!tutorialSteps.length || tutorialStep >= tutorialSteps.length - 1) {
      setTutorialOpen(false);
      return;
    }
    setTutorialStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
  };
  const prevTutorialStep = () => setTutorialStep((prev) => Math.max(prev - 1, 0));
  const hasAuthSession = Boolean(authUser) && (Boolean(authToken) || DEV_AUTH_BYPASS_ENABLED);
  const isLocalDevMode = hasAuthSession && !authToken;

  useEffect(() => {
    if (!tutorialOpen) return undefined;
    const step = tutorialSteps[tutorialStep];
    if (step?.view && step.view !== view) {
      setView(step.view);
    }
    return undefined;
  }, [tutorialOpen, tutorialStep, tutorialSteps, view]);

  useEffect(() => {
    if (!tutorialOpen) return undefined;
    const step = tutorialSteps[tutorialStep];
    if (!step?.target) return undefined;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [tutorialOpen, tutorialStep, tutorialSteps, view]);

  useEffect(() => {
    if (!tutorialOpen) return undefined;
    let frame = 0;
    const step = tutorialSteps[tutorialStep];
    const selector = step?.target ? `[data-tutorial="${step.target}"]` : null;

    const update = () => {
      if (!selector) {
        setTutorialRect(null);
        return;
      }
      const el = document.querySelector(selector);
      if (!el) {
        setTutorialRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const padding = 6;
      setTutorialRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const centerX = rect.left + rect.width / 2;
      const canPlaceBottom = rect.bottom + tooltipHeight + 20 < viewportH;
      const placement = canPlaceBottom ? 'bottom' : 'top';
      const top = placement === 'bottom' ? rect.bottom + 16 : rect.top - 16;
      const minLeft = 16 + tooltipWidth / 2;
      const maxLeft = Math.max(minLeft, viewportW - 16 - tooltipWidth / 2);
      const left = Math.min(Math.max(centerX, minLeft), maxLeft);
      setTutorialTooltip({ top, left, placement });
    };

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [tutorialOpen, tutorialStep, tutorialSteps, view]);

  useEffect(() => {
    if (!authReady) return undefined;
    if (!hasAuthSession) {
      preloginSeenRef.current = true;
      return undefined;
    }
    if (!preloginSeenRef.current) return undefined;
    setMainEnter(true);
    preloginSeenRef.current = false;
    const timer = setTimeout(() => setMainEnter(false), 1200);
    return () => clearTimeout(timer);
  }, [authReady, hasAuthSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const supported = isPushSupported();
    setPushSupported(supported);
    if (supported && typeof Notification !== 'undefined') {
      setPushPermission(Notification.permission || 'default');
    }
    setPushStandalone(isStandaloneMode());
    setPushIos(isIosDevice());

    const mq = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayMode = () => setPushStandalone(isStandaloneMode());
    mq?.addEventListener?.('change', handleDisplayMode);
    return () => mq?.removeEventListener?.('change', handleDisplayMode);
  }, []);

  useEffect(() => {
    if (!pushSupported) return undefined;
    let active = true;
    const loadSubscription = async () => {
      try {
        const subscription = await getExistingSubscription();
        if (!active) return;
        if (subscription && authToken) {
          await pushApi.subscribe(authToken, subscription).catch(() => {});
        }
        setPushSubscribed(Boolean(subscription));
      } catch {
        if (active) setPushSubscribed(false);
      }
    };
    loadSubscription();
    return () => {
      active = false;
    };
  }, [pushSupported, authToken]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #EFF6FF 100%)' }}>
        <div className="px-5 py-3 rounded-2xl bg-white border border-sky-100 text-slate-600 font-semibold shadow-sm">
          {t.loadingSession}
        </div>
      </div>
    );
  }

  if (!hasAuthSession) {
    return (
      <AuthScreen
        onAuthSuccess={onAuthSuccess}
        canBypassAuth={DEV_AUTH_BYPASS_ENABLED}
        onBypass={activateDevBypass}
        text={t}
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onLangChange={(nextLang) => setLang(coerceLang(nextLang))}
      />
    );
  }

  const selectedNoteBacklinks = selectedNote ? getBacklinkTitles(selectedNote, notes, t.untitledNote) : [];

  const undoLabel = undoState?.type?.includes('task') ? t.undoTaskDeleted : t.undoNoteDeleted;

  return (
    <div className={`mesh-bg ${theme === 'dark' ? 'theme-dark text-slate-100' : 'theme-light text-slate-800'} ${mainEnter ? 'layout-enter' : ''} min-h-screen md:pl-[84px] pb-24 md:pb-0 relative overflow-x-hidden`}>
      <style>{FONTS + STYLES}</style>

      <nav className="
        fixed z-50
        bottom-4 left-1/2 -translate-x-1/2
        md:left-0 md:top-0 md:bottom-0 md:translate-x-0 md:h-full
        w-[92%] md:w-[84px]
        flex md:flex-col items-center justify-between
        py-2.5 px-4 md:py-8 md:px-0
        rounded-2xl md:rounded-none
        border border-white/10 md:border-r md:border-y-0 md:border-l-0
        shadow-2xl md:shadow-none"
        style={{ background: 'linear-gradient(170deg, #0A1628 0%, #0F2244 100%)' }}
      >
        <div className="hidden md:flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #38BDF8, #1D4ED8)' }}>
            <Zap size={19} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="syne text-[9px] font-bold text-sky-400 tracking-[3px] uppercase">{t.brandShort}</span>
        </div>

        <div className="flex md:flex-col gap-1.5 items-center">
          {workflowNav.map((item) => {
            const IconCmp = item.icon;
            return (
              <button
                key={item.id}
                data-tutorial={`nav-${item.id}`}
                onClick={() => setView(item.id)}
                title={item.label}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group relative ${view === item.id ? 'nav-active text-white' : 'text-slate-400 hover:bg-white/10 hover:text-sky-300'}`}
              >
                <IconCmp size={19} strokeWidth={view === item.id ? 2.5 : 2} />
                <span className="text-[9px] mt-1 font-semibold hidden md:block tracking-wide">{item.label}</span>
                <span className="absolute left-[calc(100%+10px)] px-2.5 py-1 bg-[#0A1628] text-white text-xs rounded-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap hidden md:block
                  shadow-xl border border-white/10 pointer-events-none">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={openProfileEditor}
          className="hidden md:block group relative"
          aria-label={t.profileEdit}
          title={t.profileEdit}
        >
          <img
            src={avatarSrc}
            className="w-9 h-9 rounded-full border-2 border-sky-500/30 object-cover transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-sky-300"
            alt={t.avatarAlt}
          />
          <span className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#0A1628] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
            {t.profileEdit}
          </span>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 pb-8 relative z-10">
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-[11px] font-bold text-sky-500 uppercase tracking-[2.5px] mb-1">
              {formatDate(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="syne text-2xl md:text-[2rem] font-bold text-[#0A1628] leading-tight">
              {view === 'today' ? timeGreeting : workflowNav.find((item) => item.id === view)?.label}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t.workflowLegend}</p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
            <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 rounded-full border border-sky-100/80 bg-white/70 px-3 py-1.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[2px] text-sky-500/70">{t.currentTime}</p>
                <p className="text-sm font-bold text-slate-700">{currentTimeLabel}</p>
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-slate-600 max-w-[160px] truncate">{authUser.name}</p>
                <div className="relative">
                  <img src={avatarSrc} alt={t.avatarAlt} className="w-8 h-8 rounded-full border border-sky-200 object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap lg:justify-end">
              <button onClick={openTutorial} data-tutorial="tutorial-button" className="px-3 py-2 glass rounded-xl text-xs font-semibold inline-flex items-center gap-1.5">
                <GraduationCap size={14} className="text-sky-500" />
                {t.tutorialLabel}
              </button>
              <button
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label={`${t.theme}: ${theme === 'dark' ? t.dark : t.light}`}
                className="glass rounded-full px-2 py-1 text-xs font-semibold inline-flex items-center gap-2"
              >
                <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-sky-500/80' : 'bg-slate-300/80'}`}>
                  <span className={`absolute left-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
                    {theme === 'dark'
                      ? <Moon size={12} className="text-indigo-600" />
                      : <Sun size={12} className="text-amber-500" />}
                  </span>
                </span>
                <span>{t.theme}: {theme === 'dark' ? t.dark : t.light}</span>
              </button>
              <Languages size={16} className="text-sky-500" />
              <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language} className="px-2.5 py-2 glass rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400/30">
                {Object.entries(LANG_META).map(([k, v]) => <option key={k} value={k}>{v.flag} {v.name}</option>)}
              </select>
              <button onClick={logout} className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}>
                {t.logout}
              </button>
            </div>
          </div>
        </header>

        {profileOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeProfileEditor} />
            <div
              className="relative w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl border border-sky-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold text-sky-500 uppercase tracking-[2.5px]">{t.profileTitle}</p>
                  <h2 className="syne text-2xl text-[#0A1628]">{t.profileEdit}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t.profileSubtitle}</p>
                </div>
                <button type="button" onClick={closeProfileEditor} className="p-2 rounded-lg hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={saveProfile} className="mt-5 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
                <div className="flex flex-col items-center md:items-start gap-3">
                  <div className="w-28 h-28 rounded-full overflow-hidden border border-sky-100 bg-slate-100">
                    <img src={profileAvatarSrc} alt={t.avatarAlt} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-full space-y-2">
                    <label className="text-xs font-semibold text-slate-500">{t.profileAvatarLabel}</label>
                    <input
                      value={profileDraft.picture}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, picture: e.target.value }))}
                      placeholder={t.profileAvatarPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <div>
                      <label className="text-xs font-semibold text-slate-500">{t.profileAvatarUpload}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-200"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">{t.profileAvatarUploadHint}</p>
                      {profileAvatarError && <p className="text-[11px] text-rose-500 mt-1">{profileAvatarError}</p>}
                    </div>
                    <p className="text-[11px] text-slate-500">{t.profileAvatarHint}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={generateProfileAvatar}
                        className="px-2.5 py-1.5 text-[11px] rounded-lg bg-sky-100 text-sky-700 font-semibold"
                      >
                        {t.profileAvatarGenerate}
                      </button>
                      <button
                        type="button"
                        onClick={clearProfileAvatar}
                        className="px-2.5 py-1.5 text-[11px] rounded-lg bg-slate-100 text-slate-600 font-semibold"
                      >
                        {t.profileAvatarRemove}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t.profileNameLabel}</label>
                    <input
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={t.profileNamePlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      maxLength={40}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">{t.profileEmailLabel}</label>
                      <input
                        value={authUser?.email || '-'}
                        readOnly
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">{t.profileProviderLabel}</label>
                      <input
                        value={authUser?.provider || 'local'}
                        readOnly
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">{t.profileCreatedLabel}</label>
                    <input
                      value={formatDateTime(authUser?.createdAt)}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-600">{t.pushTitle}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{t.pushSubtitle}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${pushSubscribed ? 'bg-emerald-100 text-emerald-700' : pushPermission === 'denied' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {pushStatusLabel}
                      </span>
                    </div>

                    {!pushSupported ? (
                      <p className="text-xs text-slate-500">{t.pushNotSupported}</p>
                    ) : (
                      <>
                        {pushIos && !pushStandalone && (
                          <p className="text-xs text-amber-600">{t.pushStandaloneHint}</p>
                        )}
                        {!authToken && (
                          <p className="text-xs text-amber-600">{t.pushAuthRequired}</p>
                        )}
                        {pushPermission === 'denied' && (
                          <p className="text-xs text-rose-600">{t.pushPermissionDenied}</p>
                        )}
                        {pushPermission === 'default' && !pushSubscribed && !pushError && (
                          <p className="text-xs text-slate-500">{t.pushPermissionDismissed}</p>
                        )}
                        {pushError && <p className="text-xs text-rose-600">{pushError}</p>}
                        {pushInfo && <p className="text-xs text-emerald-600">{pushInfo}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={enablePushNotifications}
                            disabled={pushBusy || pushSubscribed || !authToken}
                            className="px-3 py-1.5 text-[11px] rounded-lg bg-sky-100 text-sky-700 font-semibold disabled:opacity-60"
                          >
                            {t.pushEnable}
                          </button>
                          <button
                            type="button"
                            onClick={disablePushNotifications}
                            disabled={pushBusy || !pushSubscribed}
                            className="px-3 py-1.5 text-[11px] rounded-lg bg-slate-200 text-slate-700 font-semibold disabled:opacity-60"
                          >
                            {t.pushDisable}
                          </button>
                          <button
                            type="button"
                            onClick={sendTestPush}
                            disabled={pushBusy || !pushSubscribed}
                            className="px-3 py-1.5 text-[11px] rounded-lg bg-emerald-100 text-emerald-700 font-semibold disabled:opacity-60"
                          >
                            {t.pushTest}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {isLocalDevMode && (
                    <p className="text-[11px] text-amber-600">{t.profileLocalDevNotice}</p>
                  )}
                  {profileError && <p className="text-sm text-rose-500">{profileError}</p>}
                  {profileSuccess && <p className="text-sm text-emerald-600">{profileSuccess}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeProfileEditor}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
                    >
                      {profileSaving ? t.saving : t.save}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'today' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 anim-tab">
            <div data-tutorial="today-dashboard" className="xl:col-span-2 rounded-3xl p-7 md:p-9 text-white relative overflow-hidden shadow-2xl shadow-blue-950/25" style={{ background: 'linear-gradient(145deg, #0A1628 0%, #0F2A5F 60%, #0F3D7A 100%)' }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                  <span className="text-[10px] font-bold text-sky-300 uppercase tracking-[2px]">{t.reflectActionDashboard}</span>
                </div>
                <h2 className="syne text-5xl font-bold leading-none">{progress}<span className="text-2xl text-blue-300">%</span></h2>
                <p className="text-sky-200 text-sm mt-1 mb-5">{completedToday}/{todayTasks.length} {t.reflectTodayTaskSuffix}</p>

                <div className="w-full h-2 rounded-full overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #38BDF8, #06B6D4)' }} />
                </div>

                <div className="flex gap-3">
                  <Stat label={t.statOverdue} value={overdueTasks.length} />
                  <Stat label={t.statReviewDue} value={reviewDueItems.length} />
                  <Stat label={t.statExamSoon} value={upcomingExams.length ? `${upcomingExams[0].daysLeft}d` : '-'} />
                </div>
              </div>
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />
              <div className="absolute right-12 -bottom-10 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />
            </div>

            <div data-tutorial="today-decision" className="glass rounded-3xl p-5 space-y-3 shadow-sm">
              <h3 className="syne font-bold text-[#0A1628]">{t.reflectDecisionTitle}</h3>
              <div className="rounded-xl border border-sky-100 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">{t.reflectWhatFirst}</p>
                {nextTaskRecommendation ? (
                  <>
                    <p className="font-semibold text-sm mt-1">{getTaskTitle(nextTaskRecommendation)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.dueLabel} {formatDateFromKey(nextTaskRecommendation.dueDateKey)} · {priorityLabel(nextTaskRecommendation.priority)}</p>
                    <button onClick={() => setView('plan')} className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-sky-100 text-sky-700 font-semibold">{t.reflectOpenPlanner}</button>
                  </>
                ) : <p className="text-sm text-slate-500 mt-1">{t.reflectNoOpenTasks}</p>}
              </div>

              <div className="rounded-xl border border-rose-100 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">{t.reflectOverdueTasks}</p>
                <p className="text-2xl syne">{overdueTasks.length}</p>
                <button onClick={() => { setView('plan'); setTaskFilters((prev) => ({ ...prev, overdueOnly: true })); }} className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 font-semibold">{t.reflectHandleNow}</button>
              </div>
            </div>

            <div data-tutorial="today-rhythm" className="xl:col-span-2 glass rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="syne font-bold text-[#0A1628]">{t.reflectRhythmTitle}</h3>
                <TrendingUp size={16} className="text-sky-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-sky-100 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.reflectLaggingSubjects}</p>
                  <div className="space-y-2">
                    {laggingSubjects.map((item) => (
                      <div key={item.subject} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{categoryLabel(item.subject)}</span>
                        <span className="text-xs text-slate-500">{item.completion}% · {item.minutes}{t.minutesShort}</span>
                      </div>
                    ))}
                    {!laggingSubjects.length && <p className="text-sm text-slate-400">{t.reflectNoData}</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-sky-100 p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.reflectWeeklyTrend}</p>
                  <p className="text-sm text-slate-700">{t.weeklyTasksDoneLabel}: <b>{weeklyStats.thisWeekDone}</b> ({weeklyStats.taskDelta >= 0 ? '+' : ''}{weeklyStats.taskDelta} {t.vsLastWeekLabel})</p>
                  <p className="text-sm text-slate-700 mt-2">{t.weeklyStudyMinutesLabel}: <b>{weeklyStats.thisWeekMinutes}{t.minutesShort}</b> ({weeklyStats.minuteDelta >= 0 ? '+' : ''}{weeklyStats.minuteDelta})</p>
                </div>
              </div>
            </div>

            <div data-tutorial="today-risk" className="glass rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="syne font-bold text-[#0A1628]">{t.reflectRiskRadar}</h3>
              <div className="rounded-xl border border-sky-100 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.reflectNeedsReview}</p>
                <p className="text-2xl syne">{reviewDueItems.length}</p>
                <button onClick={() => setView('library')} className="mt-2 text-xs px-2.5 py-1.5 rounded-lg bg-sky-100 text-sky-700 font-semibold">{t.reflectReviewNow}</button>
              </div>
              <div className="rounded-xl border border-sky-100 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.reflectNextWeekConflicts}</p>
                {nextWeekConflicts.length ? nextWeekConflicts.map((item) => (
                  <p key={item.dateKey} className="text-sm mt-1">{formatDateFromKey(item.dateKey)} · {item.minutes}{t.minutesShort}</p>
                )) : <p className="text-sm text-slate-500 mt-1">{t.reflectNoLargeConflicts}</p>}
              </div>
              <div className="rounded-xl border border-sky-100 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.examCountdownTitle}</p>
                {upcomingExams.slice(0, 2).map((exam) => (
                  <p key={exam.id} className="text-sm mt-1">{exam.title} · {exam.daysLeft} {t.reflectDays}</p>
                ))}
                {!upcomingExams.length && <p className="text-sm text-slate-500 mt-1">{t.reflectNoExam}</p>}
              </div>
            </div>
          </div>
        )}

        {view === 'plan' && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 anim-tab">
            <div className="xl:col-span-3 glass rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="syne text-xl font-bold text-[#0A1628]">{t.plannerTitle}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCalendarView('month')} className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold ${calendarView === 'month' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700'}`}>{t.month}</button>
                  <button onClick={() => setCalendarView('week')} className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold ${calendarView === 'week' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700'}`}>{t.weekDrag}</button>
                </div>
              </div>

              {calendarView === 'month' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="syne text-lg font-bold text-[#0A1628]">{formatDate(curMonth, { month: 'long', year: 'numeric' })}</h3>
                    <div className="flex gap-1">
                      {[ChevronLeft, ChevronRight].map((Arrow, i) => (
                        <button key={i} onClick={() => setCurMonth(new Date(curMonth.getFullYear(), curMonth.getMonth() + (i ? 1 : -1), 1))} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-sky-100 hover:text-sky-600 rounded-xl transition-colors">
                          <Arrow size={17} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-7 text-center mb-1">
                    {weekDayLabels.map((d) => (
                      <div key={d} className="text-[10px] font-bold text-slate-400 py-2 uppercase tracking-wider">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calDays.map((date, idx) => {
                      if (!date) return <div key={idx} />;
                      const key = toDateKey(date);
                      const isSelected = key === toDateKey(selDate);
                      const isToday = key === todayKey;
                      const dayTasks = tasks.filter((task) => task.dateKey === key && !task.archived);
                      const overdueCount = dayTasks.filter((task) => !task.completed && task.dueDateKey < todayKey).length;
                      return (
                        <button key={key} onClick={() => { setSelDate(date); setPlannerMode('day'); }} className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ${isSelected ? 'text-white shadow-lg scale-110 z-10' : isToday ? 'text-sky-600 font-bold bg-sky-50' : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-600'}`} style={isSelected ? { background: 'linear-gradient(135deg, #0EA5E9, #1D4ED8)', boxShadow: '0 4px 14px #0EA5E955' } : {}}>
                          {date.getDate()}
                          {Boolean(dayTasks.length) && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/60' : overdueCount ? 'bg-rose-500' : 'bg-sky-500'}`} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {weekDays.map((date) => {
                    const dateKey = toDateKey(date);
                    const dayTasks = tasks
                      .filter((task) => task.dateKey === dateKey && !task.archived)
                      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                    return (
                      <div
                        key={dateKey}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          const dragId = dragTaskIdRef.current;
                          if (!dragId) return;
                          setTasks((prev) => prev.map((task) => {
                            if (task.id !== dragId) return task;
                            const keepDueInSync = task.dueDateKey === task.dateKey;
                            return {
                              ...task,
                              dateKey,
                              dueDateKey: keepDueInSync ? dateKey : task.dueDateKey,
                              updatedAt: isoNow(),
                            };
                          }));
                          dragTaskIdRef.current = null;
                        }}
                        className="rounded-2xl border border-sky-100 p-2 min-h-[180px]"
                      >
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{formatDate(date, { weekday: 'short', day: '2-digit' })}</p>
                        <div className="space-y-1.5">
                          {dayTasks.map((task) => (
                            <div key={task.id} draggable onDragStart={() => { dragTaskIdRef.current = task.id; }} className="rounded-lg bg-sky-50 border border-sky-100 p-2 cursor-grab active:cursor-grabbing">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                                <GripVertical size={11} />
                                <span>{task.time}</span>
                              </div>
                              <p className="text-xs font-semibold line-clamp-2">{getTaskTitle(task)}</p>
                            </div>
                          ))}
                          {!dayTasks.length && <p className="text-[11px] text-slate-400">{t.noTask}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="xl:col-span-2 space-y-5">
              <div data-tutorial="task-engine" className="glass rounded-3xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="syne font-bold text-[#0A1628]">{t.taskEngineTitle}</h3>
                      <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-2 py-1 rounded-full">
                        {baseVisibleTasks.length} {t.visibleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{plannerScopeLabel}</p>
                  </div>
                  <button
                    type="button"
                    data-tutorial="task-bulk"
                    onClick={toggleBulkSelectMode}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${bulkSelectMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {bulkSelectMode ? t.bulkCancel : t.bulkSelect}
                  </button>
                </div>

                <form onSubmit={addTask} className="space-y-3 mb-4">
                  <div className="rounded-2xl border border-sky-100 bg-white/80 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-sky-500/80">{t.addTask}</p>
                    <input
                      value={newTask.title}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder={t.taskAddPlaceholder}
                      className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] text-slate-500">
                        {t.scheduledLabel}
                        <input
                          type="time"
                          value={newTask.time}
                          onChange={(e) => setNewTask((prev) => ({ ...prev, time: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </label>
                      <label className="text-[11px] text-slate-500">
                        {t.dueLabel}
                        <input
                          type="date"
                          lang={locale}
                          value={newTask.dueDateKey}
                          onChange={(e) => setNewTask((prev) => ({ ...prev, dueDateKey: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTaskDetailsOpen((prev) => !prev)}
                    aria-pressed={taskDetailsOpen}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${taskDetailsOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    <Zap size={12} />
                    {t.taskOptionsLabel}
                  </button>

                  {taskDetailsOpen && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={newTask.priority} onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value }))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs">
                          <option value="low">{t.priorityLow}</option>
                          <option value="medium">{t.priorityMedium}</option>
                          <option value="high">{t.priorityHigh}</option>
                        </select>
                        <select value={newTask.recurring} onChange={(e) => setNewTask((prev) => ({ ...prev, recurring: e.target.value }))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs">
                          <option value="none">{t.recurrenceNone}</option>
                          <option value="daily">{t.recurrenceDaily}</option>
                          <option value="weekly">{t.recurrenceWeekly}</option>
                          <option value="monthly">{t.recurrenceMonthly}</option>
                        </select>
                        <select value={newTask.subject} onChange={(e) => setNewTask((prev) => ({ ...prev, subject: e.target.value }))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs">
                          {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                        </select>
                        <input
                          type="number"
                          min="15"
                          step="15"
                          value={newTask.duration}
                          onChange={(e) => setNewTask((prev) => ({ ...prev, duration: Number(e.target.value || 15) }))}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                          placeholder={t.durationPlaceholder}
                        />
                      </div>
                      <label className="text-[11px] text-slate-500">
                        {t.reminderLabel}
                        <input
                          type="datetime-local"
                          lang={locale}
                          value={newTask.reminderAt}
                          onChange={(e) => setNewTask((prev) => ({ ...prev, reminderAt: e.target.value }))}
                          className="mt-1 w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </label>
                    </div>
                  )}

                  <button type="submit" data-tutorial="task-add" className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(90deg,#0EA5E9,#0284C7)' }}>
                    <Plus size={14} className="inline mr-1" /> {t.addTask}
                  </button>
                </form>

                <div data-tutorial="task-views" className="rounded-2xl bg-slate-100/70 p-1 grid grid-cols-2 gap-2 mb-3">
                  {[
                    { id: 'today', label: t.today },
                    { id: 'week', label: t.thisWeek },
                    { id: 'upcoming', label: t.upcoming },
                    { id: 'day', label: t.selectedDay },
                  ].map((mode) => (
                    <button key={mode.id} onClick={() => setPlannerMode(mode.id)} className={`px-2 py-1.5 rounded-xl text-xs font-semibold ${plannerMode === mode.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 space-y-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={taskFilters.query}
                      onChange={(e) => setTaskFilters((prev) => ({ ...prev, query: e.target.value }))}
                      placeholder={t.searchTaskPlaceholder}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      data-tutorial="task-filters"
                      onClick={() => setTaskFiltersOpen((prev) => !prev)}
                      aria-pressed={taskFiltersOpen}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition ${taskFiltersOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      <SlidersHorizontal size={12} />
                      {t.taskFiltersLabel}
                      {taskFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold">
                          {taskFilterCount}
                        </span>
                      )}
                    </button>
                  </div>
                  <label className="text-[11px] inline-flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={taskFilters.overdueOnly}
                      onChange={(e) => setTaskFilters((prev) => ({ ...prev, overdueOnly: e.target.checked }))}
                    />
                    {t.overdueOnlyLabel}
                  </label>
                  {taskFiltersOpen && (
                    <div className="grid grid-cols-2 gap-2">
                      <select value={taskFilters.status} onChange={(e) => setTaskFilters((prev) => ({ ...prev, status: e.target.value }))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="open">{t.statusOpen}</option>
                        <option value="done">{t.statusDone}</option>
                        <option value="all">{t.statusAll}</option>
                      </select>
                      <select value={taskFilters.priority} onChange={(e) => setTaskFilters((prev) => ({ ...prev, priority: e.target.value }))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="all">{t.priorityAll}</option>
                        <option value="high">{t.priorityHigh}</option>
                        <option value="medium">{t.priorityMedium}</option>
                        <option value="low">{t.priorityLow}</option>
                      </select>
                      <select value={taskFilters.subject} onChange={(e) => setTaskFilters((prev) => ({ ...prev, subject: e.target.value }))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="all">{t.subjectAll}</option>
                        {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                      </select>
                      <select value={taskFilters.sort} onChange={(e) => setTaskFilters((prev) => ({ ...prev, sort: e.target.value }))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <option value="dueAsc">{t.sortDue}</option>
                        <option value="priority">{t.sortPriority}</option>
                        <option value="duration">{t.sortDuration}</option>
                        <option value="updated">{t.sortUpdated}</option>
                      </select>
                    </div>
                  )}
                </div>

                {bulkSelectMode && selectedTaskIds.length > 0 && (
                  <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 p-2.5 flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs font-semibold text-sky-700">{selectedTaskIds.length} {t.selectedLabel}</span>
                    <button onClick={() => bulkTaskAction('complete')} className="px-2 py-1 text-[11px] rounded bg-emerald-100 text-emerald-700">{t.complete}</button>
                    <button onClick={() => bulkTaskAction('archive')} className="px-2 py-1 text-[11px] rounded bg-slate-200 text-slate-700">{t.archive}</button>
                    <button onClick={() => bulkTaskAction('tomorrow')} className="px-2 py-1 text-[11px] rounded bg-sky-100 text-sky-700">{t.tomorrow}</button>
                    <button onClick={() => bulkTaskAction('nextWeek')} className="px-2 py-1 text-[11px] rounded bg-indigo-100 text-indigo-700">{t.nextWeek}</button>
                    <button onClick={() => bulkTaskAction('delete')} className="px-2 py-1 text-[11px] rounded bg-rose-100 text-rose-700">{t.delete}</button>
                  </div>
                )}

                <div data-tutorial="task-list" className="max-h-[520px] overflow-y-auto scroll space-y-2">
                  {Object.entries(tasksBySubject).map(([subject, subjectTasks]) => (
                    <div key={subject} className="rounded-xl border border-sky-100/70 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{categoryLabel(subject)}</p>
                      <div className="space-y-2">
                        {subjectTasks.map((task) => {
                          const overdue = !task.completed && task.dueDateKey < todayKey;
                          const isEditing = editingTaskId === task.id;
                          return (
                            <div key={task.id} className={`group rounded-xl border p-2.5 ${task.completed ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white/80 border-sky-100'}`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input value={taskDraft.task} onChange={(e) => setTaskDraft((prev) => ({ ...prev, task: e.target.value }))} className="w-full px-2 py-1.5 text-xs rounded border border-slate-300" />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="time" value={taskDraft.time || '09:00'} onChange={(e) => setTaskDraft((prev) => ({ ...prev, time: e.target.value }))} className="px-2 py-1.5 text-xs rounded border border-slate-300" />
                                    <input type="date" lang={locale} value={taskDraft.dueDateKey} onChange={(e) => setTaskDraft((prev) => ({ ...prev, dueDateKey: e.target.value }))} className="px-2 py-1.5 text-xs rounded border border-slate-300" />
                                    <select value={taskDraft.priority} onChange={(e) => setTaskDraft((prev) => ({ ...prev, priority: e.target.value }))} className="px-2 py-1.5 text-xs rounded border border-slate-300">
                                      <option value="low">{t.priorityLow}</option>
                                      <option value="medium">{t.priorityMedium}</option>
                                      <option value="high">{t.priorityHigh}</option>
                                    </select>
                                    <select value={taskDraft.recurring} onChange={(e) => setTaskDraft((prev) => ({ ...prev, recurring: e.target.value }))} className="px-2 py-1.5 text-xs rounded border border-slate-300">
                                      <option value="none">{t.recurrenceNone}</option>
                                      <option value="daily">{t.recurrenceDaily}</option>
                                      <option value="weekly">{t.recurrenceWeekly}</option>
                                      <option value="monthly">{t.recurrenceMonthly}</option>
                                    </select>
                                    <select
                                      value={categories.includes(taskDraft.subject) ? taskDraft.subject : 'general'}
                                      onChange={(e) => setTaskDraft((prev) => ({ ...prev, subject: e.target.value }))}
                                      className="px-2 py-1.5 text-xs rounded border border-slate-300"
                                    >
                                      {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button onClick={() => { setEditingTaskId(null); setTaskDraft(null); }} className="px-2 py-1 text-xs rounded bg-slate-100">{t.cancel}</button>
                                    <button onClick={saveTaskEdit} className="px-2 py-1 text-xs rounded bg-sky-600 text-white">{t.save}</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start gap-2">
                                    {bulkSelectMode ? (
                                      <input
                                        type="checkbox"
                                        checked={selectedTaskIds.includes(task.id)}
                                        onChange={() => toggleTaskSelect(task.id)}
                                        className="mt-1"
                                        aria-label={t.selectTask}
                                      />
                                    ) : (
                                      <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-sky-400'}`}
                                        aria-label={t.completeTask}
                                      >
                                        {task.completed && <Check size={11} strokeWidth={3.5} className="text-white" />}
                                      </button>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium ${task.completed ? 'strike text-slate-400' : 'text-slate-800'}`}>{getTaskTitle(task)}</p>
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${PRIORITY_META[task.priority]?.cls || PRIORITY_META.medium.cls}`}>{priorityLabel(task.priority)}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-700">{t.dueLabel} {formatDateFromKey(task.dueDateKey)}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{task.duration}{t.minutesShort}</span>
                                        {task.recurring !== 'none' && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{recurrenceLabel(task.recurring)}</span>}
                                        {overdue && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700 inline-flex items-center gap-1"><AlertTriangle size={10} /> {t.overdueLabel}</span>}
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-1">{task.time} · {t.scheduledLabel} {formatDateFromKey(task.dateKey)} · {t.reminderLabel} {task.reminderAt ? formatDateTime(task.reminderAt) : '-'}</p>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openTaskEdit(task)} className="px-2 py-1 text-[11px] rounded bg-sky-100 text-sky-700">{t.edit}</button>
                                    <button onClick={() => duplicateTask(task)} className="px-2 py-1 text-[11px] rounded bg-indigo-100 text-indigo-700">{t.duplicate}</button>
                                    <button onClick={() => archiveTask(task.id)} className="px-2 py-1 text-[11px] rounded bg-slate-200 text-slate-700">{t.archive}</button>
                                    <button onClick={() => quickMoveTask(task.id, 1)} className="px-2 py-1 text-[11px] rounded bg-cyan-100 text-cyan-700">{t.tomorrow}</button>
                                    <button onClick={() => quickMoveTask(task.id, 7)} className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700">{t.nextWeek}</button>
                                    <button onClick={() => deleteTask(task.id)} className="px-2 py-1 text-[11px] rounded bg-rose-100 text-rose-700">{t.delete}</button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!baseVisibleTasks.length && (
                    <div className="text-center py-10 opacity-40">
                      <ListChecks size={34} strokeWidth={1.2} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">{t.taskNoMatchFilter}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-2">{t.upcomingListTitle}</h3>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-sky-100 px-3 py-2">
                      <p className="text-sm font-semibold">{getTaskTitle(task)}</p>
                      <p className="text-[11px] text-slate-500">{formatDateFromKey(task.dateKey)} · {t.dueLabel} {formatDateFromKey(task.dueDateKey)} · {task.time}</p>
                    </div>
                  ))}
                  {!upcomingTasks.length && <p className="text-sm text-slate-500">{t.taskNoUpcoming}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'learn' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 anim-tab">
            <div className="xl:col-span-2 space-y-5">
              <div data-tutorial="learn-pomodoro" className="glass rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="syne text-2xl font-bold text-[#0A1628]">{t.pomodoroTitle}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t.pomodoroHint}</p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-sky-100 text-sky-700 font-semibold">
                    {pomodoroConfig.soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    <span>{t.pomodoroSound}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { id: 'focus', label: t.pomodoroFocus },
                    { id: 'short', label: t.pomodoroShortBreak },
                    { id: 'long', label: t.pomodoroLongBreak },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setPomodoroModeAndReset(mode.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold ${pomodoroMode === mode.id ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700'}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-sky-100 bg-white/70 p-6 md:p-8">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t.pomodoroCurrentSession}: {pomodoroModeLabel[pomodoroMode]}</p>
                    <p className="syne text-6xl leading-none mt-3 text-[#0A1628]">{formatCountdown(pomodoroSecondsLeft)}</p>
                    <p className="text-xs text-slate-500 mt-2">{t.pomodoroUntilLongBreak}: {pomodoroUntilLongBreak}</p>
                    <div className="h-2.5 mt-4 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${pomodoroProgress}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
                    <button onClick={togglePomodoro} data-tutorial="pomodoro-start" className="px-3 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center gap-1.5" style={{ background: 'linear-gradient(90deg,#0EA5E9,#0284C7)' }}>
                      {pomodoroRunning ? <Pause size={12} /> : <Play size={12} />}
                      {pomodoroRunning ? t.pomodoroPause : t.pomodoroStart}
                    </button>
                    <button onClick={resetPomodoro} className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 inline-flex items-center justify-center gap-1.5">
                      <RotateCw size={12} />
                      {t.pomodoroReset}
                    </button>
                    <button onClick={skipPomodoroPhase} className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-indigo-100 text-indigo-700 inline-flex items-center justify-center gap-1.5">
                      <SkipForward size={12} />
                      {t.pomodoroSkip}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                    <p className="text-xs text-slate-500">{t.pomodoroCompleted}</p>
                    <p className="syne text-2xl leading-none text-slate-700 mt-1">{pomodoroCompleted}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3">
                    <p className="text-xs text-slate-500">{t.pomodoroTodayFocus}</p>
                    <p className="syne text-2xl leading-none text-slate-700 mt-1">{pomodoroTodayFocusMinutes} {t.pomodoroMinutesUnit}</p>
                  </div>
                </div>
              </div>

              <div data-tutorial="learn-sessions" className="glass rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="syne text-xl font-bold text-[#0A1628]">{t.studySessionsTitle}</h2>
                  <BookMarked size={18} className="text-sky-500" />
                </div>

                <form onSubmit={addStudySession} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                  <select value={newSession.subject} onChange={(e) => setNewSession((prev) => ({ ...prev, subject: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs">
                    {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                  </select>
                  <input type="number" min="15" step="15" value={newSession.duration} onChange={(e) => setNewSession((prev) => ({ ...prev, duration: Number(e.target.value || 15) }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" placeholder={t.minutesPlaceholder} />
                  <input type="date" lang={locale} value={newSession.dateKey} onChange={(e) => setNewSession((prev) => ({ ...prev, dateKey: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                  <select value={newSession.focus} onChange={(e) => setNewSession((prev) => ({ ...prev, focus: Number(e.target.value) }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs">
                    {[1, 2, 3, 4, 5].map((f) => <option key={f} value={f}>{t.focusLabel} {f}{t.focusScaleSuffix}</option>)}
                  </select>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(90deg,#0EA5E9,#0284C7)' }}>
                    {t.addSession}
                  </button>
                </form>

                <div className="space-y-2 max-h-[420px] overflow-y-auto scroll">
                  {studySessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-sky-100 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <BookMarked size={15} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{categoryLabel(session.subject)} · {session.duration}{t.minutesShort}</p>
                        <p className="text-[11px] text-slate-500">{formatDateFromKey(session.dateKey)} · {t.focusLabel} {session.focus}{t.focusScaleSuffix}</p>
                      </div>
                      <button onClick={() => setStudySessions((prev) => prev.filter((s) => s.id !== session.id))} className="text-slate-300 hover:text-rose-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {!studySessions.length && <p className="text-sm text-slate-500">{t.studyNoSession}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div data-tutorial="learn-pomodoro-settings" className="glass rounded-3xl p-5 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-3 inline-flex items-center gap-1.5">
                  <SlidersHorizontal size={12} />
                  {t.pomodoroSettings}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="text-[11px] text-slate-500">
                    {t.pomodoroFocusMinutes}
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={pomodoroConfig.focusMinutes}
                      onChange={(e) => updatePomodoroConfig('focusMinutes', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-sky-100 bg-sky-50/70 text-xs text-slate-700"
                    />
                  </label>
                  <label className="text-[11px] text-slate-500">
                    {t.pomodoroShortBreakMinutes}
                    <input
                      type="number"
                      min="3"
                      max="30"
                      value={pomodoroConfig.shortBreakMinutes}
                      onChange={(e) => updatePomodoroConfig('shortBreakMinutes', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-sky-100 bg-sky-50/70 text-xs text-slate-700"
                    />
                  </label>
                  <label className="text-[11px] text-slate-500">
                    {t.pomodoroLongBreakMinutes}
                    <input
                      type="number"
                      min="10"
                      max="60"
                      value={pomodoroConfig.longBreakMinutes}
                      onChange={(e) => updatePomodoroConfig('longBreakMinutes', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-sky-100 bg-sky-50/70 text-xs text-slate-700"
                    />
                  </label>
                  <label className="text-[11px] text-slate-500">
                    {t.pomodoroCyclesBeforeLongBreak}
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={pomodoroConfig.cyclesBeforeLongBreak}
                      onChange={(e) => updatePomodoroConfig('cyclesBeforeLongBreak', e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-sky-100 bg-sky-50/70 text-xs text-slate-700"
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs inline-flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={pomodoroConfig.autoStartBreaks}
                      onChange={(e) => updatePomodoroConfig('autoStartBreaks', e.target.checked)}
                    />
                    {t.pomodoroAutoStartBreaks}
                  </label>
                  <label className="text-xs inline-flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={pomodoroConfig.autoStartFocus}
                      onChange={(e) => updatePomodoroConfig('autoStartFocus', e.target.checked)}
                    />
                    {t.pomodoroAutoStartFocus}
                  </label>
                  <label className="text-xs inline-flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={pomodoroConfig.soundEnabled}
                      onChange={(e) => updatePomodoroConfig('soundEnabled', e.target.checked)}
                    />
                    {t.pomodoroSound}
                  </label>
                </div>
              </div>

              <div className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-2">{t.reflectWhatFirst}</h3>
                <p className="text-xs text-slate-500 mb-3">{t.pomodoroHint}</p>
                {nextTaskRecommendation ? (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                    <p className="text-xs text-slate-500">{t.reflectWhatFirst}</p>
                    <p className="text-sm font-semibold mt-1">{getTaskTitle(nextTaskRecommendation)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{t.dueLabel} {formatDateFromKey(nextTaskRecommendation.dueDateKey)}</p>
                    <button onClick={() => setView('plan')} className="mt-2 px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 text-xs font-semibold">{t.reflectOpenPlanner}</button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-sm text-slate-500">{t.reflectNoOpenTasks}</p>
                    <button onClick={() => setView('plan')} className="mt-2 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold">{t.reflectOpenPlanner}</button>
                  </div>
                )}
              </div>

              <div data-tutorial="learn-goals" className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-3">{t.goalsTitle}</h3>
                <form onSubmit={addGoal} className="space-y-2 mb-3">
                  <input value={newGoal.title} onChange={(e) => setNewGoal((prev) => ({ ...prev, title: e.target.value }))} placeholder={t.goalTitlePlaceholder} className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newGoal.subject} onChange={(e) => setNewGoal((prev) => ({ ...prev, subject: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs">
                      {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                    </select>
                    <input type="date" lang={locale} value={newGoal.targetDateKey} onChange={(e) => setNewGoal((prev) => ({ ...prev, targetDateKey: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                  </div>
                  <button type="submit" className="w-full px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(90deg,#0EA5E9,#0284C7)' }}>{t.addGoal}</button>
                </form>

                <div className="space-y-2 max-h-[220px] overflow-y-auto scroll">
                  {goals.map((goal) => (
                    <div key={goal.id} className="rounded-xl border border-sky-100 p-2.5">
                      <p className="text-sm font-semibold">{goal.title}</p>
                      <p className="text-[11px] text-slate-500">{categoryLabel(goal.subject)} · {t.targetLabel} {formatDateFromKey(goal.targetDateKey)}</p>
                      <button onClick={() => setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, completed: !g.completed } : g))} className={`mt-1 px-2 py-1 text-[11px] rounded ${goal.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{goal.completed ? t.done : t.markDone}</button>
                    </div>
                  ))}
                  {!goals.length && <p className="text-sm text-slate-500">{t.goalsKeepMomentum}</p>}
                </div>
              </div>

              <div data-tutorial="learn-progress" className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-3">{t.progressBySubjectTitle}</h3>
                <div className="space-y-2">
                  {subjectProgress.map((item) => (
                    <div key={item.subject}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{categoryLabel(item.subject)}</span>
                        <span>{item.completion}% · {item.minutes}{t.minutesShort}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${item.completion}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'library' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 anim-tab">
            <div className="xl:col-span-3">
              <div className="glass rounded-3xl p-5 shadow-sm sticky top-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[2.5px] mb-3">{t.categoriesTagsTitle}</h3>
                <div className="space-y-1 mb-4">
                  {['all', ...categories].map((cat) => {
                    const cc = catColor(cat);
                    const count = cat === 'all' ? notes.length : notes.filter((note) => note.category === cat).length;
                    const active = noteFilters.category === cat;
                    return (
                      <div key={cat} onClick={() => setNoteFilters((prev) => ({ ...prev, category: cat }))} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${active ? 'text-white' : 'text-slate-600 hover:bg-sky-50/70'}`} style={active ? { background: 'linear-gradient(90deg, #0A1628, #0F2A5F)' } : {}}>
                        <div className="flex items-center gap-2.5">
                          {cat !== 'all' && <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-sky-300' : cc.dot}`} />}
                          <span className="text-sm font-medium">{cat === 'all' ? t.allFilter : categoryLabel(cat)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${active ? 'text-sky-300' : 'text-slate-400'}`}>{count}</span>
                          {cat !== 'all' && cat !== 'general' && !active && (
                            <button onClick={(e) => { e.stopPropagation(); removeCategory(cat); }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-sky-100 pt-3 flex gap-1.5 mb-3">
                  <input value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder={t.addCategory} className="flex-1 px-2.5 py-2 bg-sky-50/60 border border-sky-100 rounded-lg text-xs" />
                  <button onClick={addCategory} className="w-8 h-8 text-white rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#38BDF8,#0284C7)' }}>
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  <input value={noteFilters.search} onChange={(e) => setNoteFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder={t.searchNotes} className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                  <select value={noteFilters.tag} onChange={(e) => setNoteFilters((prev) => ({ ...prev, tag: e.target.value }))} className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <option value="all">{t.allTagsLabel}</option>
                    {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                  <select value={noteFilters.sort} onChange={(e) => setNoteFilters((prev) => ({ ...prev, sort: e.target.value }))} className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <option value="updated">{t.updatedTimeLabel}</option>
                    <option value="title">{t.titleLabel}</option>
                  </select>
                  <label className="text-xs inline-flex items-center gap-1.5">
                    <input type="checkbox" checked={noteFilters.archived} onChange={(e) => setNoteFilters((prev) => ({ ...prev, archived: e.target.checked }))} />
                    {t.showArchivedLabel}
                  </label>
                </div>

                <div className="text-xs text-slate-500">{t.captureSplitViewHint}</div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-4">
              <div className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-3">{t.quickCaptureTitle}</h3>
                <input value={newNote.title} onChange={(e) => setNewNote((prev) => ({ ...prev, title: e.target.value }))} placeholder={t.docTitle} className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-sm mb-2" />
                <textarea value={newNote.content} onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))} rows={4} placeholder={t.captureMarkdownHint} className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-sm mb-2" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={newNote.category} onChange={(e) => setNewNote((prev) => ({ ...prev, category: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs">
                    {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                  </select>
                  <input value={newNote.tagsInput} onChange={(e) => setNewNote((prev) => ({ ...prev, tagsInput: e.target.value }))} placeholder={t.tagsPlaceholder} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                </div>
                <input value={newNote.attachmentInput} onChange={(e) => setNewNote((prev) => ({ ...prev, attachmentInput: e.target.value }))} placeholder={t.attachmentPlaceholder} className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs mb-2" />
                <button onClick={addNote} data-tutorial="note-save" disabled={!newNote.title.trim()} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #0A1628, #0F2A5F)' }}>
                  {t.saveNote}
                </button>
              </div>

              <div className="space-y-3 max-h-[640px] overflow-y-auto scroll pr-1">
                {displayedNotes.map((note) => {
                  const cc = catColor(note.category);
                  const active = selectedNote?.id === note.id;
                  return (
                    <div key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`glass rounded-2xl p-4 cursor-pointer transition-all border ${active ? 'border-sky-400 shadow-md' : 'border-sky-100'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${cc.pill}`}>{categoryLabel(note.category)}</span>
                          {note.pinned && <Pin size={12} className="text-amber-500" />}
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDateTime(note.updatedAt)}</span>
                      </div>
                      <h4 className="syne text-sm font-bold text-slate-900 mb-1 line-clamp-1">{getNoteTitle(note)}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{summarizeNote(getNoteContent(note))}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(note.tags || []).map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">#{tag}</span>)}
                      </div>
                    </div>
                  );
                })}
                {!displayedNotes.length && (
                  <div className="text-center py-20 opacity-40">
                    <BookOpen size={40} strokeWidth={1} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">{t.noteNoMatch}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-5 space-y-5">
              <div className="glass rounded-3xl p-5 shadow-sm min-h-[640px]">
                {selectedNote ? (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="syne font-bold text-[#0A1628]">{t.noteWorkspaceTitle}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => togglePinNote(selectedNote.id)} className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-700 inline-flex items-center gap-1">{selectedNote.pinned ? <PinOff size={12} /> : <Pin size={12} />}{selectedNote.pinned ? t.unpin : t.pin}</button>
                        <button onClick={() => duplicateNote(selectedNote)} className="px-2 py-1 text-[11px] rounded bg-indigo-100 text-indigo-700 inline-flex items-center gap-1"><Copy size={12} />{t.duplicate}</button>
                        <button onClick={() => archiveNote(selectedNote.id, !selectedNote.archived)} className="px-2 py-1 text-[11px] rounded bg-slate-100 text-slate-700 inline-flex items-center gap-1"><Archive size={12} />{selectedNote.archived ? t.unarchive : t.archive}</button>
                        <button onClick={() => openNoteEdit(selectedNote)} className="px-2 py-1 text-[11px] rounded bg-sky-100 text-sky-700">{t.edit}</button>
                        <button onClick={() => deleteNote(selectedNote.id)} className="px-2 py-1 text-[11px] rounded bg-rose-100 text-rose-700 inline-flex items-center gap-1"><Trash2 size={12} />{t.delete}</button>
                      </div>
                    </div>

                    {editingNoteId === selectedNote.id ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <input value={noteDraft.title} onChange={(e) => setNoteDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" />
                          <textarea value={noteDraft.content} onChange={(e) => setNoteDraft((prev) => ({ ...prev, content: e.target.value }))} rows={12} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm" />
                          <div className="grid grid-cols-2 gap-2">
                            <input value={noteDraft.tagsInput} onChange={(e) => setNoteDraft((prev) => ({ ...prev, tagsInput: e.target.value }))} placeholder={t.tagsPlaceholderShort} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                            <input value={noteDraft.attachmentInput} onChange={(e) => setNoteDraft((prev) => ({ ...prev, attachmentInput: e.target.value }))} placeholder={t.newAttachmentPlaceholder} className="px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setEditingNoteId(null); setNoteDraft(null); }} className="px-3 py-1.5 text-xs rounded bg-slate-100">{t.cancel}</button>
                            <button onClick={saveNoteEdit} className="px-3 py-1.5 text-xs rounded bg-sky-600 text-white">{t.save}</button>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-sky-100 p-3 bg-white/70">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.markdownPreviewTitle}</p>
                          <h4 className="syne font-bold mb-2">{noteDraft.title}</h4>
                          <p className="text-sm whitespace-pre-wrap text-slate-700">{noteDraft.content}</p>
                          <div className="mt-4 p-2 rounded-lg bg-sky-50 text-xs text-sky-700">{t.summaryLabel}: {summarizeNote(noteDraft.content)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-sky-100 p-4 bg-white/70">
                          <h4 className="syne text-lg font-bold mb-2">{getNoteTitle(selectedNote)}</h4>
                          <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed">{getNoteContent(selectedNote)}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(selectedNote.tags || []).map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">#{tag}</span>)}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-2xl border border-sky-100 p-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.backlinksTitle}</p>
                            {selectedNoteBacklinks.length ? selectedNoteBacklinks.map((title) => <p key={title} className="text-sm">[[{title}]]</p>) : <p className="text-sm text-slate-500">{t.noteNoBacklinks}</p>}
                          </div>

                          <div className="rounded-2xl border border-sky-100 p-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.attachmentsTitle}</p>
                            {(selectedNote.attachments || []).length ? selectedNote.attachments.map((att, idx) => <p key={`${att}-${idx}`} className="text-sm text-slate-700">• {att}</p>) : <p className="text-sm text-slate-500">{t.noteNoAttachments}</p>}
                          </div>

                          <div className="rounded-2xl border border-sky-100 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.flashcardsTitle}</p>
                              <button onClick={() => convertNoteToFlashcards(selectedNote.id)} className="px-2 py-1 text-[11px] rounded bg-indigo-100 text-indigo-700">{t.convert}</button>
                            </div>
                            {(selectedNote.flashcards || []).length ? (
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto scroll">
                                {selectedNote.flashcards.map((card, idx) => (
                                  <div key={`${card.question}-${idx}`} className="text-xs rounded-lg bg-slate-50 p-2">
                                    <p className="font-semibold">{t.flashcardQuestionLabel}: {card.question}</p>
                                    <p className="text-slate-600">{t.flashcardAnswerLabel}: {card.answer}</p>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-sm text-slate-500">{t.noteFlashcardHint}</p>}
                          </div>

                          <div className="rounded-2xl border border-sky-100 p-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.versionHistoryTitle}</p>
                            {(selectedNote.versions || []).length ? (
                              <div className="space-y-1.5 max-h-[120px] overflow-y-auto scroll">
                                {selectedNote.versions.map((ver, idx) => (
                                  <div key={`${ver.updatedAt}-${idx}`} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 p-2">
                                    <span>{formatDateTime(ver.updatedAt)}</span>
                                    <button onClick={() => restoreVersion(selectedNote.id, ver)} className="px-2 py-1 rounded bg-sky-100 text-sky-700">{t.restore}</button>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-sm text-slate-500">{t.noteNoVersions}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-24 text-slate-500">{t.noteSelectToStart}</div>
                )}
              </div>

              <div className="glass rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="syne text-xl font-bold text-[#0A1628]">{t.revisionTrackerTitle}</h2>
                  <ClipboardList size={18} className="text-sky-500" />
                </div>
                <div className="space-y-2 max-h-[360px] overflow-y-auto scroll">
                  {revisions.map((item) => {
                    const due = item.nextReviewKey <= todayKey;
                    return (
                      <div key={item.id} className={`rounded-xl border p-3 ${due ? 'border-rose-200 bg-rose-50/70' : 'border-sky-100 bg-white/70'}`}>
                        <p className="text-sm font-semibold">{item.question}</p>
                        <p className="text-xs text-slate-500">{categoryLabel(item.subject)} · {t.nextLabel} {formatDateFromKey(item.nextReviewKey)} · {t.intervalLabel} {item.intervalDays}{t.daysShort}</p>
                        <details className="mt-1">
                          <summary className="text-xs cursor-pointer text-sky-600">{t.showAnswer}</summary>
                          <p className="text-sm mt-1 text-slate-700">{item.answer}</p>
                        </details>
                        <div className="mt-2 flex gap-1.5">
                          <button onClick={() => reviewRevision(item.id, true)} className="px-2 py-1 text-[11px] rounded bg-emerald-100 text-emerald-700">{t.remembered}</button>
                          <button onClick={() => reviewRevision(item.id, false)} className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-700">{t.needReview}</button>
                          <button onClick={() => setRevisions((prev) => prev.filter((r) => r.id !== item.id))} className="px-2 py-1 text-[11px] rounded bg-slate-100 text-slate-700">{t.remove}</button>
                        </div>
                      </div>
                    );
                  })}
                  {!revisions.length && <p className="text-sm text-slate-500">{t.reviewNoItems}</p>}
                </div>
              </div>

              <div className="glass rounded-3xl p-5 shadow-sm">
                <h3 className="syne font-bold text-[#0A1628] mb-3">{t.examCountdownTitle}</h3>
                <form onSubmit={addExam} className="space-y-2 mb-3">
                  <input value={newExam.title} onChange={(e) => setNewExam((prev) => ({ ...prev, title: e.target.value }))} placeholder={t.examNamePlaceholder} className="w-full px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newExam.subject} onChange={(e) => setNewExam((prev) => ({ ...prev, subject: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs">
                      {categories.map((cat) => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
                    </select>
                    <input type="date" lang={locale} value={newExam.dateKey} onChange={(e) => setNewExam((prev) => ({ ...prev, dateKey: e.target.value }))} className="px-3 py-2 rounded-xl border border-sky-100 bg-sky-50/60 text-xs" />
                  </div>
                  <button type="submit" className="w-full px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(90deg,#0EA5E9,#0284C7)' }}>{t.addExam}</button>
                </form>

                <div className="space-y-2 max-h-[240px] overflow-y-auto scroll">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="rounded-xl border border-sky-100 p-3">
                      <p className="text-sm font-semibold">{exam.title}</p>
                      <p className="text-xs text-slate-500">{categoryLabel(exam.subject)} · {formatDateFromKey(exam.dateKey)}</p>
                      <p className="text-xs mt-1 font-semibold text-sky-700">{t.examDaysLeftPrefix} {exam.daysLeft} {t.reflectDays}</p>
                    </div>
                  ))}
                  {!upcomingExams.length && <p className="text-sm text-slate-500">{t.examNoUpcoming}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 pb-10 text-center text-xs text-slate-500">
          <div className="mx-auto glass px-4 py-2 rounded-2xl shadow-sm flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-[92vw]">
            <span className="text-[11px]">{t.footerText}</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{t.footerContactLabel}</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1.5"
                >
                  <link.icon size={12} className={`shrink-0 ${link.iconClass} group-hover:scale-105 transition-transform`} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>

      {tutorialOpen && (
        <div className="fixed inset-0 z-[140]">
          <div
            className={`absolute inset-0 ${tutorialRect ? 'bg-transparent' : 'bg-slate-900/50'}`}
            onClick={closeTutorial}
          />
          {tutorialRect && (
            <div
              className="absolute rounded-2xl border border-sky-200/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.58)] pointer-events-none transition-all duration-200"
              style={{
                top: tutorialRect.top,
                left: tutorialRect.left,
                width: tutorialRect.width,
                height: tutorialRect.height,
              }}
            />
          )}
          <div
            className="absolute z-10 w-[320px] max-w-[90vw] rounded-2xl bg-white border border-sky-100 shadow-2xl p-4"
            style={tutorialTooltipStyle}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-[2.5px]">{t.tutorialLabel}</p>
                <h3 className="syne text-base text-[#0A1628]">{tutorialStepData.title}</h3>
              </div>
              <button type="button" onClick={closeTutorial} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X size={14} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{tutorialStepData.body}</p>

            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${tutorialProgress}%` }} />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{t.tutorialStepLabel} {tutorialStep + 1} / {tutorialSteps.length}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeTutorial} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                  {t.tutorialSkip}
                </button>
                <button
                  type="button"
                  onClick={prevTutorialStep}
                  disabled={tutorialStep === 0}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 disabled:opacity-50"
                >
                  {t.tutorialBack}
                </button>
                <button
                  type="button"
                  onClick={nextTutorialStep}
                  className="px-2.5 py-1 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
                >
                  {tutorialStep >= tutorialSteps.length - 1 ? t.tutorialDone : t.tutorialNext}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {undoState && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120]">
          <div className="px-4 py-2 rounded-xl bg-[#0A1628] text-white text-sm shadow-xl border border-white/10 flex items-center gap-2">
            <Undo2 size={14} />
            <span>{undoLabel}</span>
            <button onClick={undoDelete} className="px-2 py-1 text-xs rounded bg-sky-500/30">{t.undo}</button>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100]">
        <div className={`absolute bottom-[68px] right-0 w-[300px] sm:w-[360px] bg-white rounded-2xl overflow-hidden flex flex-col border border-sky-100/60 shadow-2xl shadow-blue-900/20 transition-all duration-300 origin-bottom-right ${aiOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}>
          <div className="p-4 text-white flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0F3D7A 100%)' }}>
            <div className="w-8 h-8 rounded-full bg-sky-400/25 flex items-center justify-center">
              <Bot size={16} className="text-sky-300" />
            </div>
            <div className="flex-1">
              <p className="syne text-sm font-bold">{t.aiBrand}</p>
              <p className="text-[10px] text-sky-300">{t.aiHelper}</p>
            </div>
            <button onClick={() => setAiOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="h-[260px] overflow-y-auto p-3 space-y-3 scroll" style={{ background: '#F0F9FF88' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 anim-fade ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-sky-100'}`}>
                  {msg.role === 'user' ? <User size={12} className="text-slate-500" /> : <Bot size={12} className="text-sky-600" />}
                </div>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[78%] ${msg.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-white border border-sky-100/50 shadow-sm text-slate-700 rounded-tl-sm'}`} style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#0A1628,#0F2A5F)' } : {}}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-sky-600" />
                </div>
                <div className="px-4 py-3 bg-white border border-sky-100/50 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-sky-400 dot-1" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 dot-2" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 dot-3" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-sky-100/50 bg-white">
            <form onSubmit={handleAI} className="flex gap-2">
              <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} disabled={aiLoading} placeholder={t.aiPlaceholder} className="flex-1 px-3 py-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all" />
              <button type="submit" disabled={!aiInput.trim() || aiLoading} className="w-9 h-9 text-white rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#38BDF8,#0284C7)' }}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        <button onClick={() => setAiOpen(!aiOpen)} data-tutorial="ai-toggle" className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 ${aiOpen ? 'rotate-12 scale-95' : 'hover:scale-110'}`} style={aiOpen ? { background: '#1E293B' } : { background: 'linear-gradient(135deg, #38BDF8 0%, #1D4ED8 100%)', boxShadow: '0 8px 30px #0EA5E970' }}>
          {aiOpen ? <X size={22} /> : <Sparkles size={22} strokeWidth={2} />}
          {!aiOpen && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />}
        </button>
      </div>
    </div>
  );
}
