// ============================================================
// बोला मराठी — Main App Controller
// Orchestrates all modules: Curriculum, Audio, AI, UI, Progress
// ============================================================

const App = (() => {
  // Current state
  let _currentScreen = 'onboarding';
  let _currentModuleId = null;
  let _currentLessonId = null;
  let _currentPhraseIndex = 0;
  let _lessonScores = [];       // Scores for each phrase in current lesson
  let _isProcessing = false;    // Prevent double-taps

  // Helper to handle history state and local storage state updates uniformly
  function _updateHistoryState(screen, params, hash, historyMode) {
    _currentScreen = screen;
    localStorage.setItem('bolaMarathi_lastScreen', screen);
    if (params) {
      if (params.moduleId) {
        _currentModuleId = params.moduleId;
        localStorage.setItem('bolaMarathi_lastModuleId', params.moduleId);
      }
      if (params.lessonId) {
        _currentLessonId = params.lessonId;
        localStorage.setItem('bolaMarathi_lastLessonId', params.lessonId);
      }
      if (params.fromScreen) {
        localStorage.setItem('bolaMarathi_settingsFromScreen', params.fromScreen);
      }
    }
    if (historyMode === true || historyMode === 'push') {
      window.history.pushState({ screen, params }, '', hash);
    } else if (historyMode === 'replace') {
      window.history.replaceState({ screen, params }, '', hash);
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function init() {
    UI.init();

    // Preload TTS voices
    await AudioEngine.preloadVoices();

    // Load curriculum + supplementary data in parallel
    try {
      const [lessonsRes, assessmentsRes, newModulesRes] = await Promise.all([
        fetch('data/lessons.json'),
        fetch('data/assessments.json').catch(() => null),
        fetch('data/new_modules.json').catch(() => null),
      ]);

      if (!lessonsRes.ok) throw new Error('Failed to load curriculum');
      const data = await lessonsRes.json();
      Curriculum.init(data);

      // Load optional assessment/new-module data
      const assessmentData = assessmentsRes?.ok ? await assessmentsRes.json() : null;
      const newModulesData = newModulesRes?.ok ? await newModulesRes.json() : null;
      Curriculum.loadAssessments(assessmentData, newModulesData);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
      UI.showToast('Error loading lesson data. Please refresh.');
      return;
    }

    // Restore last session screen if present, otherwise show welcome page
    _restoreLastScreen();

    // Register popstate listener for back button / swipe gestures
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.screen) {
        const { screen, params } = event.state;
        switch (screen) {
          case 'welcome': _showWelcome(false); break;
          case 'onboarding': _showOnboarding(false); break;
          case 'lessons': _showLessons(false); break;
          case 'dashboard': _showDashboard(false); break;
          case 'translator': _showTranslator(false); break;
          case 'phrases': _showPhraseBank(false); break;
          case 'dictionary': _showDictionary(false); break;
          case 'module': _showModuleDetail(params.moduleId, false); break;
          case 'settings': _showSettings(params.fromScreen, false); break;
          case 'lesson': _startLesson(params.lessonId, false); break;
          case 'flashcards': _showFlashcards(params.moduleId, false); break;
          case 'quiz': _showLessonQuiz(params.lessonId, params.moduleId, false); break;
          case 'test': _showModuleTest(params.moduleId, false); break;
        }
      } else {
        _showWelcome(false);
      }
    });

    // Start session timer
    Progress.startSession();

    // Save session on page leave
    window.addEventListener('beforeunload', () => {
      Progress.endSession();
    });

    // Register service worker
    _registerSW();
  }

  function _restoreLastScreen() {
    const lastScreen = localStorage.getItem('bolaMarathi_lastScreen') || 'welcome';
    const lastModuleId = localStorage.getItem('bolaMarathi_lastModuleId');
    const lastLessonId = localStorage.getItem('bolaMarathi_lastLessonId');

    let onboardingComplete = localStorage.getItem('bolaMarathi_onboardingComplete') === 'true';
    
    // Auto-migrate users who completed onboarding before the onboardingComplete flag was added
    const stats = Progress.getStats();
    const hasProgress = (stats && (stats.completedLessons > 0 || stats.xp > 0));
    const wasOnSubScreen = (lastScreen !== 'welcome' && lastScreen !== 'onboarding');
    if (!onboardingComplete && (hasProgress || wasOnSubScreen)) {
      localStorage.setItem('bolaMarathi_onboardingComplete', 'true');
      onboardingComplete = true;
    }

    if (!onboardingComplete && lastScreen !== 'welcome' && lastScreen !== 'onboarding') {
      _showWelcome(true);
      return;
    }

    if (lastScreen === 'module' && lastModuleId) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      _showModuleDetail(lastModuleId, true);
    } else if (lastScreen === 'lesson' && lastLessonId) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      if (lastModuleId) {
        window.history.pushState({ screen: 'module', params: { moduleId: lastModuleId } }, '', `#module/${lastModuleId}`);
      }
      _startLesson(lastLessonId, true);
    } else if (lastScreen === 'flashcards' && lastModuleId) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      window.history.pushState({ screen: 'module', params: { moduleId: lastModuleId } }, '', `#module/${lastModuleId}`);
      _showFlashcards(lastModuleId, true);
    } else if (lastScreen === 'quiz' && lastLessonId) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      if (lastModuleId) {
        window.history.pushState({ screen: 'module', params: { moduleId: lastModuleId } }, '', `#module/${lastModuleId}`);
      }
      _showLessonQuiz(lastLessonId, lastModuleId, true);
    } else if (lastScreen === 'test' && lastModuleId) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      window.history.pushState({ screen: 'module', params: { moduleId: lastModuleId } }, '', `#module/${lastModuleId}`);
      _showModuleTest(lastModuleId, true);
    } else if (lastScreen === 'settings') {
      const fromScreen = localStorage.getItem('bolaMarathi_settingsFromScreen') || 'lessons';
      window.history.replaceState({ screen: fromScreen, params: {} }, '', `#${fromScreen}`);
      _showSettings(fromScreen, true);
    } else if (['dashboard', 'translator', 'phrases', 'dictionary'].includes(lastScreen)) {
      window.history.replaceState({ screen: 'lessons', params: {} }, '', '#lessons');
      window.history.pushState({ screen: lastScreen, params: {} }, '', `#${lastScreen}`);
      switch (lastScreen) {
        case 'dashboard': _showDashboard(false); break;
        case 'translator': _showTranslator(false); break;
        case 'phrases': _showPhraseBank(false); break;
        case 'dictionary': _showDictionary(false); break;
      }
    } else {
      window.history.replaceState({ screen: lastScreen, params: { moduleId: lastModuleId, lessonId: lastLessonId } }, '', `#${lastScreen}`);
      switch (lastScreen) {
        case 'lessons': _showLessons(false); break;
        case 'welcome':
        case 'onboarding':
        default:
          if (lastScreen === 'onboarding') {
            _showOnboarding(false);
          } else {
            _showWelcome(false);
          }
          break;
      }
    }
  }

  // ============================================================
  // SCREEN NAVIGATION
  // ============================================================

  function _showWelcome(historyMode = 'push') {
    _updateHistoryState('welcome', {}, '#welcome', historyMode);
    AudioEngine.stopSpeaking();
    UI.renderWelcome(() => {
      const apiKey = Progress.getApiKey();
      const onboardingComplete = localStorage.getItem('bolaMarathi_onboardingComplete') === 'true';
      if (apiKey || onboardingComplete) {
        _showLessons();
      } else {
        _showOnboarding();
      }
    });
  }

  function _showTranslator(historyMode = 'push') {
    _updateHistoryState('translator', {}, '#translator', historyMode);
    AudioEngine.stopSpeaking();
    UI.renderTranslator(
      async (text, direction) => {
        const apiKey = Progress.getApiKey();
        try {
          return await AIFeedback.translate(text, direction, apiKey);
        } catch (err) {
          UI.showToast(err.message || 'Translation failed.');
          return null;
        }
      },
      (text) => {
        AudioEngine.speak(text, 'normal');
      },
      (text) => {
        navigator.clipboard.writeText(text)
          .then(() => UI.showToast('Translation copied to clipboard!'))
          .catch(() => UI.showToast('Failed to copy.'));
      }
    );
  }

  function _showPhraseBank(historyMode = 'push') {
    _updateHistoryState('phrases', {}, '#phrases', historyMode);
    AudioEngine.stopSpeaking();
    UI.renderPhraseBank();
  }

  function _showDictionary(historyMode = 'push') {
    _updateHistoryState('dictionary', {}, '#dictionary', historyMode);
    AudioEngine.stopSpeaking();
    UI.renderDictionary(
      async (word) => {
        const apiKey = Progress.getApiKey();
        return await AIFeedback.lookupWord(word, apiKey);
      },
      (text) => {
        AudioEngine.speak(text, 'normal');
      }
    );
  }

  // Define _showOnboarding before it's used
  function _showOnboarding(historyMode = 'push') {
    _updateHistoryState('onboarding', {}, '#onboarding', historyMode);
    UI.renderOnboarding(() => {
      localStorage.setItem('bolaMarathi_onboardingComplete', 'true');
      _showLessons();
    });
  }

  function _showLessons(historyMode = 'push') {
    _updateHistoryState('lessons', {}, '#lessons', historyMode);
    AudioEngine.stopSpeaking();
    const modules = Curriculum.getModules();
    UI.renderLessons(
      modules,
      (moduleId) => _showModuleDetail(moduleId),
      () => _showSettings('lessons')
    );
  }

  function _showDashboard(historyMode = 'push') {
    _updateHistoryState('dashboard', {}, '#dashboard', historyMode);
    AudioEngine.stopSpeaking();
    
    const stats = Progress.getStats();
    const streak = Progress.getStreak();
    const todayMins = Progress.getTodayMinutes();
    const weeklyData = Progress.getWeeklyMinutes();
    const dailyTarget = 15;
    const assessmentProgress = Progress.getAssessmentProgress();
    
    // Overall course completion
    const totalLessons = Curriculum.getTotalLessons() || 100;
    const completedLessons = stats.completedLessons;
    const courseCompletionPercentage = totalLessons > 0 
      ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
      : 0;

    UI.renderDashboard(
      stats,
      streak,
      todayMins,
      dailyTarget,
      weeklyData,
      courseCompletionPercentage,
      () => _showSettings('dashboard'),
      assessmentProgress
    );
  }

  function _showModuleDetail(moduleId, historyMode = 'push') {
    _updateHistoryState('module', { moduleId }, `#module/${moduleId}`, historyMode);
    AudioEngine.stopSpeaking();
 
    const module = Curriculum.getModule(moduleId);
    if (!module) {
      UI.showToast('Module not found');
      _showLessons();
      return;
    }
 
    Progress.startModule(moduleId);
 
    UI.renderModuleDetail(
      module,
      (lessonId) => _startLesson(lessonId),
      () => window.history.back()
    );
  }

  function _showSettings(fromScreen = 'lessons', historyMode = 'push') {
    _updateHistoryState('settings', { fromScreen }, '#settings', historyMode);
    AudioEngine.stopSpeaking();
 
    UI.renderSettings(
      () => {
        window.history.back();
      },
      () => {
        Progress.resetAll();
        localStorage.removeItem('bolaMarathi_onboardingComplete');
        UI.showToast('Progress reset');
        _showOnboarding();
      }
    );
  }

  // ============================================================
  // LESSON PLAYER LOGIC
  // ============================================================

  function _startLesson(lessonId, historyMode = 'push') {
    _updateHistoryState('lesson', { lessonId }, `#lesson/${lessonId}`, historyMode);
    _currentLessonId = lessonId;
    _currentPhraseIndex = 0;
    _lessonScores = [];
    _isProcessing = false;

    const lesson = Curriculum.getLesson(lessonId);
    if (!lesson) {
      UI.showToast('Lesson not found');
      window.history.back();
      return;
    }

    _renderCurrentPhrase(lesson);
  }

  function _renderCurrentPhrase(lesson) {
    if (!lesson) {
      lesson = Curriculum.getLesson(_currentLessonId);
    }

    UI.renderLessonPlayer(lesson, _currentPhraseIndex, () => {
      // Back button
      window.history.back();
    });

    // Bind audio controls
    _bindAudioControls(lesson);

    // Bind record button
    _bindRecordButton(lesson);

    // Bind navigation
    _bindLessonNav(lesson);

    // Auto-play if enabled
    const settings = Progress.getSettings();
    if (settings.autoPlayAudio) {
      setTimeout(() => {
        _playPhrase(lesson.phrases[_currentPhraseIndex].marathi, settings.playbackSpeed);
      }, 500);
    }
  }

  function _bindAudioControls(lesson) {
    const phrase = lesson.phrases[_currentPhraseIndex];

    document.getElementById('btnPlay')?.addEventListener('click', () => {
      _playPhrase(phrase.marathi, 'normal');
    });

    document.getElementById('btnPlaySlow')?.addEventListener('click', () => {
      _playPhrase(phrase.marathi, 'slow');
    });

    document.getElementById('btnPlayFast')?.addEventListener('click', () => {
      _playPhrase(phrase.marathi, 'fast');
    });
  }

  async function _playPhrase(text, speed) {
    try {
      // Disable buttons during playback
      const btns = document.querySelectorAll('.audio-controls .btn');
      btns.forEach(b => b.disabled = true);

      await AudioEngine.speak(text, speed);

      btns.forEach(b => b.disabled = false);
    } catch (err) {
      console.error('TTS error:', err);
      UI.showToast('Could not play audio. Please check your device audio.');
      const btns = document.querySelectorAll('.audio-controls .btn');
      btns.forEach(b => b.disabled = false);
    }
  }

  function _bindRecordButton(lesson) {
    const btnRecord = document.getElementById('btnRecord');
    if (!btnRecord) return;

    btnRecord.addEventListener('click', async () => {
      if (_isProcessing) return;

      if (AudioEngine.isRecording()) {
        // Stop recording
        AudioEngine.stopRecording();
        return;
      }

      // Start recording
      UI.setRecordingState(true);
      AudioEngine.stopSpeaking();

      try {
        const result = await AudioEngine.startRecording((seconds) => {
          UI.updateRecordingTimer(seconds);
        });

        UI.setRecordingState(false);
        _isProcessing = true;

        // Show loading
        UI.showFeedbackLoading();

        // Get AI feedback
        const phrase = lesson.phrases[_currentPhraseIndex];
        const feedback = await AIFeedback.assess({
          expectedMarathi: phrase.marathi,
          expectedTransliteration: phrase.transliteration,
          expectedEnglish: phrase.english,
          userTranscription: result.transcription,
          audioBlob: result.audioBlob,
          apiKey: Progress.getApiKey(),
        });

        // Save score
        Progress.savePhraseScore(phrase.id, feedback.score);
        _lessonScores[_currentPhraseIndex] = feedback.score;

        // Show feedback
        UI.showFeedback(feedback);
        _isProcessing = false;

      } catch (err) {
        console.error('Recording error:', err);
        UI.setRecordingState(false);
        _isProcessing = false;
        UI.showToast(err.message || 'Recording failed. Please allow microphone access.');
      }
    });
  }

  function _bindLessonNav(lesson) {
    const total = lesson.phrases.length;

    // Previous button
    const btnPrev = document.getElementById('btnPrevPhrase');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (_currentPhraseIndex > 0) {
          _currentPhraseIndex--;
          _renderCurrentPhrase(lesson);
        }
      });
    }

    // Next button
    const btnNext = document.getElementById('btnNextPhrase');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (_currentPhraseIndex < total - 1) {
          _currentPhraseIndex++;
          _renderCurrentPhrase(lesson);
        } else {
          // Lesson complete!
          _finishLesson(lesson);
        }
      });
    }
  }

  function _finishLesson(lesson) {
    const validScores = _lessonScores.filter(s => s !== undefined && s !== null);
    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;
    const bestScore = validScores.length > 0
      ? Math.max(...validScores)
      : 0;

    // Save lesson completion
    Progress.completeLesson(lesson.id, avgScore);

    // Calculate XP earned this lesson
    const xpEarned = 25 + validScores.reduce((sum, s) => {
      if (s >= 90) return sum + 15;
      if (s >= 70) return sum + 10;
      if (s >= 50) return sum + 5;
      return sum + 2;
    }, 0);

    const stats = {
      avgScore,
      bestPhrase: bestScore,
      phrasesLearned: lesson.phrases.length,
      xpEarned,
    };

    // Check for next lesson
    const next = Curriculum.getNextLesson(lesson.id);

    // Check if lesson has a quiz — trigger it after completion overlay
    const quizQuestions = Curriculum.getLessonQuiz(lesson.id);

    UI.showLessonComplete(
      lesson.title,
      stats,
      next ? () => _startLesson(next.lessonId, 'replace') : null,
      () => _startLesson(lesson.id, 'replace'),
      () => _showLessons(),
      quizQuestions.length > 0 ? () => _showLessonQuiz(lesson.id, lesson.moduleId, 'replace') : null
    );
  }

  // ============================================================
  // ASSESSMENT SCREENS
  // ============================================================

  function _showFlashcards(moduleId, historyMode = 'push') {
    _updateHistoryState('flashcards', { moduleId }, `#flashcards/${moduleId}`, historyMode);
    AudioEngine.stopSpeaking();
    const cards = Curriculum.getFlashcards(moduleId);
    const module = Curriculum.getModule(moduleId);
    if (!cards.length) {
      UI.showToast('No flashcards available for this module yet.');
      window.history.back();
      return;
    }
    UI.renderFlashcards(
      cards,
      module ? `${module.icon} ${module.title}` : 'Flashcards',
      (knownCount) => {
        Progress.saveFlashcardSession(moduleId, knownCount, cards.length);
        window.history.back();
      },
      () => window.history.back()
    );
  }

  function _showLessonQuiz(lessonId, moduleId, historyMode = 'push') {
    _updateHistoryState('quiz', { lessonId, moduleId }, `#quiz/${lessonId}`, historyMode);
    AudioEngine.stopSpeaking();
    const questions = Curriculum.getLessonQuiz(lessonId);
    const lesson = Curriculum.getLesson(lessonId);
    if (!questions.length) {
      window.history.back();
      return;
    }
    UI.renderQuiz(
      questions,
      lesson ? lesson.title : 'Quiz',
      (score) => {
        Progress.saveQuizScore(lessonId, score);
        UI.showToast(`Quiz complete! Score: ${score}% 🎉`);
        window.history.back();
      },
      () => window.history.back()
    );
  }

  function _showModuleTest(moduleId, historyMode = 'push') {
    _updateHistoryState('test', { moduleId }, `#test/${moduleId}`, historyMode);
    AudioEngine.stopSpeaking();
    const test = Curriculum.getModuleTest(moduleId);
    const module = Curriculum.getModule(moduleId);
    if (!test) {
      UI.showToast('No test available for this module yet.');
      window.history.back();
      return;
    }
    UI.renderModuleTest(
      test,
      module ? `${module.icon} ${module.title}` : 'Module Test',
      (score, passed) => {
        Progress.saveTestScore(moduleId, score, passed);
        // After test, return to module
        setTimeout(() => {
          if (_currentScreen === 'test') {
            window.history.back();
          }
        }, 2500);
      },
      () => window.history.back()
    );
  }

  // ============================================================
  // SERVICE WORKER
  // ============================================================

  async function _registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('sw.js');
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    }
  }

  // ============================================================
  // PUBLIC
  // ============================================================

  return { 
    init,
    showWelcome: _showWelcome,
    showLessons: _showLessons,
    showDashboard: _showDashboard,
    showTranslator: _showTranslator,
    showPhraseBank: _showPhraseBank,
    showDictionary: _showDictionary,
    showSettings: _showSettings,
    showFlashcards: _showFlashcards,
    showLessonQuiz: _showLessonQuiz,
    showModuleTest: _showModuleTest,
  };
})();

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
