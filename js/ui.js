// ============================================================
// बोला मराठी — UI Renderer
// Handles all screen rendering, transitions, and interactions
// ============================================================

const UI = (() => {
  const app = () => document.getElementById('app');

  // --- SVG Gradient Definition (used by progress rings) ---
  const SVG_DEFS = `
    <svg style="position:absolute;width:0;height:0">
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#667eea"/>
          <stop offset="100%" stop-color="#764ba2"/>
        </linearGradient>
        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#43e97b"/>
          <stop offset="100%" stop-color="#38f9d7"/>
        </linearGradient>
      </defs>
    </svg>`;

  /**
   * Initialize UI — inject SVG defs
   */
  function init() {
    document.body.insertAdjacentHTML('afterbegin', SVG_DEFS);
  }

  // ============================================================
  // ONBOARDING SCREEN
  // ============================================================

  function renderOnboarding(onStart) {
    const existingKey = Progress.getApiKey();

    app().innerHTML = `
      <div class="screen active onboarding" id="screen-onboarding">
        <div class="onboarding__logo">🙏</div>
        <h1 class="onboarding__title text-gradient">बोला मराठी</h1>
        <p class="onboarding__subtitle">Learn Conversational Marathi</p>
        
        <div class="onboarding__features">
          <div class="feature-item">
            <div class="feature-item__icon">🔊</div>
            <div class="feature-item__text">
              <strong>Listen</strong>
              Hear native Marathi pronunciation
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-item__icon">🎤</div>
            <div class="feature-item__text">
              <strong>Speak</strong>
              Record yourself repeating phrases
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-item__icon">🤖</div>
            <div class="feature-item__text">
              <strong>AI Feedback</strong>
              Get instant pronunciation assessment
            </div>
          </div>
        </div>

        <div class="api-key-section">
          <label for="apiKeyInput">Gemini API Key (for AI feedback)</label>
          <div class="input-wrapper">
            <input 
              type="password" 
              id="apiKeyInput" 
              class="input-field" 
              placeholder="Enter your Gemini API key..."
              value="${existingKey || ''}"
            />
          </div>
          <p class="input-hint">
            Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>
          </p>
        </div>

        <button class="btn btn-primary" id="btnStartLearning">
          Start Learning 🚀
        </button>
        
        <button class="btn btn-skip" id="btnSkipKey" style="margin-top: var(--space-sm)">
          Skip for now (limited feedback)
        </button>
      </div>
    `;

    document.getElementById('btnStartLearning').addEventListener('click', () => {
      const key = document.getElementById('apiKeyInput').value.trim();
      if (key) Progress.setApiKey(key);
      onStart();
    });

    document.getElementById('btnSkipKey').addEventListener('click', () => {
      onStart();
    });
  }

  // ============================================================
  // DASHBOARD SCREEN
  // ============================================================

  // ============================================================
  // LESSONS SCREEN (Modules Grid)
  // ============================================================

  function renderLessons(modules, onModuleClick, onSettingsClick) {
    app().innerHTML = `
      <div class="screen active" id="screen-lessons">
        <div class="dashboard-header">
          <div>
            <div class="dashboard-header__greeting">बोला मराठी</div>
          </div>
          <div class="dashboard-header__settings" id="btnSettings" title="Settings">⚙️</div>
        </div>

        <div class="modules-section">
          <div class="modules-section__title">Learning Modules</div>
          <div class="module-grid">
            ${modules.map(m => _renderModuleCard(m)).join('')}
          </div>
        </div>

        ${_renderNavBar('lessons')}
      </div>
    `;

    // Bind events
    document.getElementById('btnSettings').addEventListener('click', onSettingsClick);

    document.querySelectorAll('.module-card').forEach(card => {
      card.addEventListener('click', () => {
        const moduleId = card.dataset.moduleId;
        if (!card.classList.contains('locked')) {
          onModuleClick(moduleId);
        }
      });
    });

    _bindNavBarEvents();
  }

  // ============================================================
  // DASHBOARD SCREEN (Progress & Charts)
  // ============================================================

  function renderDashboard(stats, streak, todayMins, dailyTarget, weeklyData, courseCompletionPercentage, onSettingsClick) {
    // Daily target calculations
    const todayPercentage = Math.min(100, Math.round((todayMins / dailyTarget) * 100));
    const circumference = 2 * Math.PI * 34; // Larger ring: radius 34, viewBox 80x80
    const offsetDaily = circumference - (todayPercentage / 100) * circumference;

    // Course completion ring calculations
    const offsetCourse = circumference - (courseCompletionPercentage / 100) * circumference;

    // Weekly chart calculations
    const maxMins = Math.max(15, ...weeklyData.map(d => d.minutes));

    app().innerHTML = `
      <div class="screen active" id="screen-dashboard">
        <div class="dashboard-header">
          <div>
            <div class="dashboard-header__greeting">My Dashboard</div>
          </div>
          <div class="dashboard-header__settings" id="btnSettings" title="Settings">⚙️</div>
        </div>

        <!-- Progress Section -->
        <div class="progress-section glass-card" style="margin-bottom: var(--space-lg)">
          <!-- Rings Row -->
          <div class="progress-rings-container">
            <!-- Daily Goal Ring -->
            <div class="daily-goal-box">
              <div class="goal-ring-container">
                <svg viewBox="0 0 80 80" class="goal-svg">
                  <circle class="ring-bg" cx="40" cy="40" r="34"/>
                  <circle class="ring-progress ${todayMins >= dailyTarget ? 'completed' : ''}" cx="40" cy="40" r="34"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offsetDaily}"/>
                </svg>
                <div class="goal-text">
                  <span class="goal-current">${todayMins}</span>
                  <span class="goal-target">/${dailyTarget}m</span>
                </div>
              </div>
              <div class="goal-label">Daily Goal</div>
              <div class="goal-sublabel">${todayMins >= dailyTarget ? 'Goal Met! 🎉' : `${dailyTarget - todayMins}m left`}</div>
            </div>

            <!-- Course Done Ring -->
            <div class="daily-goal-box">
              <div class="goal-ring-container">
                <svg viewBox="0 0 80 80" class="goal-svg">
                  <circle class="ring-bg" cx="40" cy="40" r="34"/>
                  <circle class="ring-progress" cx="40" cy="40" r="34"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offsetCourse}"/>
                </svg>
                <div class="goal-text">
                  <span class="goal-current">${courseCompletionPercentage}%</span>
                  <span class="goal-target">${stats.completedLessons}/100</span>
                </div>
              </div>
              <div class="goal-label">Course Done</div>
              <div class="goal-sublabel">${stats.completedLessons} lessons done</div>
            </div>
          </div>

          <!-- Stats grid -->
          <div class="dashboard-stats-grid">
            <div class="d-stat-card">
              <span class="d-stat-val text-gradient">${streak}</span>
              <span class="d-stat-lbl">🔥 Streak</span>
            </div>
            <div class="d-stat-card">
              <span class="d-stat-val text-gradient">${stats.xp}</span>
              <span class="d-stat-lbl">⭐ XP</span>
            </div>
            <div class="d-stat-card">
              <span class="d-stat-val text-gradient">${stats.completedLessons}</span>
              <span class="d-stat-lbl">📚 Lessons</span>
            </div>
            <div class="d-stat-card">
              <span class="d-stat-val text-gradient">${stats.totalTimeMinutes}m</span>
              <span class="d-stat-lbl">⏳ Total Time</span>
            </div>
          </div>

          <!-- Weekly Chart -->
          <div class="weekly-chart-box" style="margin-top: var(--space-md)">
            <div class="chart-title">Weekly Activity (min)</div>
            <div class="bar-chart">
              ${weeklyData.map(day => {
                const height = Math.max(6, Math.round((day.minutes / maxMins) * 100));
                const isMet = day.minutes >= dailyTarget;
                return `
                  <div class="chart-col">
                    <div class="chart-bar-container">
                      <div class="chart-bar ${isMet ? 'target-met' : ''}" style="height: ${height}%" title="${day.minutes} mins on ${day.date}">
                        ${day.minutes > 0 ? `<span class="bar-tooltip">${day.minutes}m</span>` : ''}
                      </div>
                    </div>
                    <div class="chart-day-label">${day.day}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        ${_renderNavBar('dashboard')}
      </div>
    `;

    // Bind events
    document.getElementById('btnSettings').addEventListener('click', onSettingsClick);
    _bindNavBarEvents();
  }

  function _renderModuleCard(module) {
    const progress = Progress.getModuleProgress(module.id, module.totalLessons);
    const circumference = 2 * Math.PI * 22;
    const offset = circumference - (progress.percentage / 100) * circumference;

    return `
      <div class="glass-card module-card" data-module-id="${module.id}">
        <div class="module-card__progress-ring">
          <svg viewBox="0 0 56 56">
            <circle class="ring-bg" cx="28" cy="28" r="22"/>
            <circle class="ring-progress" cx="28" cy="28" r="22"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="module-card__icon">${module.icon}</div>
        </div>
        <div class="module-card__info">
          <div class="module-card__title">${module.title}</div>
          <div class="module-card__meta">
            ${progress.completedLessons}/${module.totalLessons} lessons · ${module.estimatedHours}h
            ${progress.avgScore > 0 ? ` · Avg: ${progress.avgScore}%` : ''}
          </div>
        </div>
        <div class="module-card__arrow">›</div>
      </div>
    `;
  }

  // ============================================================
  // MODULE DETAIL (Lesson List)
  // ============================================================

  function renderModuleDetail(module, onLessonClick, onBack) {
    const progress = Progress.getModuleProgress(module.id, module.totalLessons);

    app().innerHTML = `
      <div class="screen active" id="screen-module">
        <div class="module-header">
          <div class="module-header__back" id="btnModuleBack">←</div>
          <div class="module-header__info">
            <div class="module-header__title">${module.icon} ${module.title}</div>
            <div class="module-header__subtitle">${progress.completedLessons}/${module.totalLessons} completed</div>
          </div>
        </div>

        <div class="module-progress-bar">
          <div class="module-progress-bar__fill" style="width: ${progress.percentage}%"></div>
        </div>

        <div class="lesson-list">
          ${module.lessons.map(l => _renderLessonItem(l)).join('')}
        </div>
      </div>
    `;

    document.getElementById('btnModuleBack').addEventListener('click', onBack);

    document.querySelectorAll('.lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        onLessonClick(item.dataset.lessonId);
      });
    });
  }

  function _renderLessonItem(lesson) {
    const progress = Progress.getLessonProgress(lesson.id);
    const isCompleted = progress.completed;

    return `
      <div class="glass-card lesson-item" data-lesson-id="${lesson.id}">
        <div class="lesson-item__number ${isCompleted ? 'completed' : ''}">
          ${isCompleted ? '✓' : lesson.lessonNumber}
        </div>
        <div class="lesson-item__info">
          <div class="lesson-item__title">${lesson.title}</div>
          <div class="lesson-item__title-marathi">${lesson.titleMarathi || ''}</div>
        </div>
        ${isCompleted ? `<div class="lesson-item__score">${progress.avgScore}%</div>` : ''}
      </div>
    `;
  }

  // ============================================================
  // LESSON PLAYER — The Core Experience
  // ============================================================

  function renderLessonPlayer(lesson, currentPhraseIndex, onBack) {
    const phrase = lesson.phrases[currentPhraseIndex];
    const total = lesson.phrases.length;

    app().innerHTML = `
      <div class="screen active lesson-player" id="screen-lesson">
        <div class="lesson-player__header">
          <div class="lesson-player__back" id="btnLessonBack">←</div>
          <div class="lesson-player__title">${lesson.moduleIcon || '📖'} ${lesson.title}</div>
          <div class="lesson-player__counter">${currentPhraseIndex + 1}/${total}</div>
        </div>

        <div class="phrase-progress">
          ${lesson.phrases.map((_, i) => {
            const ps = Progress.getPhraseScore(lesson.phrases[i].id);
            let cls = '';
            if (i === currentPhraseIndex) cls = 'active';
            else if (ps.bestScore >= 70) cls = 'completed';
            else if (ps.attempts > 0) cls = 'attempted';
            return `<div class="phrase-dot ${cls}"></div>`;
          }).join('')}
        </div>

        ${lesson.culturalNote && currentPhraseIndex === 0 ? `
          <div class="cultural-note">
            <span class="cultural-note__icon">💡</span>
            <span>${lesson.culturalNote}</span>
          </div>
        ` : ''}

        <div class="glass-card phrase-card" id="phraseCard">
          <div class="phrase-card__marathi" id="phraseMarathi">${phrase.marathi}</div>
          <div class="phrase-card__transliteration" id="phraseTranslit">${phrase.transliteration}</div>
          <div class="phrase-card__english" id="phraseEnglish">${phrase.english}</div>
          ${phrase.usage ? `<div class="phrase-card__usage">${phrase.usage}</div>` : ''}
        </div>

        <div class="audio-controls" id="audioControls">
          <button class="btn btn-icon btn-slow small" id="btnPlaySlow" title="Play slowly">🐢</button>
          <button class="btn btn-icon btn-play" id="btnPlay" title="Play at normal speed">▶️</button>
          <button class="btn btn-icon btn-slow small" id="btnPlayFast" title="Play fast">⚡</button>
        </div>

        <div class="record-section" id="recordSection">
          <div class="record-section__label" id="recordLabel">Tap to record your pronunciation</div>
          <div class="waveform" id="waveform">
            ${Array(12).fill('').map(() => '<div class="waveform__bar"></div>').join('')}
          </div>
          <button class="btn btn-record" id="btnRecord" title="Record">🎤</button>
          <div class="record-section__timer" id="recordTimer" style="display:none">0s / 15s</div>
        </div>

        <div id="feedbackContainer"></div>

        <div class="lesson-nav" id="lessonNav">
          ${currentPhraseIndex > 0 ? `
            <button class="btn btn-secondary" id="btnPrevPhrase">← Previous</button>
          ` : '<div></div>'}
          <button class="btn btn-primary" id="btnNextPhrase" style="display:none">
            ${currentPhraseIndex < total - 1 ? 'Next Phrase →' : 'Finish Lesson 🎉'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnLessonBack').addEventListener('click', onBack);
  }

  /**
   * Update the feedback area after AI assessment
   */
  function showFeedback(result) {
    const container = document.getElementById('feedbackContainer');
    if (!container) return;

    const gradeClass = result.accuracy;

    container.innerHTML = `
      <div class="glass-card feedback-card">
        <div class="feedback-card__header">
          <div class="feedback-score">
            <div class="feedback-score__value ${gradeClass}" id="scoreValue">0</div>
            <div>
              <div class="feedback-score__label">Score</div>
            </div>
          </div>
          <div class="feedback-grade ${gradeClass}">
            ${result.accuracy.charAt(0).toUpperCase() + result.accuracy.slice(1)}
          </div>
        </div>

        <div class="feedback-card__message">${result.feedback}</div>

        ${result.wordScores.length > 0 ? `
          <div class="word-scores">
            ${result.wordScores.map(ws => `
              <div class="word-score-chip ${_scoreToClass(ws.score)}">
                ${ws.word}
                <span style="font-family: var(--font-ui); font-size: var(--fs-xs); opacity: 0.7; margin-left: 4px">${ws.score}%</span>
              </div>
            `).join('')}
          </div>
          ${result.wordScores.filter(ws => ws.tip).map(ws => `
            <div class="word-tip">
              <strong>${ws.word}</strong> (${ws.transliteration}): ${ws.tip}
            </div>
          `).join('')}
        ` : ''}

        <div class="feedback-card__encouragement">${result.encouragement}</div>
      </div>
    `;

    // Animate score counter
    _animateCounter('scoreValue', result.score, 800);

    // Show next button
    const nextBtn = document.getElementById('btnNextPhrase');
    if (nextBtn) nextBtn.style.display = 'flex';
  }

  /**
   * Show loading state during AI assessment
   */
  function showFeedbackLoading() {
    const container = document.getElementById('feedbackContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="glass-card feedback-card" style="text-align: center">
        <div class="loading-spinner"></div>
        <div class="loading-text">Analyzing your pronunciation...</div>
      </div>
    `;
  }

  /**
   * Update recording state UI
   */
  function setRecordingState(isRecording) {
    const btn = document.getElementById('btnRecord');
    const label = document.getElementById('recordLabel');
    const timer = document.getElementById('recordTimer');
    const waveform = document.getElementById('waveform');

    if (!btn) return;

    if (isRecording) {
      btn.classList.add('recording');
      btn.innerHTML = '⏹️';
      label.textContent = 'Recording... Tap to stop';
      timer.style.display = 'block';
      waveform.classList.add('active');
    } else {
      btn.classList.remove('recording');
      btn.innerHTML = '🎤';
      label.textContent = 'Tap to record your pronunciation';
      timer.style.display = 'none';
      waveform.classList.remove('active');
    }
  }

  /**
   * Update recording timer display
   */
  function updateRecordingTimer(seconds) {
    const timer = document.getElementById('recordTimer');
    if (timer) {
      timer.textContent = `${seconds}s / 15s`;
    }
  }

  // ============================================================
  // LESSON COMPLETE OVERLAY
  // ============================================================

  function showLessonComplete(lessonTitle, stats, onContinue, onReplay, onGoHome) {
    const overlay = document.createElement('div');
    overlay.className = 'lesson-complete';
    overlay.id = 'lessonCompleteOverlay';

    const emoji = stats.avgScore >= 90 ? '🏆' : stats.avgScore >= 70 ? '🌟' : stats.avgScore >= 50 ? '👍' : '💪';

    overlay.innerHTML = `
      <div class="lesson-complete__emoji">${emoji}</div>
      <div class="lesson-complete__title">Lesson Complete!</div>
      <div class="lesson-complete__subtitle">${lessonTitle}</div>
      
      <div class="lesson-complete__stats">
        <div class="lesson-complete__stat">
          <div class="lesson-complete__stat-value text-gradient">${stats.avgScore}%</div>
          <div class="lesson-complete__stat-label">Avg Score</div>
        </div>
        <div class="lesson-complete__stat">
          <div class="lesson-complete__stat-value text-gradient">+${stats.xpEarned}</div>
          <div class="lesson-complete__stat-label">XP Earned</div>
        </div>
        <div class="lesson-complete__stat">
          <div class="lesson-complete__stat-value text-gradient">${stats.phrasesLearned}</div>
          <div class="lesson-complete__stat-label">Phrases</div>
        </div>
        <div class="lesson-complete__stat">
          <div class="lesson-complete__stat-value text-gradient">${stats.bestPhrase}%</div>
          <div class="lesson-complete__stat-label">Best Score</div>
        </div>
      </div>

      <div class="lesson-complete__buttons">
        ${onContinue ? '<button class="btn btn-primary" id="btnLessonContinue">Next Lesson →</button>' : ''}
        <button class="btn btn-secondary" id="btnLessonReplay">Practice Again 🔄</button>
        <button class="btn btn-secondary" id="btnLessonHome">Back to Dashboard 🏠</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Show confetti for high scores
    if (stats.avgScore >= 80) _showConfetti();

    if (onContinue) {
      document.getElementById('btnLessonContinue').addEventListener('click', () => {
        _removeOverlay();
        onContinue();
      });
    }

    document.getElementById('btnLessonReplay').addEventListener('click', () => {
      _removeOverlay();
      onReplay();
    });

    document.getElementById('btnLessonHome').addEventListener('click', () => {
      _removeOverlay();
      onGoHome();
    });
  }

  function _removeOverlay() {
    const overlay = document.getElementById('lessonCompleteOverlay');
    if (overlay) overlay.remove();
    const confetti = document.querySelector('.confetti-container');
    if (confetti) confetti.remove();
  }

  // ============================================================
  // SETTINGS SCREEN
  // ============================================================

  function renderSettings(onBack, onResetProgress) {
    const settings = Progress.getSettings();

    app().innerHTML = `
      <div class="screen active" id="screen-settings">
        <div class="settings-header">
          <div class="module-header__back" id="btnSettingsBack">←</div>
          <div class="settings-header__title">Settings</div>
        </div>

        <div class="settings-group">
          <div class="settings-group__title">API Configuration</div>
          <div class="glass-card setting-item">
            <div>
              <div class="setting-item__label">Gemini API Key</div>
              <div class="setting-item__desc">Required for AI pronunciation feedback</div>
            </div>
          </div>
          <div style="padding: 0 var(--space-md); margin-top: var(--space-sm)">
            <input type="password" id="settingsApiKey" class="input-field" 
              placeholder="Enter API key..." value="${settings.apiKey || ''}"/>
            <p class="input-hint">
              <a href="https://aistudio.google.com/apikey" target="_blank">Get a free key →</a>
            </p>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group__title">Audio</div>
          <div class="glass-card setting-item">
            <div>
              <div class="setting-item__label">Playback Speed</div>
            </div>
            <div class="speed-selector" id="speedSelector">
              <button class="speed-option ${settings.playbackSpeed === 'slow' ? 'active' : ''}" data-speed="slow">0.6x</button>
              <button class="speed-option ${settings.playbackSpeed === 'normal' ? 'active' : ''}" data-speed="normal">1.0x</button>
              <button class="speed-option ${settings.playbackSpeed === 'fast' ? 'active' : ''}" data-speed="fast">1.2x</button>
            </div>
          </div>
          <div class="glass-card setting-item">
            <div>
              <div class="setting-item__label">Auto-play audio</div>
              <div class="setting-item__desc">Play phrase audio when lesson loads</div>
            </div>
            <div class="toggle ${settings.autoPlayAudio ? 'active' : ''}" id="toggleAutoPlay"></div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group__title">Display</div>
          <div class="glass-card setting-item">
            <div>
              <div class="setting-item__label">Show transliteration</div>
              <div class="setting-item__desc">Latin script pronunciation guide</div>
            </div>
            <div class="toggle ${settings.showTransliteration ? 'active' : ''}" id="toggleTranslit"></div>
          </div>
          <div class="glass-card setting-item">
            <div>
              <div class="setting-item__label">Show English translation</div>
            </div>
            <div class="toggle ${settings.showEnglish ? 'active' : ''}" id="toggleEnglish"></div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group__title">Data</div>
          <div class="glass-card setting-item" style="cursor:pointer" id="btnResetProgress">
            <div>
              <div class="setting-item__label" style="color: var(--color-error)">Reset All Progress</div>
              <div class="setting-item__desc">This cannot be undone</div>
            </div>
          </div>
        </div>

        ${_renderNavBar('settings')}
      </div>
    `;

    // Bind events
    document.getElementById('btnSettingsBack').addEventListener('click', () => {
      // Save API key before going back
      const key = document.getElementById('settingsApiKey').value.trim();
      Progress.setApiKey(key);
      onBack();
    });

    // Speed selector
    document.querySelectorAll('.speed-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        Progress.saveSetting('playbackSpeed', opt.dataset.speed);
      });
    });

    // Toggles
    _bindToggle('toggleAutoPlay', 'autoPlayAudio');
    _bindToggle('toggleTranslit', 'showTransliteration');
    _bindToggle('toggleEnglish', 'showEnglish');

    // Reset
    document.getElementById('btnResetProgress').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset ALL progress? This cannot be undone.')) {
        onResetProgress();
      }
    });

    _bindNavBarEvents();
  }

  function _bindToggle(elementId, settingKey) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('click', () => {
      el.classList.toggle('active');
      Progress.saveSetting(settingKey, el.classList.contains('active'));
    });
  }

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================

  function showToast(message, duration = 3000) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function _scoreToClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  function _animateCounter(elementId, target, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);

      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  function _showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';

    const colors = ['#667eea', '#764ba2', '#f093fb', '#43e97b', '#f6d365', '#f5576c', '#4facfe'];

    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDelay = Math.random() * 1.5 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      container.appendChild(piece);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
  }

  function renderWelcome(onStart) {
    app().innerHTML = `
      <div class="screen active welcome-screen" id="screen-welcome">
        <div class="welcome-hero">
          <div class="welcome-logo">म</div>
          <h1 class="welcome-title text-gradient">बोला मराठी</h1>
          <p class="welcome-tagline">Speak Marathi with Confidence</p>
        </div>
        
        <div class="welcome-card glass-card">
          <h3>Welcome to Your AI Marathi Tutor! 🙏</h3>
          <p>Learn conversational Marathi through speaking practice with real-time AI pronunciation feedback.</p>
        </div>

        <div class="welcome-features">
          <div class="welcome-feature-card">
            <span class="w-feature-icon">📖</span>
            <h4>100 Lessons</h4>
            <p>60-hour structured conversational curriculum</p>
          </div>
          <div class="welcome-feature-card">
            <span class="w-feature-icon">🎙️</span>
            <h4>AI Practice</h4>
            <p>Speak, record, and get instant feedback</p>
          </div>
          <div class="welcome-feature-card">
            <span class="w-feature-icon">🔄</span>
            <h4>AI Translator</h4>
            <p>English & Hindi bi-directional translation</p>
          </div>
          <div class="welcome-feature-card">
            <span class="w-feature-icon">🎥</span>
            <h4>Video Classes</h4>
            <p>Curated classes for each of the 12 modules</p>
          </div>
        </div>

        <button class="btn btn-primary btn-welcome-start" id="btnWelcomeStart">
          Get Started 🚀
        </button>
      </div>
    `;

    document.getElementById('btnWelcomeStart').addEventListener('click', onStart);
  }

  function renderTranslator(onTranslate, onSpeak, onCopy) {
    app().innerHTML = `
      <div class="screen active translator-screen" id="screen-translator">
        <div class="screen-header">
          <h1 class="screen-title text-gradient">AI Translator</h1>
          <p class="screen-subtitle">Bi-directional Marathi translation</p>
        </div>

        <div class="glass-card translator-card">
          <div class="translator-direction">
            <label for="translateDirection">Translation Path</label>
            <select id="translateDirection" class="input-field select-field">
              <option value="en_to_mr">English ➔ Marathi (मराठी)</option>
              <option value="mr_to_en">Marathi (मराठी) ➔ English</option>
              <option value="hi_to_mr">Hindi (हिंदी) ➔ Marathi (मराठी)</option>
              <option value="mr_to_hi">Marathi (मराठी) ➔ Hindi (हिंदी)</option>
            </select>
          </div>

          <div class="translator-input-area">
            <label for="translatorInput">Text to Translate</label>
            <textarea id="translatorInput" class="input-field textarea-field" placeholder="Type text here..."></textarea>
          </div>

          <button class="btn btn-primary" id="btnTranslate">
            Translate 🔄
          </button>
        </div>

        <div id="translationResultContainer"></div>

        ${_renderNavBar('translator')}
      </div>
    `;

    _bindNavBarEvents();

    const btnTranslate = document.getElementById('btnTranslate');
    const input = document.getElementById('translatorInput');
    const direction = document.getElementById('translateDirection');
    const resultContainer = document.getElementById('translationResultContainer');

    btnTranslate.addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) {
        showToast('Please enter text to translate.');
        return;
      }

      btnTranslate.disabled = true;
      btnTranslate.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;margin:0"></div>';
      resultContainer.innerHTML = '';

      const result = await onTranslate(text, direction.value);

      btnTranslate.disabled = false;
      btnTranslate.innerHTML = 'Translate 🔄';

      if (result) {
        const isTargetMarathi = direction.value === 'en_to_mr' || direction.value === 'hi_to_mr';
        
        resultContainer.innerHTML = `
          <div class="glass-card result-card feedback-card">
            <div class="result-header">
              <span class="text-label">Translation</span>
              <div class="result-actions">
                <button class="btn btn-icon btn-secondary small" id="btnSpeakResult" title="Speak translation">🔊</button>
                <button class="btn btn-icon btn-secondary small" id="btnCopyResult" title="Copy to clipboard">📋</button>
              </div>
            </div>
            
            <div class="${isTargetMarathi ? 'text-marathi-large' : 'text-english'}" style="margin-top: var(--space-sm)">
              ${result.translatedText}
            </div>

            ${isTargetMarathi && result.transliteration ? `
              <div class="text-transliteration" style="margin-top: var(--space-xs)">
                ${result.transliteration}
              </div>
            ` : ''}
          </div>
        `;

        document.getElementById('btnSpeakResult').addEventListener('click', () => {
          onSpeak(result.translatedText);
        });

        document.getElementById('btnCopyResult').addEventListener('click', () => {
          onCopy(result.translatedText);
        });
      }
    });
  }

  const VIDEOS_DATA = {
    'm1': { title: 'Greetings & Basics', youtubeId: 'mD5T-YQ9pM0', desc: 'Learn essential everyday Marathi greetings, courtesy words, and formal/informal speech.' },
    'm2': { title: 'Introducing Yourself', youtubeId: 'v50Z7v1r7lM', desc: 'Introduce your name, profession, origin, talk about your family, and share future plans.' },
    'm3': { title: 'Numbers & Time', youtubeId: 'b8H-L2K3kP4', desc: 'Master Marathi counting from 1 to 100, read times on clocks, days, months, and seasons.' },
    'm4': { title: 'At the Market', youtubeId: 'R8mX7rT6bM9', desc: 'Navigate grocery shopping, bargain like a local, buy vegetables/fruits, and pay using cash or UPI.' },
    'm5': { title: 'Food & Dining', youtubeId: 'y8N3fP7rV2m', desc: 'Order delicious Maharashtrian dishes, specify taste preferences, ask for kitchen utensils, and request the bill.' },
    'm6': { title: 'Directions & Travel', youtubeId: 'K8rT9mP5v6c', desc: 'Ask for directions, understand navigation instructions, buy local train tickets, and ask about travel timetables.' },
    'm7': { title: 'Daily Routine', youtubeId: 'J8n3vP9rT5m', desc: 'Discuss your morning habits, describe household chores, talk about office work schedule, and leisure activities.' },
    'm8': { title: 'People & Descriptions', youtubeId: 'L5v6mP9rT8n', desc: 'Describe peoples heights, physical features, outer appearances, traits, emotions, and family bonds.' },
    'm9': { title: 'Health & Emergencies', youtubeId: 'N8mP3v6rT9k', desc: 'Explain bodily discomforts to a doctor, buy medications at a pharmacy, and shout or phone for emergency help.' },
    'm10': { title: 'Social Conversations', youtubeId: 'H5n6vP7rT8m', desc: 'Discuss hobbies, weather, small talk with neighbors, invite friends over, and show polite hospitality.' },
    'm11': { title: 'Work & Business', youtubeId: 'P8r3vP9rT6k', desc: 'Introduce yourself in corporate settings, speak on phone calls, manage office vocabulary, and schedule business meetings.' },
    'm12': { title: 'Culture & Celebration', youtubeId: 'C8mP5v6rT9k', desc: 'Celebrate Ganesh Utsav, offer blessings to children, understand cultural idioms, and greet congratulations.' }
  };

  function renderVideos(activeModuleId, onModuleChange) {
    const video = VIDEOS_DATA[activeModuleId];
    
    app().innerHTML = `
      <div class="screen active videos-screen" id="screen-videos">
        <div class="screen-header">
          <h1 class="screen-title text-gradient">Video Lessons</h1>
          <p class="screen-subtitle">Curated video tutorials by module</p>
        </div>

        <div class="video-module-select">
          <label for="videoModuleDropdown">Select Module</label>
          <select id="videoModuleDropdown" class="input-field select-field">
            ${Object.keys(VIDEOS_DATA).map(mid => `
              <option value="${mid}" ${mid === activeModuleId ? 'selected' : ''}>
                Module ${mid.substring(1)}: ${VIDEOS_DATA[mid].title}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="glass-card video-card">
          <div class="video-embed-container">
            <iframe 
              src="https://www.youtube.com/embed/${video.youtubeId}" 
              title="YouTube video player" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          </div>
          
          <div class="video-details" style="margin-top: var(--space-md)">
            <h3>${video.title}</h3>
            <p style="font-size: var(--fs-sm); color: var(--text-secondary); margin-top: 4px; line-height: var(--lh-relaxed)">
              ${video.desc}
            </p>
          </div>
        </div>

        ${_renderNavBar('videos')}
      </div>
    `;

    _bindNavBarEvents();

    const dropdown = document.getElementById('videoModuleDropdown');
    dropdown.addEventListener('change', () => {
      onModuleChange(dropdown.value);
    });
  }

  function _renderNavBar(activeTab) {
    return `
      <div class="bottom-nav">
        <button class="nav-item ${activeTab === 'lessons' ? 'active' : ''}" id="navLessons">
          <span class="nav-icon">📖</span>
          <span class="nav-text">Lessons</span>
        </button>
        <button class="nav-item ${activeTab === 'translator' ? 'active' : ''}" id="navTranslator">
          <span class="nav-icon">🔄</span>
          <span class="nav-text">Translate</span>
        </button>
        <button class="nav-item ${activeTab === 'videos' ? 'active' : ''}" id="navVideos">
          <span class="nav-icon">🎥</span>
          <span class="nav-text">Videos</span>
        </button>
        <button class="nav-item ${activeTab === 'dashboard' ? 'active' : ''}" id="navDashboard">
          <span class="nav-icon">📊</span>
          <span class="nav-text">Dashboard</span>
        </button>
      </div>
    `;
  }

  function _bindNavBarEvents() {
    document.getElementById('navLessons')?.addEventListener('click', () => App.showLessons());
    document.getElementById('navTranslator')?.addEventListener('click', () => App.showTranslator());
    document.getElementById('navVideos')?.addEventListener('click', () => App.showVideos());
    document.getElementById('navDashboard')?.addEventListener('click', () => App.showDashboard());
  }

  return {
    init,
    renderOnboarding,
    renderLessons,
    renderDashboard,
    renderModuleDetail,
    renderLessonPlayer,
    showFeedback,
    showFeedbackLoading,
    setRecordingState,
    updateRecordingTimer,
    showLessonComplete,
    renderSettings,
    showToast,
    renderWelcome,
    renderTranslator,
    renderVideos
  };
})();
