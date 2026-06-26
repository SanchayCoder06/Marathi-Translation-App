// ============================================================
// बोला मराठी — Progress Tracker
// Manages all user progress via localStorage
// ============================================================

const Progress = (() => {
  const STORAGE_KEY = 'bolaMarathi_progress';
  const SETTINGS_KEY = 'bolaMarathi_settings';

  // --- Internal Helpers ---

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : _defaultData();
    } catch {
      return _defaultData();
    }
  }

  function _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Progress save failed:', e);
    }
  }

  function _defaultData() {
    return {
      phrases: {},        // { "m1-l1-p1": { bestScore: 85, attempts: 3, lastAttempt: "2025-..." } }
      lessons: {},        // { "m1-l1": { completed: true, avgScore: 82, completedAt: "..." } }
      modules: {},        // { "m1": { started: true } }
      assessments: {      // Assessment-level tracking
        quizzes: {},      // { "m1-l1": { bestScore: 80, attempts: 2 } }
        tests: {},        // { "m1": { bestScore: 85, passed: true, attempts: 1 } }
        flashcards: {},   // { "m1": { knownCount: 10, totalCount: 12, sessions: 3 } }
      },
      xp: 0,
      streak: 0,
      lastPracticeDate: null,
      totalTimeMinutes: 0,
      sessionStart: null,
      dailyMinutes: {},   // { "YYYY-MM-DD": minutes }
    };
  }

  // --- Public API ---

  /**
   * Get phrase-level progress
   */
  function getPhraseScore(phraseId) {
    const data = _load();
    return data.phrases[phraseId] || { bestScore: 0, attempts: 0, lastAttempt: null };
  }

  /**
   * Save a phrase attempt score
   */
  function savePhraseScore(phraseId, score) {
    const data = _load();
    const existing = data.phrases[phraseId] || { bestScore: 0, attempts: 0 };

    data.phrases[phraseId] = {
      bestScore: Math.max(existing.bestScore, score),
      attempts: existing.attempts + 1,
      lastAttempt: new Date().toISOString(),
      lastScore: score,
    };

    // Award XP
    if (score >= 90) data.xp += 15;
    else if (score >= 70) data.xp += 10;
    else if (score >= 50) data.xp += 5;
    else data.xp += 2;

    _save(data);
    return data.phrases[phraseId];
  }

  /**
   * Mark a lesson as completed
   */
  function completeLesson(lessonId, avgScore) {
    const data = _load();
    data.lessons[lessonId] = {
      completed: true,
      avgScore: Math.round(avgScore),
      completedAt: new Date().toISOString(),
    };

    // Bonus XP for completing a lesson
    data.xp += 25;

    // Update streak
    _updateStreak(data);

    _save(data);
  }

  /**
   * Check if a lesson is completed
   */
  function isLessonCompleted(lessonId) {
    const data = _load();
    return data.lessons[lessonId]?.completed || false;
  }

  /**
   * Get lesson progress
   */
  function getLessonProgress(lessonId) {
    const data = _load();
    return data.lessons[lessonId] || { completed: false, avgScore: 0 };
  }

  /**
   * Get module-level progress
   */
  function getModuleProgress(moduleId, totalLessons) {
    const data = _load();
    let completedLessons = 0;
    let totalScore = 0;
    let scored = 0;

    for (let i = 1; i <= totalLessons; i++) {
      const lid = `${moduleId}-l${i}`;
      if (data.lessons[lid]?.completed) {
        completedLessons++;
        totalScore += data.lessons[lid].avgScore;
        scored++;
      }
    }

    return {
      completedLessons,
      totalLessons,
      percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      avgScore: scored > 0 ? Math.round(totalScore / scored) : 0,
    };
  }

  /**
   * Mark module as started
   */
  function startModule(moduleId) {
    const data = _load();
    if (!data.modules[moduleId]) {
      data.modules[moduleId] = { started: true, startedAt: new Date().toISOString() };
      _save(data);
    }
  }

  /**
   * Get total XP
   */
  function getXP() {
    return _load().xp;
  }

  /**
   * Get current streak (days in a row)
   */
  function getStreak() {
    const data = _load();
    _updateStreak(data);
    _save(data);
    return data.streak;
  }

  /**
   * Update streak logic
   */
  function _updateStreak(data) {
    const today = new Date().toDateString();
    const lastDate = data.lastPracticeDate;

    if (!lastDate) {
      data.streak = 1;
    } else if (lastDate === today) {
      // Already practiced today, keep streak
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate === yesterday.toDateString()) {
        data.streak = (data.streak || 0) + 1;
      } else {
        data.streak = 1; // Streak broken
      }
    }

    data.lastPracticeDate = today;
  }

  /**
   * Get overall stats for dashboard
   */
  function getStats() {
    const data = _load();
    const completedLessons = Object.values(data.lessons).filter(l => l.completed).length;
    const totalPhrases = Object.keys(data.phrases).length;

    return {
      xp: data.xp,
      streak: data.streak || 0,
      completedLessons,
      totalPhrases,
      totalTimeMinutes: data.totalTimeMinutes || 0,
    };
  }

  /**
   * Start a practice session timer
   */
  function startSession() {
    const data = _load();
    data.sessionStart = Date.now();
    _save(data);
  }

  /**
   * End a session and record time
   */
  function endSession() {
    const data = _load();
    if (data.sessionStart) {
      const elapsed = Math.round((Date.now() - data.sessionStart) / 60000);
      if (elapsed > 0) {
        data.totalTimeMinutes = (data.totalTimeMinutes || 0) + elapsed;
        if (!data.dailyMinutes) data.dailyMinutes = {};
        const today = new Date().toISOString().split('T')[0];
        data.dailyMinutes[today] = (data.dailyMinutes[today] || 0) + elapsed;
      }
      data.sessionStart = null;
      _save(data);
    }
  }

  /**
   * Get phrases that need review (scored below threshold)
   */
  function getReviewPhrases(threshold = 70) {
    const data = _load();
    return Object.entries(data.phrases)
      .filter(([_, p]) => p.bestScore < threshold && p.attempts > 0)
      .map(([id, p]) => ({ phraseId: id, ...p }))
      .sort((a, b) => a.bestScore - b.bestScore);
  }

  /**
   * Get total completed lessons count
   */
  function getCompletedLessonCount() {
    const data = _load();
    return Object.values(data.lessons).filter(l => l.completed).length;
  }

  // --- Settings ---

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : _defaultSettings();
    } catch {
      return _defaultSettings();
    }
  }

  function saveSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function _defaultSettings() {
    return {
      apiKey: '',
      playbackSpeed: 'normal',   // 'slow', 'normal', 'fast'
      autoPlayAudio: true,
      showTransliteration: true,
      showEnglish: true,
    };
  }

  function getApiKey() {
    return getSettings().apiKey;
  }

  function setApiKey(key) {
    saveSetting('apiKey', key);
  }

  /**
   * Reset all progress (with confirmation)
   */
  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }

  function getTodayMinutes() {
    const data = _load();
    const today = new Date().toISOString().split('T')[0];
    if (!data.dailyMinutes) return 0;
    return data.dailyMinutes[today] || 0;
  }

  function getWeeklyMinutes() {
    const data = _load();
    const result = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const mins = data.dailyMinutes ? (data.dailyMinutes[dateString] || 0) : 0;
      result.push({
        day: dayName,
        minutes: mins,
        date: dateString
      });
    }
    return result;
  }

  /**
   * Save a lesson quiz score
   * @param {string} lessonId
   * @param {number} score - 0-100
   */
  function saveQuizScore(lessonId, score) {
    const data = _load();
    if (!data.assessments) data.assessments = { quizzes: {}, tests: {}, flashcards: {} };
    const existing = data.assessments.quizzes[lessonId] || { bestScore: 0, attempts: 0 };
    data.assessments.quizzes[lessonId] = {
      bestScore: Math.max(existing.bestScore, score),
      attempts: existing.attempts + 1,
      lastAttempt: new Date().toISOString(),
    };
    // Award XP
    if (score >= 90) data.xp += 10;
    else if (score >= 70) data.xp += 5;
    else data.xp += 2;
    _save(data);
  }

  /**
   * Save a module test result
   * @param {string} moduleId
   * @param {number} score - 0-100
   * @param {boolean} passed
   */
  function saveTestScore(moduleId, score, passed) {
    const data = _load();
    if (!data.assessments) data.assessments = { quizzes: {}, tests: {}, flashcards: {} };
    const existing = data.assessments.tests[moduleId] || { bestScore: 0, attempts: 0, passed: false };
    data.assessments.tests[moduleId] = {
      bestScore: Math.max(existing.bestScore, score),
      attempts: existing.attempts + 1,
      passed: existing.passed || passed,
      lastAttempt: new Date().toISOString(),
    };
    // Award XP for passing
    if (passed && !existing.passed) data.xp += 50;
    _save(data);
  }

  /**
   * Save a flashcard session result
   * @param {string} moduleId
   * @param {number} knownCount - how many cards marked "known"
   * @param {number} totalCount - total cards in session
   */
  function saveFlashcardSession(moduleId, knownCount, totalCount) {
    const data = _load();
    if (!data.assessments) data.assessments = { quizzes: {}, tests: {}, flashcards: {} };
    const existing = data.assessments.flashcards[moduleId] || { knownCount: 0, totalCount: 0, sessions: 0 };
    data.assessments.flashcards[moduleId] = {
      knownCount: Math.max(existing.knownCount, knownCount),
      totalCount: totalCount,
      sessions: existing.sessions + 1,
      lastSession: new Date().toISOString(),
    };
    data.xp += Math.round(knownCount * 2);
    _save(data);
  }

  /**
   * Get all assessment progress for dashboard display
   */
  function getAssessmentProgress() {
    const data = _load();
    const a = data.assessments || { quizzes: {}, tests: {}, flashcards: {} };
    const quizCount = Object.keys(a.quizzes).length;
    const testsPassed = Object.values(a.tests).filter(t => t.passed).length;
    const testsAttempted = Object.keys(a.tests).length;
    const fcSessions = Object.values(a.flashcards).reduce((sum, f) => sum + f.sessions, 0);
    return { quizCount, testsPassed, testsAttempted, fcSessions, quizzes: a.quizzes, tests: a.tests, flashcards: a.flashcards };
  }

  /**
   * Get quiz progress for a specific lesson
   */
  function getQuizProgress(lessonId) {
    const data = _load();
    return data.assessments?.quizzes?.[lessonId] || null;
  }

  /**
   * Get test progress for a specific module
   */
  function getTestProgress(moduleId) {
    const data = _load();
    return data.assessments?.tests?.[moduleId] || null;
  }

  return {
    getPhraseScore,
    savePhraseScore,
    completeLesson,
    isLessonCompleted,
    getLessonProgress,
    getModuleProgress,
    startModule,
    getXP,
    getStreak,
    getStats,
    startSession,
    endSession,
    getReviewPhrases,
    getCompletedLessonCount,
    getSettings,
    saveSetting,
    getApiKey,
    setApiKey,
    resetAll,
    getTodayMinutes,
    getWeeklyMinutes,
    saveQuizScore,
    saveTestScore,
    saveFlashcardSession,
    getAssessmentProgress,
    getQuizProgress,
    getTestProgress,
  };
})();
