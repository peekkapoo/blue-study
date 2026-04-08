import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  ListFilter,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  MCQ_OPTION_LABELS,
  createDefaultMultipleChoicesData,
  normalizeMultipleChoicesData,
  normalizeMultipleChoicesQuestion,
} from './multipleChoicesSchema';

const SORT_OPTIONS = [
  { id: 'QUESTION_ASC', label: 'Question 1 -> 99' },
  { id: 'QUESTION_DESC', label: 'Question 99 -> 1' },
  { id: 'A_Z', label: 'A -> Z' },
  { id: 'Z_A', label: 'Z -> A' },
];

const clampToDigits = (value, maxLength = 4) => String(value ?? '').replace(/\D+/g, '').slice(0, maxLength);

const formatClock = (seconds) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const remSeconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${remSeconds}`;
};

const shuffleArray = (input) => {
  const output = [...input];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
};

const getRowValue = (row, aliases) => {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const normalizeRowKeys = (row) => Object.entries(row).reduce((acc, [key, value]) => {
  const normalizedKey = String(key).replace(/^\uFEFF/, '').trim().toLowerCase();
  acc[normalizedKey] = value;
  return acc;
}, {});

const uniq = (items) => Array.from(new Set(items));

const byQuestionOrder = (a, b) => {
  const idA = Number.parseInt(String(a.id ?? ''), 10);
  const idB = Number.parseInt(String(b.id ?? ''), 10);

  if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB;
  if (Number.isFinite(idA)) return -1;
  if (Number.isFinite(idB)) return 1;
  return String(a.text || '').localeCompare(String(b.text || ''));
};

const getArchiveSorter = (sortOrder) => {
  if (sortOrder === 'QUESTION_DESC') {
    return (a, b) => byQuestionOrder(b, a);
  }
  if (sortOrder === 'A_Z') {
    return (a, b) => String(a.text || '').localeCompare(String(b.text || ''), undefined, { sensitivity: 'base', numeric: true });
  }
  if (sortOrder === 'Z_A') {
    return (a, b) => String(b.text || '').localeCompare(String(a.text || ''), undefined, { sensitivity: 'base', numeric: true });
  }
  return byQuestionOrder;
};

export default function MultipleChoicesLab({ data, onChange, theme = 'light' }) {
  const isDarkTheme = theme === 'dark';
  const safeData = useMemo(() => normalizeMultipleChoicesData(data), [data]);
  const questionBank = safeData.questionBank;
  const attempts = safeData.attempts;
  const preferences = safeData.preferences;

  const [screen, setScreen] = useState('setup');
  const [activeQuizData, setActiveQuizData] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizTimeLimitSeconds, setQuizTimeLimitSeconds] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSectionFilter, setArchiveSectionFilter] = useState('ALL');
  const [archiveSortOrder, setArchiveSortOrder] = useState('QUESTION_ASC');

  const [isExcelReady, setIsExcelReady] = useState(false);
  const [excelStatusMessage, setExcelStatusMessage] = useState('');

  const xlsxRef = useRef(null);
  const fileInputRef = useRef(null);
  const attemptSavedRef = useRef(false);

  const commitData = useCallback((updater) => {
    if (typeof onChange !== 'function') return;

    onChange((prevRaw) => {
      const prev = normalizeMultipleChoicesData(prevRaw);
      const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
      return normalizeMultipleChoicesData(nextRaw);
    });
  }, [onChange]);

  const updatePreferences = useCallback((patchOrUpdater) => {
    commitData((prev) => {
      const patch = typeof patchOrUpdater === 'function'
        ? patchOrUpdater(prev.preferences)
        : patchOrUpdater;

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          ...(patch || {}),
        },
      };
    });
  }, [commitData]);

  const availableSections = useMemo(
    () => uniq(questionBank.map((question) => question.section || 'Uncategorized')),
    [questionBank],
  );

  const selectedSections = useMemo(() => {
    if (preferences.selectedSections.length) return preferences.selectedSections;
    return availableSections;
  }, [preferences.selectedSections, availableSections]);

  const maxQuestionCount = useMemo(
    () => questionBank.filter((question) => selectedSections.includes(question.section)).length,
    [questionBank, selectedSections],
  );

  useEffect(() => {
    let active = true;

    import('xlsx')
      .then((xlsxModule) => {
        if (!active) return;
        xlsxRef.current = xlsxModule;
        setIsExcelReady(true);
        setExcelStatusMessage('');
      })
      .catch((error) => {
        console.error('Failed to load xlsx:', error);
        if (!active) return;
        setIsExcelReady(false);
        setExcelStatusMessage('Excel parser is unavailable. Import/export is disabled.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'quiz') return undefined;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (quizTimeLimitSeconds === null) return;

      setTimeRemaining((prev) => {
        if (!Number.isFinite(prev)) return 0;
        if (prev <= 1) {
          clearInterval(timer);
          setScreen('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, quizTimeLimitSeconds]);

  const answeredCount = useMemo(() => Object.keys(userAnswers).length, [userAnswers]);

  const correctCount = useMemo(
    () => Object.keys(userAnswers).filter((idx) => userAnswers[idx] === activeQuizData[idx]?.correctAnswer).length,
    [userAnswers, activeQuizData],
  );

  const wrongCount = Math.max(0, answeredCount - correctCount);
  const unansweredCount = Math.max(0, activeQuizData.length - answeredCount);
  const scorePercent = activeQuizData.length ? Math.round((correctCount / activeQuizData.length) * 100) : 0;

  useEffect(() => {
    if (screen !== 'result' || !activeQuizData.length || attemptSavedRef.current) return;

    const attempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      totalQuestions: activeQuizData.length,
      answeredCount,
      correctCount,
      wrongCount,
      unansweredCount,
      scorePercent,
      timeUsedSeconds: elapsedSeconds,
      timeLimitSeconds: quizTimeLimitSeconds,
      sections: uniq(activeQuizData.map((question) => question.section || 'Uncategorized')),
      wrongQuestionIds: activeQuizData
        .filter((question, index) => {
          const selected = userAnswers[index];
          return Boolean(selected) && selected !== question.correctAnswer;
        })
        .map((question) => question.id),
    };

    commitData((prev) => ({
      ...prev,
      attempts: [attempt, ...prev.attempts],
    }));

    attemptSavedRef.current = true;
  }, [
    screen,
    activeQuizData,
    answeredCount,
    correctCount,
    wrongCount,
    unansweredCount,
    scorePercent,
    elapsedSeconds,
    quizTimeLimitSeconds,
    userAnswers,
    commitData,
  ]);

  const toggleSection = useCallback((section) => {
    updatePreferences((prev) => {
      const current = Array.isArray(prev.selectedSections) ? prev.selectedSections : [];
      if (current.includes(section)) {
        if (current.length <= 1) {
          return { selectedSections: current };
        }
        return { selectedSections: current.filter((item) => item !== section) };
      }

      return { selectedSections: [...current, section] };
    });
  }, [updatePreferences]);

  const startQuiz = useCallback(() => {
    let filtered = questionBank.filter((question) => selectedSections.includes(question.section));

    if (!filtered.length) {
      window.alert('No questions available for the current filters.');
      return;
    }

    if (preferences.isShuffleQuestions) {
      filtered = shuffleArray(filtered);
    }

    const limit = Number.parseInt(preferences.questionCountInput, 10);
    if (!Number.isNaN(limit) && limit <= 0) {
      window.alert('Question count must be greater than 0.');
      return;
    }

    if (!Number.isNaN(limit) && limit > filtered.length) {
      window.alert(`The selected sections only contain ${filtered.length} question(s).`);
      return;
    }

    if (!Number.isNaN(limit) && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    const preparedQuestions = filtered.map((question) => {
      const displayOptions = MCQ_OPTION_LABELS
        .filter((label) => question.options[label])
        .map((label) => ({ key: label, text: question.options[label] }));

      return {
        ...question,
        displayOptions,
      };
    });

    if (!preparedQuestions.length) {
      window.alert('No valid questions found after processing.');
      return;
    }

    let selectedTimeLimitSeconds = preparedQuestions.length * 60;
    const customMinutes = Number.parseInt(preferences.timeLimitInput, 10);

    if (preferences.isUnlimitedTime) {
      selectedTimeLimitSeconds = null;
    } else if (preferences.timeLimitInput.trim()) {
      if (Number.isNaN(customMinutes) || customMinutes <= 0) {
        window.alert('Custom time limit must be a number greater than 0.');
        return;
      }
      selectedTimeLimitSeconds = customMinutes * 60;
    }

    attemptSavedRef.current = false;
    setActiveQuizData(preparedQuestions);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setElapsedSeconds(0);
    setQuizTimeLimitSeconds(selectedTimeLimitSeconds);
    setTimeRemaining(selectedTimeLimitSeconds ?? 0);
    setScreen('quiz');
  }, [questionBank, selectedSections, preferences]);

  const finishQuiz = useCallback(() => {
    setScreen('result');
  }, []);

  const resetToSetup = useCallback(() => {
    setScreen('setup');
    setCurrentQuestionIdx(0);
    setActiveQuizData([]);
    setUserAnswers({});
    setElapsedSeconds(0);
    setTimeRemaining(0);
    setQuizTimeLimitSeconds(null);
    attemptSavedRef.current = false;
  }, []);

  const handleSelectAnswer = useCallback((optionKey) => {
    setUserAnswers((prev) => {
      if (prev[currentQuestionIdx]) return prev;
      return {
        ...prev,
        [currentQuestionIdx]: optionKey,
      };
    });
  }, [currentQuestionIdx]);

  const importQuestionsFromRows = useCallback((rows) => {
    const importedQuestions = rows
      .map((row, index) => {
        const normalizedRow = normalizeRowKeys(row);

        return normalizeMultipleChoicesQuestion({
          id: getRowValue(normalizedRow, ['no.', 'no', 'id']),
          section: getRowValue(normalizedRow, ['section']),
          text: getRowValue(normalizedRow, ['question']),
          options: {
            A: getRowValue(normalizedRow, ['option a', 'a']),
            B: getRowValue(normalizedRow, ['option b', 'b']),
            C: getRowValue(normalizedRow, ['option c', 'c']),
            D: getRowValue(normalizedRow, ['option d', 'd']),
          },
          correctAnswer: getRowValue(normalizedRow, ['correct answer', 'answer']),
          explanation: getRowValue(normalizedRow, ['explanation']),
        }, index);
      })
      .filter(Boolean);

    if (!importedQuestions.length) {
      window.alert('No valid questions found in the file. Check required columns and file format.');
      return;
    }

    const importedSections = uniq(importedQuestions.map((question) => question.section || 'Uncategorized'));

    commitData((prev) => ({
      ...prev,
      questionBank: importedQuestions,
      preferences: {
        ...prev.preferences,
        selectedSections: importedSections,
        questionCountInput: '',
      },
    }));

    setArchiveSectionFilter('ALL');
    window.alert(`Imported ${importedQuestions.length} question(s) successfully.`);
  }, [commitData]);

  const handleImportExcel = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const XLSX = xlsxRef.current;
    if (!XLSX) {
      window.alert('Excel parser is not ready yet. Please wait and try again.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isCsv = extension === 'csv';
    const supported = ['xlsx', 'xls', 'csv'];

    if (!supported.includes(extension)) {
      window.alert('Unsupported file format. Please upload .xlsx, .xls, or .csv.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        let workbook;

        if (isCsv) {
          const csvText = String(loadEvent.target?.result || '').replace(/^\uFEFF/, '');
          const firstLine = csvText.split(/\r?\n/, 1)[0] || '';
          const commaCount = (firstLine.match(/,/g) || []).length;
          const semicolonCount = (firstLine.match(/;/g) || []).length;
          const delimiter = semicolonCount > commaCount ? ';' : ',';

          workbook = XLSX.read(csvText, {
            type: 'string',
            raw: true,
            FS: delimiter,
          });
        } else {
          const arrayBuffer = loadEvent.target?.result;
          const bytes = new Uint8Array(arrayBuffer);
          workbook = XLSX.read(bytes, { type: 'array' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        importQuestionsFromRows(rows);
      } catch (error) {
        console.error('Import failed:', error);
        window.alert('Failed to parse file. Please check the format and try again.');
      }
    };

    if (isCsv) {
      reader.readAsText(file, 'utf-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [importQuestionsFromRows]);

  const handleExportExcel = useCallback(() => {
    const XLSX = xlsxRef.current;
    if (!XLSX) {
      window.alert('Excel parser is not ready yet. Please wait and try again.');
      return;
    }

    const source = questionBank.length
      ? questionBank
      : createDefaultMultipleChoicesData().questionBank;

    const exportRows = source.map((question) => ({
      Section: question.section || 'Uncategorized',
      'No.': question.id,
      Question: question.text,
      'Option A': question.options.A || '',
      'Option B': question.options.B || '',
      'Option C': question.options.C || '',
      'Option D': question.options.D || '',
      'Correct Answer': question.correctAnswer,
      Explanation: question.explanation || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    const nowDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `BlueStudy_MCQ_Template_${nowDate}.xlsx`);
  }, [questionBank]);

  const archiveData = useMemo(() => {
    const keyword = archiveSearch.trim().toLowerCase();

    return questionBank
      .filter((question) => {
        const section = question.section || 'Uncategorized';
        const matchSection = archiveSectionFilter === 'ALL' || archiveSectionFilter === section;

        if (!matchSection) return false;

        if (!keyword) return true;

        const optionText = Object.values(question.options || {}).join(' ').toLowerCase();
        const explanation = String(question.explanation || '').toLowerCase();

        return (
          String(question.text || '').toLowerCase().includes(keyword)
          || optionText.includes(keyword)
          || explanation.includes(keyword)
          || String(question.id).includes(keyword)
        );
      })
      .sort(getArchiveSorter(archiveSortOrder));
  }, [questionBank, archiveSearch, archiveSectionFilter, archiveSortOrder]);

  const currentQuestion = activeQuizData[currentQuestionIdx] || null;
  const hasAnsweredCurrent = Boolean(userAnswers[currentQuestionIdx]);
  const selectedAnswerKey = userAnswers[currentQuestionIdx];
  const currentAnswerCorrect = currentQuestion && selectedAnswerKey === currentQuestion.correctAnswer;

  const reviewedAnswers = useMemo(() => {
    return activeQuizData
      .map((question, index) => {
        const selectedAnswer = userAnswers[index] || null;
        const isCorrect = selectedAnswer === question.correctAnswer;

        return {
          index,
          question,
          selectedAnswer,
          isCorrect,
        };
      })
      .sort((a, b) => {
        if (a.isCorrect === b.isCorrect) return a.index - b.index;
        return a.isCorrect ? 1 : -1;
      });
  }, [activeQuizData, userAnswers]);

  const cardClass = isDarkTheme
    ? 'glass border border-slate-700/70 bg-slate-900/70'
    : 'glass border border-sky-100 bg-white/85';

  const sectionChipClass = isDarkTheme
    ? 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-sky-400/50 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50';

  const sectionChipActiveClass = isDarkTheme
    ? 'border-sky-400 bg-sky-500/20 text-sky-200'
    : 'border-sky-400 bg-sky-100 text-sky-700';

  const subtleInputClass = isDarkTheme
    ? 'border-slate-600 bg-slate-900/70 text-slate-100 placeholder:text-slate-400'
    : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400';

  const neutralButtonClass = isDarkTheme
    ? 'border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';

  const optionDefaultClass = isDarkTheme
    ? 'border-slate-600 bg-slate-900/70 text-slate-100 hover:border-sky-400/60 hover:bg-slate-800'
    : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50';

  if (screen === 'setup') {
    return (
      <section className="space-y-5">
        <div className={`${cardClass} rounded-3xl p-5 md:p-6 shadow-sm`}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-sky-500/80">Multiple Choices</p>
              <h2 className="syne text-2xl font-bold text-[#0A1628]">Exam Setup</h2>
              <p className="text-xs text-slate-500 mt-1">Manage question banks, configure tests, and review attempt history.</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                <FileSpreadsheet size={12} /> {questionBank.length} questions
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border ${isExcelReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {isExcelReady ? 'Parser ready' : 'Parser loading'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileInputRef}
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isExcelReady}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${neutralButtonClass}`}
            >
              <Upload size={14} /> Import question bank
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!isExcelReady}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${neutralButtonClass}`}
            >
              <Download size={14} /> Export template
            </button>
          </div>

          {excelStatusMessage && (
            <p className="text-xs text-amber-600 mt-3">{excelStatusMessage}</p>
          )}
        </div>

        <div className={`${cardClass} rounded-3xl p-5 md:p-6 shadow-sm space-y-5`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-sky-500/80 mb-3">Select sections</p>
            <div className="flex flex-wrap gap-2">
              {availableSections.map((section) => {
                const active = selectedSections.includes(section);
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => toggleSection(section)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${active ? sectionChipActiveClass : sectionChipClass}`}
                  >
                    {section}
                    {active && <Check size={12} />}
                  </button>
                );
              })}
            </div>
            {!availableSections.length && (
              <p className="text-xs text-slate-500">No sections found. Import a question bank to begin.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Number of questions
              <input
                type="text"
                inputMode="numeric"
                value={preferences.questionCountInput}
                onChange={(event) => updatePreferences({ questionCountInput: clampToDigits(event.target.value) })}
                placeholder={`Max ${maxQuestionCount} (empty = all)`}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${subtleInputClass}`}
              />
            </label>

            <label className="text-xs text-slate-500">
              Time limit (minutes)
              <input
                type="text"
                inputMode="numeric"
                value={preferences.timeLimitInput}
                onChange={(event) => updatePreferences({ timeLimitInput: clampToDigits(event.target.value) })}
                placeholder="Empty = 1 minute per question"
                disabled={preferences.isUnlimitedTime}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-60 ${subtleInputClass}`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updatePreferences({ isShuffleQuestions: !preferences.isShuffleQuestions })}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold inline-flex items-center justify-between ${preferences.isShuffleQuestions ? sectionChipActiveClass : neutralButtonClass}`}
            >
              <span className="inline-flex items-center gap-2">
                <Shuffle size={14} /> Shuffle questions
              </span>
              <span>{preferences.isShuffleQuestions ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={() => updatePreferences((prev) => ({
                isUnlimitedTime: !prev.isUnlimitedTime,
                timeLimitInput: prev.isUnlimitedTime ? prev.timeLimitInput : '',
              }))}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold inline-flex items-center justify-between ${preferences.isUnlimitedTime ? sectionChipActiveClass : neutralButtonClass}`}
            >
              <span className="inline-flex items-center gap-2">
                <Clock size={14} /> Unlimited time
              </span>
              <span>{preferences.isUnlimitedTime ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={startQuiz}
              disabled={!maxQuestionCount}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Play size={14} /> Start exam
            </button>

            <button
              type="button"
              onClick={() => setScreen('archive')}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${neutralButtonClass}`}
            >
              <ListFilter size={14} /> View archive
            </button>
          </div>
        </div>

        <div className={`${cardClass} rounded-3xl p-5 md:p-6 shadow-sm`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="syne text-lg font-bold text-[#0A1628]">Recent Attempts</h3>
            <span className="text-xs text-slate-500">{attempts.length} saved</span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll">
            {attempts.slice(0, 10).map((attempt) => (
              <div key={attempt.id} className="rounded-xl border border-sky-100 bg-white/70 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Score {attempt.scorePercent}%</p>
                  <span className="text-[11px] text-slate-500">{new Date(attempt.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {attempt.correctCount}/{attempt.totalQuestions} correct · {attempt.timeLimitSeconds === null ? 'No limit' : formatClock(attempt.timeUsedSeconds)}
                </p>
              </div>
            ))}
            {!attempts.length && <p className="text-sm text-slate-500">No attempt history yet.</p>}
          </div>
        </div>
      </section>
    );
  }

  if (screen === 'archive') {
    return (
      <section className="space-y-4">
        <div className={`${cardClass} rounded-3xl p-4 md:p-5 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScreen('setup')}
                className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center ${neutralButtonClass}`}
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="syne text-xl font-bold text-[#0A1628]">Question Archive</h2>
            </div>
            <span className="text-xs text-slate-500">{archiveData.length} shown / {questionBank.length} total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_180px] gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={archiveSearch}
                onChange={(event) => setArchiveSearch(event.target.value)}
                placeholder="Search by id, text, option, explanation"
                className={`w-full rounded-xl border py-2 pl-8 pr-3 text-sm ${subtleInputClass}`}
              />
            </div>

            <select
              value={archiveSectionFilter}
              onChange={(event) => setArchiveSectionFilter(event.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm ${subtleInputClass}`}
            >
              <option value="ALL">All sections</option>
              {availableSections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>

            <select
              value={archiveSortOrder}
              onChange={(event) => setArchiveSortOrder(event.target.value)}
              className={`rounded-xl border px-3 py-2 text-sm ${subtleInputClass}`}
            >
              {SORT_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {archiveData.map((question) => (
            <article key={`${question.id}-${question.section}-${question.text.slice(0, 24)}`} className={`${cardClass} rounded-2xl p-4 md:p-5 shadow-sm`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex px-2 py-1 rounded-lg text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200">Q{question.id}</span>
                <span className="inline-flex px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{question.section}</span>
              </div>

              <h3 className="text-base md:text-lg font-semibold text-slate-800 leading-relaxed mb-3">{question.text}</h3>

              <div className="space-y-2">
                {MCQ_OPTION_LABELS.map((label) => {
                  const optionText = question.options[label];
                  if (!optionText) return null;
                  const isCorrect = label === question.correctAnswer;
                  return (
                    <div key={label} className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white/85 border-slate-200 text-slate-700'}`}>
                      <span className="font-bold">{label}.</span>
                      <span className="flex-1">{optionText}</span>
                      {isCorrect && <CheckCircle2 size={14} className="mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              {question.explanation && (
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-sm text-indigo-700">
                  <p className="font-semibold mb-0.5">Explanation</p>
                  <p>{question.explanation}</p>
                </div>
              )}
            </article>
          ))}

          {!archiveData.length && (
            <div className={`${cardClass} rounded-2xl p-8 text-center text-slate-500`}>
              No matching questions.
            </div>
          )}
        </div>
      </section>
    );
  }

  if (screen === 'result') {
    return (
      <section className="space-y-4">
        <div className={`${cardClass} rounded-3xl p-5 md:p-6 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-sky-500/80">Result</p>
              <h2 className="syne text-2xl font-bold text-[#0A1628]">Exam Completed</h2>
              <p className="text-sm text-slate-500 mt-1">Wrong answers are listed first for faster review.</p>
            </div>
            <button
              type="button"
              onClick={resetToSetup}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 ${neutralButtonClass}`}
            >
              <RotateCcw size={14} /> Back to setup
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2">
              <p className="text-[11px] text-slate-500">Score</p>
              <p className="syne text-2xl text-slate-800">{scorePercent}%</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
              <p className="text-[11px] text-slate-500">Correct</p>
              <p className="syne text-2xl text-emerald-700">{correctCount}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2">
              <p className="text-[11px] text-slate-500">Wrong</p>
              <p className="syne text-2xl text-rose-700">{wrongCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
              <p className="text-[11px] text-slate-500">Unanswered</p>
              <p className="syne text-2xl text-slate-700">{unansweredCount}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white/70 px-3 py-2">
              <p className="text-[11px] text-slate-500">Time used</p>
              <p className="syne text-2xl text-sky-700">
                {quizTimeLimitSeconds === null
                  ? `${formatClock(elapsedSeconds)} (no limit)`
                  : formatClock(elapsedSeconds)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {reviewedAnswers.map((item) => (
            <article key={`${item.question.id}-${item.index}`} className={`${cardClass} rounded-2xl p-4 md:p-5 shadow-sm`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex w-8 h-8 rounded-lg bg-sky-100 text-sky-700 items-center justify-center text-sm font-bold">{item.index + 1}</span>
                  <span className="inline-flex px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">{item.question.section}</span>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.isCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>

              <h3 className="text-base font-semibold text-slate-800 leading-relaxed mb-3">{item.question.text}</h3>

              <div className="space-y-2">
                {MCQ_OPTION_LABELS.map((label) => {
                  const optionText = item.question.options[label];
                  if (!optionText) return null;

                  const isCorrectOption = label === item.question.correctAnswer;
                  const isWrongSelection = item.selectedAnswer === label && !item.isCorrect;

                  return (
                    <div
                      key={label}
                      className={`rounded-xl border px-3 py-2 text-sm flex items-start gap-2 ${
                        isCorrectOption
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : isWrongSelection
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-white/85 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-bold">{label}.</span>
                      <span className="flex-1">{optionText}</span>
                      {isCorrectOption && <CheckCircle2 size={14} className="mt-0.5" />}
                      {isWrongSelection && <XCircle size={14} className="mt-0.5" />}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Your answer: <span className="font-semibold text-slate-700">{item.selectedAnswer || 'Not answered'}</span>
                {' · '}
                Correct answer: <span className="font-semibold text-emerald-700">{item.question.correctAnswer}</span>
              </p>

              <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-700">
                <p className="font-semibold mb-0.5">Explanation</p>
                <p>{item.question.explanation || 'No explanation available.'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className={`${cardClass} rounded-3xl p-6 text-center`}>
        <AlertCircle size={24} className="mx-auto text-rose-500" />
        <p className="text-sm text-slate-600 mt-2">Question payload is empty or invalid.</p>
        <button
          type="button"
          onClick={resetToSetup}
          className="mt-3 rounded-xl px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-700"
        >
          Return to setup
        </button>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className={`${cardClass} rounded-3xl p-5 md:p-6 shadow-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const shouldLeave = window.confirm('Exit exam now? Current progress will be lost.');
                if (shouldLeave) resetToSetup();
              }}
              className={`w-9 h-9 rounded-xl border inline-flex items-center justify-center ${neutralButtonClass}`}
            >
              <RotateCcw size={14} />
            </button>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-[2px]">Exam Room</p>
              <p className="text-sm font-semibold text-slate-700">{currentQuestion.section}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
            <Clock size={14} />
            {quizTimeLimitSeconds === null ? `No limit · ${formatClock(elapsedSeconds)}` : formatClock(timeRemaining)}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 md:p-5 mb-4">
          <div className="inline-flex w-8 h-8 rounded-lg bg-sky-100 text-sky-700 items-center justify-center text-sm font-bold mb-3">
            {currentQuestionIdx + 1}
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-800 leading-relaxed">{currentQuestion.text}</h2>
        </div>

        <div className="space-y-2.5">
          {currentQuestion.displayOptions.map((option, index) => {
            const label = MCQ_OPTION_LABELS[index] || option.key;
            const isCorrectOption = option.key === currentQuestion.correctAnswer;
            const isSelectedWrong = hasAnsweredCurrent && option.key === selectedAnswerKey && !currentAnswerCorrect;

            const statusClass = hasAnsweredCurrent
              ? (isCorrectOption
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : (isSelectedWrong ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-100 border-slate-200 text-slate-500'))
              : optionDefaultClass;

            return (
              <button
                type="button"
                key={`${option.key}-${index}`}
                onClick={() => handleSelectAnswer(option.key)}
                disabled={hasAnsweredCurrent}
                className={`w-full rounded-2xl border px-3 py-3 text-left flex items-start gap-3 transition-colors disabled:cursor-default ${statusClass}`}
              >
                <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-sm font-bold border ${isDarkTheme ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-sky-50'}`}>
                  {label}
                </span>
                <span className="flex-1 text-sm md:text-base leading-relaxed">{option.text}</span>
                {hasAnsweredCurrent && isCorrectOption && <CheckCircle2 size={16} className="mt-0.5" />}
                {hasAnsweredCurrent && isSelectedWrong && <XCircle size={16} className="mt-0.5" />}
              </button>
            );
          })}
        </div>

        {hasAnsweredCurrent && (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-700">
            <p className="font-semibold mb-1">Detailed explanation</p>
            <p>{currentQuestion.explanation || 'No explanation available.'}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCurrentQuestionIdx((prev) => Math.max(prev - 1, 0))}
            disabled={currentQuestionIdx <= 0}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${neutralButtonClass}`}
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={finishQuiz}
              className="rounded-xl px-3 py-2 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-700 inline-flex items-center gap-1"
            >
              Submit <CheckCircle2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentQuestionIdx((prev) => Math.min(prev + 1, activeQuizData.length - 1))}
              disabled={currentQuestionIdx >= activeQuizData.length - 1}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${neutralButtonClass}`}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <aside className={`${cardClass} rounded-3xl p-5 shadow-sm h-fit xl:sticky xl:top-4`}>
        <h3 className="syne text-lg font-bold text-[#0A1628] mb-2">Progress</h3>
        <p className="text-xs text-slate-500 mb-3">Answered: {answeredCount}/{activeQuizData.length}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
            <p className="text-[11px] text-slate-500">Correct</p>
            <p className="text-lg font-bold text-emerald-700">{correctCount}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2">
            <p className="text-[11px] text-slate-500">Wrong</p>
            <p className="text-lg font-bold text-rose-700">{wrongCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5 max-h-[420px] overflow-y-auto scroll pr-1">
          {activeQuizData.map((question, index) => {
            const selected = userAnswers[index];
            const isCurrent = index === currentQuestionIdx;
            const isCorrect = Boolean(selected) && selected === question.correctAnswer;
            const isWrong = Boolean(selected) && selected !== question.correctAnswer;

            const chipClass = isCurrent
              ? 'border-sky-500 bg-sky-100 text-sky-700'
              : (isCorrect
                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                : (isWrong
                  ? 'border-rose-200 bg-rose-100 text-rose-700'
                  : (isDarkTheme ? 'border-slate-600 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-600')));

            return (
              <button
                type="button"
                key={`${question.id}-${index}`}
                onClick={() => setCurrentQuestionIdx(index)}
                className={`w-9 h-9 rounded-lg border text-xs font-semibold ${chipClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
