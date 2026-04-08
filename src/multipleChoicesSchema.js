const MCQ_OPTION_LABELS = ['A', 'B', 'C', 'D'];
const MAX_QUESTION_BANK_SIZE = 5000;
const MAX_ATTEMPTS = 120;
const MAX_SECTION_LENGTH = 80;
const MAX_TEXT_LENGTH = 5000;
const MAX_OPTION_LENGTH = 2400;
const MAX_EXPLANATION_LENGTH = 8000;
const MAX_WRONG_IDS = 200;
const MAX_SELECTED_SECTIONS = 120;
const FALLBACK_SECTION = 'Uncategorized';

const DEFAULT_QUESTION_BANK = [
  {
    id: 1,
    section: 'Basics',
    text: 'In a processing contract, who is the processor?',
    options: {
      A: 'The authority supervising customs declarations.',
      B: 'The party that performs production steps and receives remuneration.',
      C: 'The party owning the product brand.',
      D: 'The insurance company of the shipment.',
    },
    correctAnswer: 'B',
    explanation: 'The processor is the party carrying out manufacturing stages under contract and receiving payment.',
  },
  {
    id: 2,
    section: 'Trade Terms',
    text: 'What best defines complete equipment in international trade?',
    options: {
      A: 'Any single machine imported with no services.',
      B: 'Only the primary machine in a production line.',
      C: 'An integrated set of machinery and tools for a specific process.',
      D: 'A list of spare parts for maintenance.',
    },
    correctAnswer: 'C',
    explanation: 'Complete equipment is an integrated set required to execute a technological process.',
  },
];

const DEFAULT_PREFERENCES = {
  selectedSections: DEFAULT_QUESTION_BANK.map((item) => item.section),
  questionCountInput: '',
  timeLimitInput: '',
  isShuffleQuestions: false,
  isUnlimitedTime: false,
};

const DEFAULT_MULTIPLE_CHOICES_DATA = {
  questionBank: DEFAULT_QUESTION_BANK,
  attempts: [],
  preferences: DEFAULT_PREFERENCES,
};

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const trimText = (value, fallback = '') => {
  const text = String(value ?? fallback).trim();
  return text;
};

const clipText = (value, maxLength, fallback = '') => {
  const text = trimText(value, fallback);
  if (!text) return '';
  return text.slice(0, maxLength);
};

const parseNonNegativeInt = (value, fallback = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
};

const uniq = (items) => Array.from(new Set(items));

const normalizeSection = (value) => {
  const section = clipText(value, MAX_SECTION_LENGTH, FALLBACK_SECTION);
  return section || FALLBACK_SECTION;
};

const normalizeQuestionId = (value, fallbackIndex = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallbackIndex + 1;
};

const normalizeCorrectAnswer = (value, options) => {
  const candidate = String(value ?? '').trim().toUpperCase();
  if (MCQ_OPTION_LABELS.includes(candidate) && options[candidate]) return candidate;
  return MCQ_OPTION_LABELS.find((label) => options[label]) || 'A';
};

export const normalizeMultipleChoicesQuestion = (rawQuestion, fallbackIndex = 0) => {
  if (!isObject(rawQuestion)) return null;

  const text = clipText(rawQuestion.text, MAX_TEXT_LENGTH);
  if (!text) return null;

  const rawOptions = isObject(rawQuestion.options) ? rawQuestion.options : {};
  const options = {};

  MCQ_OPTION_LABELS.forEach((label) => {
    options[label] = clipText(rawOptions[label], MAX_OPTION_LENGTH);
  });

  const nonEmptyOptionCount = MCQ_OPTION_LABELS.filter((label) => options[label]).length;
  if (nonEmptyOptionCount < 2) return null;

  return {
    id: normalizeQuestionId(rawQuestion.id, fallbackIndex),
    section: normalizeSection(rawQuestion.section),
    text,
    options,
    correctAnswer: normalizeCorrectAnswer(rawQuestion.correctAnswer, options),
    explanation: clipText(rawQuestion.explanation, MAX_EXPLANATION_LENGTH),
  };
};

