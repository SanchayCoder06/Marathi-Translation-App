// ============================================================
// बोला मराठी — Curriculum Loader
// Loads and manages lesson data from the embedded curriculum
// ============================================================

const Curriculum = (() => {
  let _data = null;

  /**
   * Initialize curriculum data
   * @param {Object} data - The lessons.json data
   */
  function init(data) {
    _data = data;
  }

  /**
   * Get all modules
   * @returns {Array}
   */
  function getModules() {
    if (!_data) return [];
    return _data.modules.map(m => ({
      id: m.id,
      title: m.title,
      titleMarathi: m.titleMarathi,
      description: m.description,
      icon: m.icon,
      totalLessons: m.lessons.length,
      estimatedHours: m.estimatedHours,
      difficulty: m.difficulty,
    }));
  }

  /**
   * Get a specific module with its lessons
   * @param {string} moduleId
   * @returns {Object|null}
   */
  function getModule(moduleId) {
    if (!_data) return null;
    const mod = _data.modules.find(m => m.id === moduleId);
    if (!mod) return null;

    return {
      ...mod,
      totalLessons: mod.lessons.length,
      lessons: mod.lessons.map(l => ({
        id: l.id,
        title: l.title,
        titleMarathi: l.titleMarathi,
        lessonNumber: l.lessonNumber,
        phraseCount: l.phrases.length,
      })),
    };
  }

  /**
   * Get a specific lesson with all its phrases
   * @param {string} lessonId - e.g., "m1-l1"
   * @returns {Object|null}
   */
  function getLesson(lessonId) {
    if (!_data) return null;
    for (const mod of _data.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) {
        return {
          ...lesson,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleIcon: mod.icon,
        };
      }
    }
    return null;
  }

  /**
   * Get the next lesson after a given lesson
   * @param {string} currentLessonId
   * @returns {Object|null} - { lessonId, moduleId } or null if last lesson
   */
  function getNextLesson(currentLessonId) {
    if (!_data) return null;

    for (let mi = 0; mi < _data.modules.length; mi++) {
      const mod = _data.modules[mi];
      const li = mod.lessons.findIndex(l => l.id === currentLessonId);

      if (li !== -1) {
        // Next lesson in same module
        if (li < mod.lessons.length - 1) {
          return {
            lessonId: mod.lessons[li + 1].id,
            moduleId: mod.id,
          };
        }
        // First lesson of next module
        if (mi < _data.modules.length - 1) {
          const nextMod = _data.modules[mi + 1];
          if (nextMod.lessons.length > 0) {
            return {
              lessonId: nextMod.lessons[0].id,
              moduleId: nextMod.id,
            };
          }
        }
        return null; // Last lesson of last module
      }
    }
    return null;
  }

  /**
   * Get total number of lessons across all modules
   */
  function getTotalLessons() {
    if (!_data) return 0;
    return _data.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  }

  /**
   * Get total number of phrases across all lessons
   */
  function getTotalPhrases() {
    if (!_data) return 0;
    return _data.modules.reduce((sum, m) =>
      sum + m.lessons.reduce((lsum, l) => lsum + l.phrases.length, 0), 0);
  }

  /**
   * Search for phrases matching a query
   * @param {string} query - Search string
   * @returns {Array}
   */
  function searchPhrases(query) {
    if (!_data || !query) return [];
    const q = query.toLowerCase();
    const results = [];

    for (const mod of _data.modules) {
      for (const lesson of mod.lessons) {
        for (const phrase of lesson.phrases) {
          if (
            phrase.marathi.includes(query) ||
            phrase.transliteration.toLowerCase().includes(q) ||
            phrase.english.toLowerCase().includes(q)
          ) {
            results.push({
              ...phrase,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              moduleId: mod.id,
              moduleTitle: mod.title,
            });
          }
        }
      }
    }

    return results.slice(0, 20); // Limit results
  }

  /**
   * Get phrases that the user needs to review (from progress data)
   * @param {Array} reviewPhraseIds - Array of { phraseId, bestScore }
   * @returns {Array} - Full phrase objects with scores
   */
  function getReviewPhrases(reviewPhraseIds) {
    if (!_data) return [];

    const phraseMap = new Map();
    for (const mod of _data.modules) {
      for (const lesson of mod.lessons) {
        for (const phrase of lesson.phrases) {
          phraseMap.set(phrase.id, {
            ...phrase,
            lessonId: lesson.id,
            moduleId: mod.id,
          });
        }
      }
    }

    return reviewPhraseIds
      .map(rp => {
        const phrase = phraseMap.get(rp.phraseId);
        return phrase ? { ...phrase, bestScore: rp.bestScore } : null;
      })
      .filter(Boolean);
  }

  return {
    init,
    getModules,
    getModule,
    getLesson,
    getNextLesson,
    getTotalLessons,
    getTotalPhrases,
    searchPhrases,
    getReviewPhrases,
  };
})();
