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
      xp: 0,
      streak: 0,
      lastPracticeDate: null,
      totalTimeMinutes: 0,
      sessionStart: null,
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
      data.totalTimeMinutes = (data.totalTimeMinutes || 0) + elapsed;
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
  };
})();