const normalizeAttempt = (rawAttempt, fallbackIndex = 0) => {
  if (!isObject(rawAttempt)) return null;

  const totalQuestions = parseNonNegativeInt(rawAttempt.totalQuestions, 0, MAX_QUESTION_BANK_SIZE);
  const correctCount = parseNonNegativeInt(rawAttempt.correctCount, 0, totalQuestions);
  const answeredSeed = parseNonNegativeInt(rawAttempt.answeredCount, correctCount, totalQuestions);
  const answeredCount = Math.max(correctCount, Math.min(answeredSeed, totalQuestions));
  const wrongCount = Math.max(0, Math.min(answeredCount - correctCount, totalQuestions));
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  const createdAtDate = new Date(rawAttempt.createdAt || Date.now());
  const createdAt = Number.isNaN(createdAtDate.getTime())
    ? new Date().toISOString()
    : createdAtDate.toISOString();

  const timeLimitSeconds = rawAttempt.timeLimitSeconds === null
    ? null
    : parseNonNegativeInt(rawAttempt.timeLimitSeconds, null, 24 * 60 * 60);

  const timeUsedSeconds = parseNonNegativeInt(rawAttempt.timeUsedSeconds, 0, 24 * 60 * 60);

  const scorePercent = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const sections = uniq(
    (Array.isArray(rawAttempt.sections) ? rawAttempt.sections : [])
      .map((section) => normalizeSection(section))
      .filter(Boolean),
  ).slice(0, MAX_SELECTED_SECTIONS);

  const wrongQuestionIds = uniq(
    (Array.isArray(rawAttempt.wrongQuestionIds) ? rawAttempt.wrongQuestionIds : [])
      .map((id) => parseNonNegativeInt(id, -1, MAX_QUESTION_BANK_SIZE * 10))
      .filter((id) => id > 0),
  ).slice(0, MAX_WRONG_IDS);

  return {
    id: clipText(rawAttempt.id, 64) || `attempt-${createdAt}-${fallbackIndex}`,
    createdAt,
    totalQuestions,
    answeredCount,
    correctCount,
    wrongCount,
    unansweredCount,
    scorePercent,
    timeUsedSeconds,
    timeLimitSeconds,
    sections,
    wrongQuestionIds,
  };
};

const normalizePreferences = (rawPreferences, availableSections) => {
  const source = isObject(rawPreferences) ? rawPreferences : {};

  const selectedSections = uniq(
    (Array.isArray(source.selectedSections) ? source.selectedSections : [])
      .map((section) => normalizeSection(section))
      .filter((section) => availableSections.includes(section)),
  ).slice(0, MAX_SELECTED_SECTIONS);

  return {
    selectedSections: selectedSections.length ? selectedSections : availableSections,
    questionCountInput: String(source.questionCountInput ?? '').replace(/\D+/g, '').slice(0, 4),
    timeLimitInput: String(source.timeLimitInput ?? '').replace(/\D+/g, '').slice(0, 4),
    isShuffleQuestions: Boolean(source.isShuffleQuestions),
    isUnlimitedTime: Boolean(source.isUnlimitedTime),
  };
};

const cloneDefaults = () => ({
  questionBank: DEFAULT_QUESTION_BANK.map((question) => ({
    ...question,
    options: { ...question.options },
  })),
  attempts: [],
  preferences: {
    ...DEFAULT_PREFERENCES,
    selectedSections: [...DEFAULT_PREFERENCES.selectedSections],
  },
});

export const createDefaultMultipleChoicesData = () => cloneDefaults();

export const normalizeMultipleChoicesData = (rawData) => {
  const source = isObject(rawData) ? rawData : {};

  const hasQuestionBankField = Array.isArray(source.questionBank);
  const questionBank = (Array.isArray(source.questionBank) ? source.questionBank : [])
    .map((question, index) => normalizeMultipleChoicesQuestion(question, index))
    .filter(Boolean)
    .slice(0, MAX_QUESTION_BANK_SIZE);

  const stableQuestionBank = questionBank.length
    ? questionBank
    : (hasQuestionBankField ? [] : cloneDefaults().questionBank);

  const availableSections = uniq(stableQuestionBank.map((question) => question.section));

  const attempts = (Array.isArray(source.attempts) ? source.attempts : [])
    .map((attempt, index) => normalizeAttempt(attempt, index))
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ATTEMPTS);

  const preferences = normalizePreferences(source.preferences, availableSections);

  return {
    questionBank: stableQuestionBank,
    attempts,
    preferences,
  };
};

export { DEFAULT_MULTIPLE_CHOICES_DATA, MCQ_OPTION_LABELS, FALLBACK_SECTION, MAX_QUESTION_BANK_SIZE, MAX_ATTEMPTS };
