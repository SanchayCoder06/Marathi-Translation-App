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

    // Show welcoming page first
    _showWelcome();

    // Start session timer
    Progress.startSession();

    // Save session on page leave
    window.addEventListener('beforeunload', () => {
      Progress.endSession();
    });

    // Register service worker
    _registerSW();
  }

  // ============================================================
  // SCREEN NAVIGATION
  // ============================================================

  function _showWelcome() {
    _currentScreen = 'welcome';
    AudioEngine.stopSpeaking();
    UI.renderWelcome(() => {
      const apiKey = Progress.getApiKey();
      if (apiKey) {
        _showLessons();
      } else {
        _showOnboarding();
      }
    });
  }

  function _showTranslator() {
    _currentScreen = 'translator';
    AudioEngine.stopSpeaking();
    UI.renderTranslator(
      async (text, direction) => {
        const apiKey = Progress.getApiKey();
        if (!apiKey) {
          UI.showToast('Please set your Gemini API key in Settings first.');
          return null;
        }
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

  function _showPhraseBank() {
    _currentScreen = 'phrases';
    AudioEngine.stopSpeaking();
    UI.renderPhraseBank();
  }

  function _showDictionary() {
    _currentScreen = 'dictionary';
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

  function _showOnboarding() {
    _currentScreen = 'onboarding';
    UI.renderOnboarding(() => {
      _showLessons();
    });
  }

  function _showLessons() {
    _currentScreen = 'lessons';
    AudioEngine.stopSpeaking();
    const modules = Curriculum.getModules();
    UI.renderLessons(
      modules,
      (moduleId) => _showModuleDetail(moduleId),
      () => _showSettings('lessons')
    );
  }

  function _showDashboard() {
    _currentScreen = 'dashboard';
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

  function _showModuleDetail(moduleId) {
    _currentScreen = 'module';
    _currentModuleId = moduleId;
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
      () => _showLessons()
    );
  }

  function _showSettings(fromScreen = 'lessons') {
    _currentScreen = 'settings';
    AudioEngine.stopSpeaking();
 
    UI.renderSettings(
      () => {
        if (fromScreen === 'dashboard') {
          _showDashboard();
        } else {
          _showLessons();
        }
      },
      () => {
        Progress.resetAll();
        UI.showToast('Progress reset');
        _showOnboarding();
      }
    );
  }

  // ============================================================
  // LESSON PLAYER LOGIC
  // ============================================================

  function _startLesson(lessonId) {
    _currentScreen = 'lesson';
    _currentLessonId = lessonId;
    _currentPhraseIndex = 0;
    _lessonScores = [];
    _isProcessing = false;

    const lesson = Curriculum.getLesson(lessonId);
    if (!lesson) {
      UI.showToast('Lesson not found');
      _showModuleDetail(_currentModuleId);
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
      _showModuleDetail(lesson.moduleId);
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
      next ? () => _startLesson(next.lessonId) : null,
      () => _startLesson(lesson.id),
      () => _showLessons(),
      quizQuestions.length > 0 ? () => _showLessonQuiz(lesson.id, lesson.moduleId) : null
    );
  }

  // ============================================================
  // ASSESSMENT SCREENS
  // ============================================================

  function _showFlashcards(moduleId) {
    _currentScreen = 'flashcards';
    AudioEngine.stopSpeaking();
    const cards = Curriculum.getFlashcards(moduleId);
    const module = Curriculum.getModule(moduleId);
    if (!cards.length) {
      UI.showToast('No flashcards available for this module yet.');
      _showModuleDetail(moduleId);
      return;
    }
    UI.renderFlashcards(
      cards,
      module ? `${module.icon} ${module.title}` : 'Flashcards',
      (knownCount) => {
        Progress.saveFlashcardSession(moduleId, knownCount, cards.length);
        _showModuleDetail(moduleId);
      },
      () => _showModuleDetail(moduleId)
    );
  }

  function _showLessonQuiz(lessonId, moduleId) {
    _currentScreen = 'quiz';
    AudioEngine.stopSpeaking();
    const questions = Curriculum.getLessonQuiz(lessonId);
    const lesson = Curriculum.getLesson(lessonId);
    if (!questions.length) {
      _showModuleDetail(moduleId || lesson?.moduleId);
      return;
    }
    UI.renderQuiz(
      questions,
      lesson ? lesson.title : 'Quiz',
      (score) => {
        Progress.saveQuizScore(lessonId, score);
        const next = Curriculum.getNextLesson(lessonId);
        // After quiz, show continue options
        _showModuleDetail(moduleId || lesson?.moduleId);
        UI.showToast(`Quiz complete! Score: ${score}% 🎉`);
      },
      () => _showModuleDetail(moduleId || lesson?.moduleId)
    );
  }

  function _showModuleTest(moduleId) {
    _currentScreen = 'test';
    AudioEngine.stopSpeaking();
    const test = Curriculum.getModuleTest(moduleId);
    const module = Curriculum.getModule(moduleId);
    if (!test) {
      UI.showToast('No test available for this module yet.');
      _showModuleDetail(moduleId);
      return;
    }
    UI.renderModuleTest(
      test,
      module ? `${module.icon} ${module.title}` : 'Module Test',
      (score, passed) => {
        Progress.saveTestScore(moduleId, score, passed);
        // After test, return to module
        setTimeout(() => _showModuleDetail(moduleId), 2500);
      },
      () => _showModuleDetail(moduleId)
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
