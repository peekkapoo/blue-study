import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, BookOpen, Calendar as CalIcon, Plus, Trash2,
  ChevronRight, ChevronLeft, Clock, Search, Tag, X, Check,
  Sparkles, Bot, Send, User, Target, Zap, CheckCircle2,
  TrendingUp, Flame, Languages
} from 'lucide-react';
import {
  LANG_META,
  CATEGORY_LABELS,
  UI_TEXT,
  CATEGORY_ALIASES,
  DEFAULT_CATEGORIES,
  INITIAL_NOTE_SEEDS,
  INITIAL_TASK_SEEDS,
  SEED_NOTE_TEXTS,
  SEED_TASK_TEXTS,
} from './App.i18n';
import AuthScreen from './AuthScreen';
import { authApi, userDataApi } from './api';

/* ─── FONTS & GLOBAL CSS ─── */
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

  /* Scrollbar */
  .scroll::-webkit-scrollbar { width: 4px; }
  .scroll::-webkit-scrollbar-track { background: transparent; }
  .scroll::-webkit-scrollbar-thumb { background: #BAE6FD; border-radius: 4px; }

  /* Animations */
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
  .anim-tab    { animation: fadeUp .35s ease both; }
  .anim-fade   { animation: fadeIn .25s ease both; }
  .dot-1 { animation: bounceDot .9s 0ms   infinite; }
  .dot-2 { animation: bounceDot .9s 150ms infinite; }
  .dot-3 { animation: bounceDot .9s 300ms infinite; }

  /* Gradient mesh BG */
  .mesh-bg {
    background-color: var(--bg);
    background-image:
      radial-gradient(ellipse 60% 50% at 20% 0%,   #BFDBFE88 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 90% 80%,  #BAE6FD55 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 60% 40%,  #E0F2FE44 0%, transparent 70%);
  }

  /* Glass card */
  .glass {
    background: rgba(255,255,255,0.78);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(186,230,253,0.55);
  }

  /* Nav active glow */
  .nav-active {
    background: var(--sky);
    box-shadow: 0 4px 20px 0 #0EA5E960;
  }

  /* Smooth checked line-through */
  .strike { text-decoration: line-through; text-decoration-color: #94a3b8; }
`;

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
    const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return input;
    const dmySlash = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmySlash) return `${dmySlash[3]}-${pad2(Number(dmySlash[2]))}-${pad2(Number(dmySlash[1]))}`;
    const dmyDot = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmyDot) return `${dmyDot[3]}-${pad2(Number(dmyDot[2]))}-${pad2(Number(dmyDot[1]))}`;
    const ymdSlash = input.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (ymdSlash) return `${ymdSlash[1]}-${pad2(Number(ymdSlash[2]))}-${pad2(Number(ymdSlash[3]))}`;
  }
  if (input instanceof Date && !isNaN(input)) return toDateKey(input);
  return toDateKey(fallbackDate);
};

const AUTH_TOKEN_KEY = 'bs3-auth-token';
const AUTH_USER_KEY = 'bs3-auth-user';

/* ─── CATEGORY COLOUR MAP ─── */
const CAT_COLORS = {
  general: { pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600' },
  tech: { pill: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', icon: 'bg-cyan-50 text-cyan-600' },
  language: { pill: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', icon: 'bg-indigo-50 text-indigo-600' },
  skill: { pill: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', icon: 'bg-sky-50 text-sky-600' },
};
const catColor = (cat) => CAT_COLORS[cat] ?? { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', icon: 'bg-slate-50 text-slate-500' };

/* ─── STAT CARD ─── */
const Stat = ({ label, value, sub }) => (
  <div className="bg-white/20 rounded-2xl px-4 py-3 flex-1 text-center">
    <p className="text-2xl font-bold syne">{value}</p>
    <p className="text-[11px] text-blue-200 font-medium mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-blue-300 mt-0.5">{sub}</p>}
  </div>
);

/* ══════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════ */
export default function App() {
  /* ─── State ─── */
  const [authToken, setAuthToken]       = useState(localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [authUser, setAuthUser]         = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [authReady, setAuthReady]       = useState(false);
  const [lang, setLang]                 = useState('vi');
  const [tab, setTab]                   = useState('dashboard');
  const [curMonth, setCurMonth]         = useState(new Date());
  const [selDate, setSelDate]           = useState(new Date());
  const [searchQ, setSearchQ]           = useState('');
  const [categories, setCategories]     = useState(DEFAULT_CATEGORIES);
  const [newCatInput, setNewCatInput]   = useState('');
  const [filterCat, setFilterCat]       = useState('all');

  const t = UI_TEXT[lang] || UI_TEXT.vi;
  const locale = LANG_META[lang]?.locale || 'vi-VN';
  const formatDate = (date, options) => date.toLocaleDateString(locale, options);
  const formatDateFromKey = (dateKey, options) => formatDate(parseDateKey(dateKey), options);
  const categoryLabel = (cat) => (CATEGORY_LABELS[lang]?.[cat] || cat);
  const seedNoteText = (seedKey) => SEED_NOTE_TEXTS[seedKey]?.[lang] || SEED_NOTE_TEXTS[seedKey]?.vi;
  const seedTaskText = (seedKey) => SEED_TASK_TEXTS[seedKey]?.[lang] || SEED_TASK_TEXTS[seedKey]?.vi;
  const getNoteTitle = (note) => note.seedKey ? seedNoteText(note.seedKey)?.title || note.title || '' : note.title || '';
  const getNoteContent = (note) => note.seedKey ? seedNoteText(note.seedKey)?.content || note.content || '' : note.content || '';
  const getTaskTitle = (task) => task.seedKey ? seedTaskText(task.seedKey) || task.task || '' : task.task || '';

  const today   = new Date();
  const todayKey = toDateKey(today);

  const [notes, setNotes] = useState(
    INITIAL_NOTE_SEEDS.map(n => ({ ...n, dateKey: todayKey }))
  );
  const [tasks, setTasks] = useState(
    INITIAL_TASK_SEEDS.map(t => ({ ...t, task: seedTaskText(t.seedKey), dateKey: todayKey }))
  );

  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'general' });
  const [newTask, setNewTask] = useState({ title: '', time: '09:00' });

  /* ─── AI ─── */
  const [aiOpen, setAiOpen]           = useState(false);
  const [aiInput, setAiInput]         = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: t.aiWelcome }
  ]);
  const chatEndRef = useRef(null);
  const userDataLoadedRef = useRef(false);

  const hydrateUserData = async (token) => {
    const { data } = await userDataApi.get(token);
    if (data) {
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES);
      setLang(typeof data.lang === 'string' ? data.lang : 'vi');
    }
    userDataLoadedRef.current = true;
  };

  const onAuthSuccess = async (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    await hydrateUserData(token);
    setAuthReady(true);
  };

  const logout = () => {
    setAuthToken('');
    setAuthUser(null);
    setAuthReady(true);
    userDataLoadedRef.current = false;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!authToken) {
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
  }, [authToken]);

  useEffect(() => {
    setChatHistory(prev => {
      if (!prev.length) return [{ role: 'ai', content: t.aiWelcome }];
      return prev;
    });
  }, [t.aiWelcome]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, aiOpen]);

  /* ─── Persistence ─── */
  useEffect(() => {
    if (authToken) return;
    try {
      const l = localStorage.getItem('bs3-lang');
      const n = localStorage.getItem('bs3-notes');
      const t = localStorage.getItem('bs3-tasks');
      const c = localStorage.getItem('bs3-cats');
      if (l && LANG_META[l]) setLang(l);
      if (n) {
        const parsed = JSON.parse(n).map(note => ({
          ...note,
          category: normalizeCategory(note.category),
          dateKey: normalizeDateKey(note.dateKey || note.date),
        }));
        setNotes(parsed);
      }
      if (t) {
        const parsed = JSON.parse(t).map(task => ({
          ...task,
          dateKey: normalizeDateKey(task.dateKey || task.date),
        }));
        setTasks(parsed);
      }
      if (c) {
        const p = JSON.parse(c).map(normalizeCategory);
        if (p.length) setCategories(p);
      }
    } catch {
      return undefined;
    }
  }, [authToken]);
  useEffect(() => {
    if (authToken) return;
    localStorage.setItem('bs3-notes', JSON.stringify(notes));
  }, [notes, authToken]);
  useEffect(() => {
    if (authToken) return;
    localStorage.setItem('bs3-tasks', JSON.stringify(tasks));
  }, [tasks, authToken]);
  useEffect(() => {
    if (authToken) return;
    localStorage.setItem('bs3-cats', JSON.stringify(categories));
  }, [categories, authToken]);
  useEffect(() => {
    if (authToken) return;
    localStorage.setItem('bs3-lang', lang);
  }, [lang, authToken]);

  useEffect(() => {
    if (!authToken || !authReady || !userDataLoadedRef.current) return;
    const timer = setTimeout(() => {
      userDataApi.save(authToken, { notes, tasks, categories, lang }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [authToken, authReady, notes, tasks, categories, lang]);

  /* ─── Calendar ─── */
  const calDays = useMemo(() => {
    const y = curMonth.getFullYear(), m = curMonth.getMonth();
    const total    = new Date(y, m + 1, 0).getDate();
    const startDay = new Date(y, m, 1).getDay();
    const blanks   = startDay === 0 ? 6 : startDay - 1;
    return [...Array(blanks).fill(null), ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))];
  }, [curMonth]);

  /* ─── Handlers ─── */
  const addCategory = () => {
    const t = newCatInput.trim();
    if (t && !categories.includes(t)) { setCategories([...categories, t]); setNewCatInput(''); }
  };
  const removeCategory = (cat) => {
    if (cat === 'general') return;
    setCategories(categories.filter(c => c !== cat));
    if (filterCat === cat) setFilterCat('all');
    if (newNote.category === cat) setNewNote({ ...newNote, category: 'general' });
  };
  const addNote = () => {
    if (!newNote.title.trim()) return;
    setNotes([{ ...newNote, id: Date.now(), dateKey: toDateKey(selDate) }, ...notes]);
    setNewNote({ title: '', content: '', category: categories[0] || 'general' });
  };
  const addTask = (e) => {
    e?.preventDefault();
    if (!newTask.title.trim()) return;
    setTasks([{ id: Date.now(), task: newTask.title, time: newTask.time || '00:00', completed: false, dateKey: toDateKey(selDate) }, ...tasks]);
    setNewTask({ title: '', time: '09:00' });
  };
  const toggleTask  = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask  = (id) => setTasks(tasks.filter(t => t.id !== id));
  const deleteNote  = (id) => setNotes(notes.filter(n => n.id !== id));

  /* ─── Derived ─── */
  const todayTasks      = tasks.filter(t => t.dateKey === todayKey);
  const completedToday  = todayTasks.filter(t => t.completed).length;
  const progress        = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const selDateKey      = toDateKey(selDate);
  const filteredTasks   = tasks.filter(t => t.dateKey === selDateKey);
  const nextTask        = tasks.find(t => !t.completed);

  const displayedNotes = (() => {
    let r = filterCat === 'all' ? notes : notes.filter(n => n.category === filterCat);
    if (searchQ.trim()) r = r.filter(n =>
      getNoteTitle(n).toLowerCase().includes(searchQ.toLowerCase()) ||
      getNoteContent(n).toLowerCase().includes(searchQ.toLowerCase())
    );
    return r;
  })();

  /* ─── AI (Anthropic) ─── */
  const handleAI = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiInput('');
    setAiLoading(true);
    try {
      const systemPrompt = `You are BlueStudy AI, a study assistant. Reply in ${t.aiReplyLang}.
    Today: ${formatDateFromKey(todayKey)}.
    Incomplete tasks: ${JSON.stringify(tasks.filter(t => !t.completed).map(task => ({ task: getTaskTitle(task), date: task.dateKey, time: task.time })))}
Danh mục: ${categories.join(', ')}

    Return plain JSON only (no markdown):
    {"reply":"text","action":"CHAT|ADD_TASK|ADD_NOTE","newTasks":[{"title":"","time":"HH:MM","dateString":"YYYY-MM-DD"}],"newNotes":[{"title":"","content":"","category":""}]}`;

      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }]
        })
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text || '{}';
      let result;
      try { result = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
      catch { result = { reply: raw, action: 'CHAT' }; }

      setChatHistory(prev => [...prev, { role: 'ai', content: result.reply || t.genericError }]);

      if (result.action === 'ADD_TASK' && result.newTasks?.length) {
        setTasks(prev => [
          ...result.newTasks.map(t => {
            const d = t.dateString ? new Date(t.dateString + 'T00:00:00') : new Date();
            return { id: Date.now() + Math.random(), task: t.title, time: t.time || '00:00', completed: false, dateKey: toDateKey(isNaN(d) ? new Date() : d) };
          }),
          ...prev
        ]);
      }
      if (result.action === 'ADD_NOTE' && result.newNotes?.length) {
        setNotes(prev => [
          ...result.newNotes.map(n => ({ id: Date.now() + Math.random(), title: n.title, content: n.content, category: categories.includes(normalizeCategory(n.category)) ? normalizeCategory(n.category) : 'general', dateKey: todayKey })),
          ...prev
        ]);
      }
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', content: t.connectionError }]);
    } finally { setAiLoading(false); }
  };

  /* ─── Nav items ─── */
  const NAV = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'calendar',  icon: CalIcon,         label: t.calendar },
    { id: 'notes',     icon: BookOpen,         label: t.notes },
  ];

  /* ════════════════════════════════
     RENDER
  ════════════════════════════════ */
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #EFF6FF 100%)' }}>
        <div className="px-5 py-3 rounded-2xl bg-white border border-sky-100 text-slate-600 font-semibold shadow-sm">
          Dang tai phien dang nhap...
        </div>
      </div>
    );
  }

  if (!authToken || !authUser) {
    return <AuthScreen onAuthSuccess={onAuthSuccess} />;
  }

  return (
    <div className="mesh-bg min-h-screen text-slate-800 md:pl-[84px] pb-24 md:pb-0 relative overflow-x-hidden">
      <style>{FONTS + STYLES}</style>

      {/* ── SIDEBAR ── */}
      <nav className="
        fixed z-50
        bottom-4 left-1/2 -translate-x-1/2
        md:left-0 md:top-0 md:bottom-0 md:translate-x-0 md:h-full
        w-[88%] md:w-[84px]
        flex md:flex-col items-center justify-between
        py-2.5 px-4 md:py-8 md:px-0
        rounded-2xl md:rounded-none
        border border-white/10 md:border-r md:border-y-0 md:border-l-0
        shadow-2xl md:shadow-none
      "
      style={{ background: 'linear-gradient(170deg, #0A1628 0%, #0F2244 100%)' }}>

        {/* Logo */}
        <div className="hidden md:flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #38BDF8, #1D4ED8)' }}>
            <Zap size={19} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="syne text-[9px] font-bold text-sky-400 tracking-[3px] uppercase">BLUE</span>
        </div>

        {/* Nav buttons */}
        <div className="flex md:flex-col gap-1.5 items-center">
          {NAV.map((item) => {
            const IconCmp = item.icon;
            return (
            <button key={item.id} onClick={() => setTab(item.id)}
              title={item.label}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group relative
                ${tab === item.id ? 'nav-active text-white' : 'text-slate-400 hover:bg-white/10 hover:text-sky-300'}`}>
              <IconCmp size={19} strokeWidth={tab === item.id ? 2.5 : 2} />
              <span className="text-[9px] mt-1 font-semibold hidden md:block tracking-wide">{item.label.split(' ')[0]}</span>
              {/* Desktop tooltip */}
              <span className="absolute left-[calc(100%+10px)] px-2.5 py-1 bg-[#0A1628] text-white text-xs rounded-lg
                opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap hidden md:block
                shadow-xl border border-white/10 pointer-events-none">{item.label}</span>
            </button>
          )})}
        </div>

        {/* Avatar */}
        <div className="hidden md:block">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=StudyBlue&backgroundColor=bfdbfe"
            className="w-9 h-9 rounded-full border-2 border-sky-500/30" alt="av" />
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pt-6 pb-6 relative z-10">

        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-[11px] font-bold text-sky-500 uppercase tracking-[2.5px] mb-1">
              {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="syne text-2xl md:text-[2rem] font-bold text-[#0A1628] leading-tight">
              {tab === 'dashboard' ? t.greeting : tab === 'calendar' ? t.schedule : t.docs}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <div className="px-3 py-2 glass rounded-xl">
              <p className="text-[11px] leading-tight text-slate-500 font-semibold">{authUser.name}</p>
              <p className="text-[10px] text-slate-400">{authUser.email}</p>
            </div>
            <Languages size={16} className="text-sky-500" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label={t.language}
              className="px-2.5 py-2 glass rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400/30"
            >
              {Object.entries(LANG_META).map(([k, v]) => <option key={k} value={k}>{v.flag} {v.name}</option>)}
            </select>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
            >
              Dang xuat
            </button>
          </div>
          {tab === 'notes' && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder={t.searchDocs}
                className="pl-9 pr-4 py-2.5 glass rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all w-52 sm:w-64 placeholder:text-slate-400" />
            </div>
          )}
        </header>

        {/* ════════════════ DASHBOARD ════════════════ */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 anim-tab">

            {/* Hero card */}
            <div className="lg:col-span-2 rounded-3xl p-7 md:p-9 text-white relative overflow-hidden shadow-2xl shadow-blue-950/25"
              style={{ background: 'linear-gradient(145deg, #0A1628 0%, #0F2A5F 60%, #0F3D7A 100%)' }}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                  <span className="text-[10px] font-bold text-sky-300 uppercase tracking-[2px]">{t.todayProgress}</span>
                </div>
                <h2 className="syne text-5xl font-bold leading-none">{progress}<span className="text-2xl text-blue-300">%</span></h2>
                <p className="text-sky-200 text-sm mt-1 mb-5">{completedToday}/{todayTasks.length} {t.completedTasks}</p>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #38BDF8, #06B6D4)' }} />
                </div>

                <div className="flex gap-3">
                  <Stat label={t.docsCount} value={notes.length} />
                  <Stat label={t.tasksCount} value={tasks.length} />
                  <Stat label={t.categoriesCount} value={categories.length} />
                </div>
              </div>
              {/* Glow decorations */}
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #38BDF8, transparent)' }} />
              <div className="absolute right-12 -bottom-10 w-40 h-40 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />
            </div>

            {/* Today's tasks */}
            <div className="glass rounded-3xl p-5 flex flex-col shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="syne font-bold text-[#0A1628]">{t.today}</h3>
                <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-2 py-1 rounded-full">{todayTasks.length} TASKS</span>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto scroll max-h-[200px]">
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${task.completed ? 'opacity-45' : 'hover:bg-sky-50/70'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                      ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-sky-400'}`}>
                      {task.completed && <Check size={11} strokeWidth={3.5} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-all ${task.completed ? 'strike text-slate-400' : 'text-slate-700'}`}>{getTaskTitle(task)}</p>
                      <p className="text-[11px] text-slate-400">{task.time}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 opacity-50">
                    <CheckCircle2 size={30} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">{t.noTasksYet}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setTab('calendar')}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(90deg, #0EA5E9, #0284C7)' }}>
                <Plus size={15} strokeWidth={3} /> {t.addTask}
              </button>
            </div>

            {/* Recent notes */}
            <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="syne font-bold text-[#0A1628]">{t.recentDocs}</h3>
                <button onClick={() => setTab('notes')} className="text-xs text-sky-500 hover:text-sky-700 font-semibold transition-colors">{t.viewAll}</button>
              </div>
              <div className="space-y-2">
                {notes.slice(0, 3).map(note => {
                  const cc = catColor(note.category);
                  return (
                    <div key={note.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-sky-50/60 transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cc.icon}`}>
                        <BookOpen size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{getNoteTitle(note)}</p>
                        <p className="text-[11px] text-slate-400">{categoryLabel(note.category)} · {formatDateFromKey(note.dateKey)}</p>
                      </div>
                    </div>
                  );
                })}
                {notes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{t.noDocs}</p>}
              </div>
            </div>

            {/* Next task card */}
            <div className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}>
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, white, transparent)' }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="opacity-80" />
                  <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">{t.nextTask}</span>
                </div>
                {nextTask ? (
                  <>
                    <h3 className="syne text-lg font-bold leading-snug mb-4">{getTaskTitle(nextTask)}</h3>
                    <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
                      <Clock size={14} />
                      <span className="text-sm font-medium">{nextTask.time}</span>
                      <span className="text-xs opacity-60 ml-auto">{formatDateFromKey(nextTask.dateKey)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-white/70 text-sm mt-2">🎉 {t.allDone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ CALENDAR ════════════════ */}
        {tab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 anim-tab">

            {/* Calendar grid */}
            <div className="lg:col-span-3 glass rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-7">
                <h2 className="syne text-xl font-bold text-[#0A1628]">
                  {t.month} {curMonth.getMonth() + 1} &nbsp;·&nbsp; {curMonth.getFullYear()}
                </h2>
                <div className="flex gap-1">
                  {[ChevronLeft, ChevronRight].map((ArrowIcon, i) => (
                    <button key={i}
                      onClick={() => setCurMonth(new Date(curMonth.getFullYear(), curMonth.getMonth() + (i ? 1 : -1)))}
                      className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-sky-100 hover:text-sky-600 rounded-xl transition-colors">
                      <ArrowIcon size={17} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-7 text-center mb-1">
                {formatDate(new Date(2025, 0, 6), { weekday: 'short' }) && ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((_, idx) => (
                  <div key={idx} className="text-[10px] font-bold text-slate-400 py-2 uppercase tracking-wider">
                    {formatDate(new Date(2025, 0, 6 + idx), { weekday: 'short' }).slice(0, 2)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calDays.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const dateKey    = toDateKey(date);
                  const isSelected = dateKey === selDateKey;
                  const isToday    = dateKey === todayKey;
                  const hasTasks   = tasks.some(t => t.dateKey === dateKey);
                  return (
                    <button key={i} onClick={() => setSelDate(date)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-200
                        ${isSelected ? 'text-white shadow-lg scale-110 z-10' : isToday ? 'text-sky-600 font-bold bg-sky-50' : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-600'}`}
                      style={isSelected ? { background: 'linear-gradient(135deg, #0EA5E9, #1D4ED8)', boxShadow: '0 4px 14px #0EA5E955' } : {}}>
                      {date.getDate()}
                      {hasTasks && <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/60' : 'bg-sky-500'}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task list */}
            <div className="lg:col-span-2 glass rounded-3xl p-6 flex flex-col shadow-sm min-h-[450px]">
              <div className="mb-5">
                <p className="text-[11px] font-bold text-sky-500 uppercase tracking-[2px]">
                  {formatDate(selDate, { weekday: 'long' })}
                </p>
                <h2 className="syne text-2xl font-bold text-[#0A1628]">
                  {selDate.getDate()} / {selDate.getMonth() + 1}
                </h2>
              </div>

              {/* Add task */}
              <form onSubmit={addTask} className="flex gap-2 mb-4">
                <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder={t.addTask + '...'}
                  className="flex-1 px-3 py-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all min-w-0 placeholder:text-slate-400" />
                <input type="time" value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })}
                  className="w-[80px] px-2 py-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all text-slate-600 shrink-0" />
                <button type="submit"
                  className="w-[38px] h-[38px] text-white rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90"
                  style={{ background: 'linear-gradient(135deg,#38BDF8,#0284C7)' }}>
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </form>

              <div className="flex-1 space-y-2 overflow-y-auto scroll">
                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                  <div key={task.id}
                    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                      ${task.completed ? 'border-transparent bg-slate-50/50 opacity-50' : 'border-sky-100/60 bg-white/60 hover:border-sky-300 hover:shadow-sm'}`}>
                    <button onClick={() => toggleTask(task.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200
                        ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-sky-400'}`}>
                      {task.completed && <Check size={11} strokeWidth={3.5} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-all ${task.completed ? 'strike text-slate-400' : 'text-slate-800'}`}>{getTaskTitle(task)}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0">{task.time}</span>
                    <button onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center text-center py-12 opacity-40">
                    <CalIcon size={36} strokeWidth={1} className="text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">{t.emptyDay}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ NOTES ════════════════ */}
        {tab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 anim-tab">

            {/* Category sidebar */}
            <div className="lg:col-span-1">
              <div className="glass rounded-3xl p-5 shadow-sm sticky top-5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[2.5px] mb-3">{t.categories}</h3>
                <div className="space-y-1 mb-4">
                  {['all', ...categories].map(cat => {
                    const cc    = catColor(cat);
                    const count = cat === 'all' ? notes.length : notes.filter(n => n.category === cat).length;
                    const active = filterCat === cat;
                    return (
                      <div key={cat} onClick={() => setFilterCat(cat)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all
                          ${active ? 'text-white' : 'text-slate-600 hover:bg-sky-50/70'}`}
                        style={active ? { background: 'linear-gradient(90deg, #0A1628, #0F2A5F)' } : {}}>
                        <div className="flex items-center gap-2.5">
                          {cat !== 'all' && <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-sky-300' : cc.dot}`} />}
                          <span className="text-sm font-medium">{cat === 'all' ? t.allFilter : categoryLabel(cat)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${active ? 'text-sky-300' : 'text-slate-400'}`}>{count}</span>
                          {cat !== 'all' && cat !== 'general' && !active && (
                            <button onClick={e => { e.stopPropagation(); removeCategory(cat); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-sky-100 pt-3 flex gap-1.5">
                  <input value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                    placeholder={t.addCategory}
                    className="flex-1 px-2.5 py-2 bg-sky-50/60 border border-sky-100 rounded-lg text-xs font-medium focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-400" />
                  <button onClick={addCategory}
                    className="w-8 h-8 text-white rounded-lg flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'linear-gradient(135deg,#38BDF8,#0284C7)' }}>
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes main */}
            <div className="lg:col-span-3 space-y-5">
              {/* Add note form */}
              <div className="glass rounded-3xl p-6 shadow-sm focus-within:ring-2 focus-within:ring-sky-400/25 transition-all">
                <input value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  placeholder={t.docTitle}
                  className="syne w-full bg-transparent text-xl font-bold text-[#0A1628] placeholder:text-slate-300 focus:outline-none mb-3" />
                <div className="flex items-center gap-3 mb-3">
                  <select value={newNote.category} onChange={e => setNewNote({ ...newNote, category: e.target.value })}
                    className="text-xs font-bold px-2.5 py-1.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg focus:outline-none cursor-pointer">
                    {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                  </select>
                  <span className="text-xs text-slate-400 font-medium">{formatDate(selDate)}</span>
                </div>
                <textarea value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder={t.contentPlaceholder}
                  rows={3}
                  className="w-full bg-transparent resize-none text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none leading-relaxed scroll" />
                <div className="flex justify-end pt-4 border-t border-sky-50">
                  <button onClick={addNote} disabled={!newNote.title.trim()}
                    className="px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0A1628, #0F2A5F)' }}>
                    {t.saveDoc}
                  </button>
                </div>
              </div>

              {/* Notes masonry grid */}
              <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                {displayedNotes.map(note => {
                  const cc = catColor(note.category);
                  return (
                    <div key={note.id}
                      className="break-inside-avoid glass rounded-2xl p-5 hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${cc.pill}`}>{categoryLabel(note.category)}</span>
                        <button onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-all rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h3 className="syne text-base font-bold text-slate-900 mb-2 leading-snug">{getNoteTitle(note)}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">{getNoteContent(note)}</p>
                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-sky-50/80 text-[11px] text-slate-400 font-medium">
                        <Clock size={11} /> {formatDateFromKey(note.dateKey)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {displayedNotes.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <BookOpen size={40} strokeWidth={1} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-semibold">{t.noDocsShort}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.startByAdding}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ════════════════ FLOATING AI ════════════════ */}
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100]">

        {/* Chat panel */}
        <div className={`absolute bottom-[68px] right-0 w-[300px] sm:w-[360px] bg-white rounded-2xl overflow-hidden flex flex-col
          border border-sky-100/60 shadow-2xl shadow-blue-900/20 transition-all duration-300 origin-bottom-right
          ${aiOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}>

          {/* Header */}
          <div className="p-4 text-white flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0F3D7A 100%)' }}>
            <div className="w-8 h-8 rounded-full bg-sky-400/25 flex items-center justify-center">
              <Bot size={16} className="text-sky-300" />
            </div>
            <div className="flex-1">
              <p className="syne text-sm font-bold">BlueStudy AI</p>
              <p className="text-[10px] text-sky-300">{t.aiHelper}</p>
            </div>
            <button onClick={() => setAiOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="h-[260px] overflow-y-auto p-3 space-y-3 scroll" style={{ background: '#F0F9FF88' }}>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-2 anim-fade ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                  ${msg.role === 'user' ? 'bg-slate-200' : 'bg-sky-100'}`}>
                  {msg.role === 'user'
                    ? <User size={12} className="text-slate-500" />
                    : <Bot size={12} className="text-sky-600" />}
                </div>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed max-w-[78%]
                  ${msg.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'bg-white border border-sky-100/50 shadow-sm text-slate-700 rounded-tl-sm'}`}
                  style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#0A1628,#0F2A5F)' } : {}}>
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

          {/* Input */}
          <div className="p-3 border-t border-sky-100/50 bg-white">
            <form onSubmit={handleAI} className="flex gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} disabled={aiLoading}
                placeholder={t.aiPlaceholder}
                className="flex-1 px-3 py-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all placeholder:text-slate-400" />
              <button type="submit" disabled={!aiInput.trim() || aiLoading}
                className="w-9 h-9 text-white rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#38BDF8,#0284C7)' }}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* FAB */}
        <button onClick={() => setAiOpen(!aiOpen)}
          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300
            ${aiOpen ? 'rotate-12 scale-95' : 'hover:scale-110'}`}
          style={aiOpen
            ? { background: '#1E293B' }
            : { background: 'linear-gradient(135deg, #38BDF8 0%, #1D4ED8 100%)', boxShadow: '0 8px 30px #0EA5E970' }}>
          {aiOpen ? <X size={22} /> : <Sparkles size={22} strokeWidth={2} />}
          {!aiOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
