// ============================================================
// बोला मराठी — Curriculum Loader
// Loads and manages lesson data from the embedded curriculum
// ============================================================

const Curriculum = (() => {
  let _data = null;
  let _assessments = null; // Loaded from assessments.json

  /**
   * Initialize curriculum data
   * @param {Object} data - The lessons.json data
   */
  function init(data) {
    if (data && data.modules) {
      _data = {
        modules: data.modules.filter(m => m.id.startsWith('u')).map(m => {
          m.level = parseInt(m.level, 10) || 1;
          return m;
        })
      };
    } else {
      _data = data;
    }
  }

  /**
   * Load assessment data (quizzes, flashcards, tests)
   * Merges assessments.json data and new_modules.json data into _data
   * @param {Object} assessmentData - Data from assessments.json
   * @param {Object} newModulesData - Data from new_modules.json
   */
  function loadAssessments(assessmentData, newModulesData) {
    // Store assessment lookup map
    if (assessmentData && assessmentData.moduleAssessments) {
      _assessments = {};
      for (const ma of assessmentData.moduleAssessments) {
        _assessments[ma.moduleId] = ma;
      }
    }

    // Merge new modules into _data
    if (newModulesData && newModulesData.modules && _data) {
      const existingIds = new Set(_data.modules.map(m => m.id));
      for (const mod of newModulesData.modules) {
        if (mod.id.startsWith('u') && !existingIds.has(mod.id)) {
          mod.level = parseInt(mod.level, 10) || 1;
          _data.modules.push(mod);
        }
      }
    }
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
        phrases: l.phrases,
        hasQuiz: !!(l.quiz?.length > 0 || _assessments?.[moduleId]?.lessonQuizzes?.[l.id]?.length > 0),
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

  /**
   * Get flashcard deck for a module
   * Checks new_modules embedded flashcards first, then assessments.json
   * @param {string} moduleId
   * @returns {Array}
   */
  function getFlashcards(moduleId) {
    if (!_data) return [];
    const mod = _data.modules.find(m => m.id === moduleId);
    // Prefer embedded flashcards (new modules m13-m20)
    if (mod?.flashcards?.length > 0) return mod.flashcards;
    // Fall back to assessments.json data
    if (_assessments?.[moduleId]?.flashcards) return _assessments[moduleId].flashcards;
    return [];
  }

  /**
   * Get quiz questions for a specific lesson
   * Checks embedded quiz on lesson first, then assessments.json
   * @param {string} lessonId - e.g., "m1-l1"
   * @returns {Array}
   */
  function getLessonQuiz(lessonId) {
    if (!_data) return [];
    for (const mod of _data.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) {
        // Prefer embedded quiz (new modules)
        if (lesson.quiz?.length > 0) return lesson.quiz;
        // Fall back to assessments.json
        if (_assessments?.[mod.id]?.lessonQuizzes?.[lessonId]) {
          return _assessments[mod.id].lessonQuizzes[lessonId];
        }
        return [];
      }
    }
    return [];
  }

  /**
   * Get module test for a module
   * @param {string} moduleId
   * @returns {Object|null}
   */
  function getModuleTest(moduleId) {
    if (!_data) return null;
    const mod = _data.modules.find(m => m.id === moduleId);
    // Prefer embedded test (new modules m13-m20)
    if (mod?.moduleTest) return mod.moduleTest;
    // Fall back to assessments.json
    if (_assessments?.[moduleId]?.moduleTest) return _assessments[moduleId].moduleTest;
    return null;
  }

  return {
    init,
    loadAssessments,
    getModules,
    getModule,
    getLesson,
    getNextLesson,
    getTotalLessons,
    getTotalPhrases,
    searchPhrases,
    getReviewPhrases,
    getFlashcards,
    getLessonQuiz,
    getModuleTest,
  };
})();
