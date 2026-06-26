// ============================================================
// बोला मराठी — UI Renderer
// Handles all screen rendering, transitions, and interactions
// ============================================================

const UI = (() => {
  const app = () => document.getElementById('screenContainer');

  // --- SVG Gradient Definition (used by progress rings) ---
  const SVG_DEFS = `
    <svg style="position:absolute;width:0;height:0">
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0072ff"/>
          <stop offset="100%" stop-color="#00d2ff"/>
        </linearGradient>
        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#43e97b"/>
          <stop offset="100%" stop-color="#38f9d7"/>
        </linearGradient>
      </defs>
    </svg>`;

  // --- Local Seed Dictionary Database (30 Words) ---
  const LOCAL_DICTIONARY = [
    { word: 'नमस्कार', transliteration: 'Namaskar', partOfSpeech: 'Greeting', englishMeaning: 'Hello / Greetings', hindiMeaning: 'नमस्ते / नमस्कार', exampleMarathi: 'नमस्कार, तुमचे नाव काय आहे?', exampleEnglish: 'Hello, what is your name?', exampleHindi: 'नमस्ते, आपका नाम क्या है?' },
    { word: 'धन्यवाद', transliteration: 'Dhanyavaad', partOfSpeech: 'Noun', englishMeaning: 'Thank you', hindiMeaning: 'धन्यवाद / शुक्रिया', exampleMarathi: 'मदतीसाठी खूप खूप धन्यवाद.', exampleEnglish: 'Thank you very much for the help.', exampleHindi: 'मदद के लिए बहुत--बहुत धन्यवाद।' },
    { word: 'कृपया', transliteration: 'Krupaya', partOfSpeech: 'Adverb', englishMeaning: 'Please', hindiMeaning: 'कृपया', exampleMarathi: 'कृपया मला पाणी द्या.', exampleEnglish: 'Please give me water.', exampleHindi: 'कृपया मुझे पानी दें।' },
    { word: 'कसे आहात', transliteration: 'Kase aahat', partOfSpeech: 'Phrase', englishMeaning: 'How are you? (formal)', hindiMeaning: 'आप कैसे हैं?', exampleMarathi: 'काका, तुम्ही कसे आहात?', exampleEnglish: 'Uncle, how are you?', exampleHindi: 'चाचाजी, आप कैसे हैं?' },
    { word: 'ठीक आहे', transliteration: 'Theek aahe', partOfSpeech: 'Adverb', englishMeaning: 'Okay / All right', hindiMeaning: 'ठीक है / अच्छा', exampleMarathi: 'ठीक आहे, आपण उद्या भेटू.', exampleEnglish: 'Okay, we will meet tomorrow.', exampleHindi: 'ठीक है, हम कल मिलेंगे।' },
    { word: 'हो', transliteration: 'Ho', partOfSpeech: 'Adverb', englishMeaning: 'Yes', hindiMeaning: 'हाँ', exampleMarathi: 'हो, मी मराठी शिकत आहे.', exampleEnglish: 'Yes, I am learning Marathi.', exampleHindi: 'हाँ, मैं मराठी सीख रहा हूँ।' },
    { word: 'नाही', transliteration: 'Naahi', partOfSpeech: 'Adverb', englishMeaning: 'No', hindiMeaning: 'नहीं', exampleMarathi: 'नाही, मला चहा नको आहे.', exampleEnglish: 'No, I do not want tea.', exampleHindi: 'नहीं, मुझे चाय नहीं चाहिए।' },
    { word: 'पाणी', transliteration: 'Paani', partOfSpeech: 'Noun', englishMeaning: 'Water', hindiMeaning: 'पानी / जल', exampleMarathi: 'मला प्यायला पाणी हवे आहे.', exampleEnglish: 'I want water to drink.', exampleHindi: 'मुझे पीने के लिए पानी चाहिए।' },
    { word: 'जेवण', transliteration: 'Jevan', partOfSpeech: 'Noun', englishMeaning: 'Food / Meal', hindiMeaning: 'खाना / भोजन', exampleMarathi: 'तुम्ही जेवण केले का?', exampleEnglish: 'Did you have your food?', exampleHindi: 'क्या आपने खाना खाया?' },
    { word: 'चहा', transliteration: 'Chaha', partOfSpeech: 'Noun', englishMeaning: 'Tea', hindiMeaning: 'चाय', exampleMarathi: 'मला गरम चहा आवडतो.', exampleEnglish: 'I like hot tea.', exampleHindi: 'मुझे गर्म चाय पसंद है।' },
    { word: 'घर', transliteration: 'Ghar', partOfSpeech: 'Noun', englishMeaning: 'House / Home', hindiMeaning: 'घर / मकान', exampleMarathi: 'हे माझे नवीन घर आहे.', exampleEnglish: 'This is my new house.', exampleHindi: 'यह मेरा नया घर है।' },
    { word: 'शाळा', transliteration: 'Shaala', partOfSpeech: 'Noun', englishMeaning: 'School', hindiMeaning: 'स्कूल / विद्यालय', exampleMarathi: 'मुले शाळेत जात आहेत.', exampleEnglish: 'Children are going to school.', exampleHindi: 'बच्चे school जा रहे हैं।' },
    { word: 'गाव', transliteration: 'Gaav', partOfSpeech: 'Noun', englishMeaning: 'Village / Town', hindiMeaning: 'गाँव / शहर', exampleMarathi: 'माझे गाव खूप सुंदर आहे.', exampleEnglish: 'My village is very beautiful.', exampleHindi: 'मेरा गाँव बहुत सुंदर है।' },
    { word: 'नाव', transliteration: 'Naav', partOfSpeech: 'Noun', englishMeaning: 'Name', hindiMeaning: 'नाम', exampleMarathi: 'तुमचे नाव काय आहे?', exampleEnglish: 'What is your name?', exampleHindi: 'आपका नाम क्या है?' },
    { word: 'मित्र', transliteration: 'Mitra', partOfSpeech: 'Noun', englishMeaning: 'Friend', hindiMeaning: 'मित्र / दोस्त', exampleMarathi: 'तो माझा चांगला मित्र आहे.', exampleEnglish: 'He is my good friend.', exampleHindi: 'वह मेरा अच्छा दोस्त है।' },
    { word: 'आज', transliteration: 'Aaj', partOfSpeech: 'Adverb', englishMeaning: 'Today', hindiMeaning: 'आज', exampleMarathi: 'आज खूप चांगला दिवस आहे.', exampleEnglish: 'Today is a very good day.', exampleHindi: 'आज बहुत अच्छा दिन है।' },
    { word: 'उद्या', transliteration: 'Udya', partOfSpeech: 'Adverb', englishMeaning: 'Tomorrow', hindiMeaning: 'कल (आने वाला)', exampleMarathi: 'मी उद्या मुंबईला जाईन.', exampleEnglish: 'I will go to Mumbai tomorrow.', exampleHindi: 'मैं कल मुंबई जाऊँगा।' },
    { word: 'काल', transliteration: 'Kaal', partOfSpeech: 'Adverb', englishMeaning: 'Yesterday', hindiMeaning: 'कल (बीता हुआ)', exampleMarathi: 'काल खूप पाऊस पडला.', exampleEnglish: 'It rained heavily yesterday.', exampleHindi: 'कल बहुत तेज बारिश हुई थी।' },
    { word: 'मला', transliteration: 'Mala', partOfSpeech: 'Pronoun', englishMeaning: 'To me / For me', hindiMeaning: 'मुझे / मुझको', exampleMarathi: 'मला मराठी बोलायला आवडते.', exampleEnglish: 'I like to speak Marathi.', exampleHindi: 'मुझे मराठी बोलना पसंद है।' },
    { word: 'तुला', transliteration: 'Tula', partOfSpeech: 'Pronoun', englishMeaning: 'To you (informal)', hindiMeaning: 'तुम्हें / तुझको', exampleMarathi: 'तुला काय हवे आहे?', exampleEnglish: 'What do you want?', exampleHindi: 'तुम्हें क्या चाहिए?' },
    { word: 'किती', transliteration: 'Kiti', partOfSpeech: 'Adjective', englishMeaning: 'How much / How many', hindiMeaning: 'कितना / कितने', exampleMarathi: 'या पुस्तकाची किंमत किती आहे?', exampleEnglish: 'How much does this book cost?', exampleHindi: 'इस किताब की कीमत कितनी है?' },
    { word: 'कुठे', transliteration: 'Kuthe', partOfSpeech: 'Adverb', englishMeaning: 'Where', hindiMeaning: 'कहाँ', exampleMarathi: 'तुम्ही कुठे जात आहात?', exampleEnglish: 'Where are you going?', exampleHindi: 'आप कहाँ जा रहे हैं?' },
    { word: 'कधी', transliteration: 'Kadhi', partOfSpeech: 'Adverb', englishMeaning: 'When', hindiMeaning: 'कब', exampleMarathi: 'तुम्ही परत कधी येणार?', exampleEnglish: 'When will you return?', exampleHindi: 'आप वापस कब आएंगे?' },
    { word: 'काय', transliteration: 'Kaay', partOfSpeech: 'Pronoun', englishMeaning: 'What', hindiMeaning: 'क्या', exampleMarathi: 'तुझ्या हातात काय आहे?', exampleEnglish: 'What is in your hand?', exampleHindi: 'तुम्हारे हाथ में क्या है?' },
    { word: 'कोण', transliteration: 'Koun', partOfSpeech: 'Pronoun', englishMeaning: 'Who', hindiMeaning: 'कौन', exampleMarathi: 'तिथे दरवाजावर कोण उभे आहे?', exampleEnglish: 'Who is standing at the door?', exampleHindi: 'वहाँ दरवाजे पर कौन खड़ा है?' },
    { word: 'का', transliteration: 'Ka', partOfSpeech: 'Adverb', englishMeaning: 'Why', hindiMeaning: 'क्यों', exampleMarathi: 'तुम्ही हसत आहात का?', exampleEnglish: 'Why are you laughing?', exampleHindi: 'आप क्यों हंस रहे हैं?' },
    { word: 'कसे', transliteration: 'Kase', partOfSpeech: 'Adverb', englishMeaning: 'How', hindiMeaning: 'कैसे', exampleMarathi: 'हे काम कसे करायचे?', exampleEnglish: 'How to do this work?', exampleHindi: 'यह काम कैसे करना है?' },
    { word: 'सुंदर', transliteration: 'Sundar', partOfSpeech: 'Adjective', englishMeaning: 'Beautiful', hindiMeaning: 'सुंदर / खूबसूरत', exampleMarathi: 'ती बाग खूप सुंदर आहे.', exampleEnglish: 'That garden is very beautiful.', exampleHindi: 'वह बगीचा बहुत सुंदर है।' },
    { word: 'मोठा', transliteration: 'Motha', partOfSpeech: 'Adjective', englishMeaning: 'Big / Large', hindiMeaning: 'बड़ा', exampleMarathi: 'हा मोठा बंगला आहे.', exampleEnglish: 'This is a big bungalow.', exampleHindi: 'यह बड़ा बंगला है।' },
    { word: 'लहान', transliteration: 'Lahaan', partOfSpeech: 'Adjective', englishMeaning: 'Small / Little', hindiMeaning: 'छोटा', exampleMarathi: 'मला लहान कुत्र्याचे पिल्लू हवे आहे.', exampleEnglish: 'I want a small puppy.', exampleHindi: 'मुझे एक छोटा पिल्ला चाहिए।' }
  ];

  /**
   * Initialize UI — inject SVG defs and layout structure
   */
  function init() {
    document.body.insertAdjacentHTML('afterbegin', SVG_DEFS);

    // Initialize layout structure in #app
    const appEl = document.getElementById('app');
    if (appEl) {
      const currentHTML = appEl.innerHTML;
      appEl.innerHTML = `
        <nav class="app-nav" id="appNav" style="display: none;"></nav>
        <main id="mainContent">
          <div id="screenContainer">
            ${currentHTML}
          </div>
        </main>
      `;
    }

    // Initialize navigation bar content and events
    const navEl = document.getElementById('appNav');
    if (navEl) {
      navEl.innerHTML = `
        <div class="nav-brand">
          <span class="nav-brand-logo">🙏</span>
          <span class="nav-brand-text text-gradient">बोला मराठी</span>
        </div>
        <div class="nav-menu">
          <button class="nav-item" id="navLessons" data-tab="lessons">
            <span class="nav-icon">📖</span>
            <span class="nav-text">Lessons</span>
          </button>
          <button class="nav-item" id="navTranslator" data-tab="translator">
            <span class="nav-icon">🔄</span>
            <span class="nav-text">Translate</span>
          </button>
          <button class="nav-item" id="navDictionary" data-tab="dictionary">
            <span class="nav-icon">📚</span>
            <span class="nav-text">Dictionary</span>
          </button>
          <button class="nav-item" id="navVideos" data-tab="videos">
            <span class="nav-icon">🎥</span>
            <span class="nav-text">Videos</span>
          </button>
          <button class="nav-item" id="navDashboard" data-tab="dashboard">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Dashboard</span>
          </button>
        </div>
        <button class="nav-item" id="navSettings" data-tab="settings">
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">Settings</span>
        </button>
      `;

      // Bind events once
      document.getElementById('navLessons')?.addEventListener('click', () => App.showLessons());
      document.getElementById('navTranslator')?.addEventListener('click', () => App.showTranslator());
      document.getElementById('navDictionary')?.addEventListener('click', () => App.showDictionary());
      document.getElementById('navVideos')?.addEventListener('click', () => App.showVideos());
      document.getElementById('navDashboard')?.addEventListener('click', () => App.showDashboard());
      document.getElementById('navSettings')?.addEventListener('click', () => App.showSettings());
    }
  }

  /**
   * Update the global navbar visibility and active highlights
   */
  function _updateNavBar(activeTab) {
    const nav = document.getElementById('appNav');
    if (!nav) return;
    if (activeTab) {
      nav.style.display = '';
      nav.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === activeTab);
      });
    } else {
      nav.style.display = 'none';
    }
  }

  // ============================================================
  // ONBOARDING SCREEN
  // ============================================================

  function renderOnboarding(onStart) {
    _updateNavBar(null);
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
    _updateNavBar('lessons');
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
  }

  // ============================================================
  // DASHBOARD SCREEN (Progress & Charts)
  // ============================================================

  function renderDashboard(stats, streak, todayMins, dailyTarget, weeklyData, courseCompletionPercentage, onSettingsClick, assessmentProgress) {
    _updateNavBar('dashboard');
    // Daily target calculations
    const todayPercentage = Math.min(100, Math.round((todayMins / dailyTarget) * 100));
    const circumference = 2 * Math.PI * 34; // Larger ring: radius 34, viewBox 80x80
    const offsetDaily = circumference - (todayPercentage / 100) * circumference;

    // Course completion ring calculations
    const offsetCourse = circumference - (courseCompletionPercentage / 100) * circumference;

    // Weekly chart calculations
    const maxMins = Math.max(15, ...weeklyData.map(d => d.minutes));

    // Assessment stats
    const ap = assessmentProgress || { quizCount: 0, testsPassed: 0, fcSessions: 0 };

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
                  <span class="goal-target">${stats.completedLessons} done</span>
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

          <!-- Assessment Stats Row -->
          <div style="margin-top: var(--space-md); border-top: 1px solid rgba(255,255,255,0.07); padding-top: var(--space-md);">
            <div class="chart-title">Assessment Progress</div>
            <div class="dashboard-stats-grid" style="margin-top: 8px">
              <div class="d-stat-card">
                <span class="d-stat-val text-gradient">${ap.quizCount}</span>
                <span class="d-stat-lbl">🧠 Quizzes Done</span>
              </div>
              <div class="d-stat-card">
                <span class="d-stat-val text-gradient">${ap.testsPassed}</span>
                <span class="d-stat-lbl">📝 Tests Passed</span>
              </div>
              <div class="d-stat-card">
                <span class="d-stat-val text-gradient">${ap.fcSessions}</span>
                <span class="d-stat-lbl">📇 FC Sessions</span>
              </div>
              <div class="d-stat-card">
                <span class="d-stat-val text-gradient">${ap.testsAttempted || 0}</span>
                <span class="d-stat-lbl">📋 Tests Tried</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Bind events
    document.getElementById('btnSettings').addEventListener('click', onSettingsClick);
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
    _updateNavBar('lessons');
    const progress = Progress.getModuleProgress(module.id, module.totalLessons);
    const testProgress = Progress.getTestProgress(module.id);
    const canTakeTest = progress.percentage >= 80;

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

        <div class="assessment-actions">
          <button class="btn btn-flashcard" id="btnFlashcards">📇 Flashcards</button>
          <button class="btn btn-test ${canTakeTest ? '' : 'locked'}" id="btnModuleTest" title="${canTakeTest ? 'Take module test' : 'Complete 80% of lessons to unlock'}">
            ${testProgress?.passed ? '✅' : '📝'} ${testProgress?.passed ? `Retake Test` : canTakeTest ? 'Take Test' : '🔒 Test'}
          </button>
        </div>

        <div class="lesson-list">
          ${module.lessons.map(l => _renderLessonItem(l)).join('')}
        </div>
      </div>
    `;

    document.getElementById('btnModuleBack').addEventListener('click', onBack);
    document.getElementById('btnFlashcards')?.addEventListener('click', () => App.showFlashcards(module.id));
    if (canTakeTest) {
      document.getElementById('btnModuleTest')?.addEventListener('click', () => App.showModuleTest(module.id));
    }

    document.querySelectorAll('.lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        onLessonClick(item.dataset.lessonId);
      });
    });
  }

  function _renderLessonItem(lesson) {
    const progress = Progress.getLessonProgress(lesson.id);
    const isCompleted = progress.completed;
    const quizProg = Progress.getQuizProgress(lesson.id);
    const hasQuiz = lesson.hasQuiz;

    return `
      <div class="glass-card lesson-item" data-lesson-id="${lesson.id}">
        <div class="lesson-item__number ${isCompleted ? 'completed' : ''}">
          ${isCompleted ? '✓' : lesson.lessonNumber}
        </div>
        <div class="lesson-item__info">
          <div class="lesson-item__title">${lesson.title}</div>
          <div class="lesson-item__title-marathi">${lesson.titleMarathi || ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">
          ${isCompleted ? `<div class="lesson-item__score">${progress.avgScore}%</div>` : ''}
          ${hasQuiz && quizProg ? `<div class="lesson-item__quiz-passed">✓ Quiz</div>` : ''}
          ${hasQuiz && !quizProg ? `<div class="lesson-item__quiz-badge">QUIZ</div>` : ''}
        </div>
      </div>
    `;
  }

  // ============================================================
  // LESSON PLAYER — The Core Experience
  // ============================================================

  function renderLessonPlayer(lesson, currentPhraseIndex, onBack) {
    _updateNavBar('lessons');
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

  function showLessonComplete(lessonTitle, stats, onContinue, onReplay, onGoHome, onQuiz) {
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
        ${onQuiz ? '<button class="btn btn-primary" id="btnLessonQuiz">🧠 Take Quiz →</button>' : ''}
        ${onContinue ? '<button class="btn btn-primary" id="btnLessonContinue">Next Lesson →</button>' : ''}
        <button class="btn btn-secondary" id="btnLessonReplay">Practice Again 🔄</button>
        <button class="btn btn-secondary" id="btnLessonHome">Back to Lessons 🏠</button>
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
    _updateNavBar('settings');
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
    _updateNavBar(null);
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
    _updateNavBar('translator');
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

      </div>
    `;

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
    _updateNavBar('videos');
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

      </div>
    `;

    const dropdown = document.getElementById('videoModuleDropdown');
    dropdown.addEventListener('change', () => {
      onModuleChange(dropdown.value);
    });
  }

  function renderDictionary(onLookupAI, onSpeak) {
    _updateNavBar('dictionary');
    app().innerHTML = `
      <div class="screen active dictionary-screen" id="screen-dictionary">
        <div class="screen-header">
          <h1 class="screen-title text-gradient">Marathi Dictionary</h1>
          <p class="screen-subtitle">Instant offline search with AI vocabulary lookup</p>
        </div>

        <div class="glass-card dictionary-search-container">
          <label for="dictSearchInput">Search Word</label>
          <div class="search-input-wrapper">
            <input 
              type="text" 
              id="dictSearchInput" 
              class="input-field" 
              placeholder="Type in Marathi or English..."
            />
            <button class="btn btn-primary" id="btnDictSearch">Search 🔍</button>
          </div>

          <div class="dict-chips-section">
            <div class="dict-chips-title">Common Words</div>
            <div class="dict-chips-list" id="dictChipsList">
              ${LOCAL_DICTIONARY.map(item => `
                <button class="dict-chip" data-word="${item.word}">${item.word}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="dictResultContainer"></div>

      </div>
    `;

    const searchInput = document.getElementById('dictSearchInput');
    const searchBtn = document.getElementById('btnDictSearch');
    const resultContainer = document.getElementById('dictResultContainer');

    function performSearch(query) {
      if (!query) return;
      query = query.trim().toLowerCase();

      resultContainer.innerHTML = '';

      const match = LOCAL_DICTIONARY.find(item => 
        item.word.toLowerCase() === query ||
        item.transliteration.toLowerCase() === query ||
        item.englishMeaning.toLowerCase().includes(query) ||
        item.hindiMeaning.toLowerCase().includes(query)
      );

      if (match) {
        _renderDictCard(match);
      } else {
        resultContainer.innerHTML = `
          <div class="dict-ai-prompt glass-card">
            <div class="dict-ai-prompt__text">
              Word "<strong>${query}</strong>" was not found in the local database.
              Would you like to query the AI tutor online?
            </div>
            <button class="btn btn-primary" id="btnLookupAI">AI Lookup 🤖</button>
          </div>
        `;

        document.getElementById('btnLookupAI').addEventListener('click', async () => {
          const btn = document.getElementById('btnLookupAI');
          btn.disabled = true;
          btn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;margin:0"></div>';

          try {
            const aiResult = await onLookupAI(query);
            if (aiResult && aiResult.word) {
              _renderDictCard(aiResult);
            } else {
              resultContainer.innerHTML = `
                <div class="glass-card" style="text-align: center; color: var(--color-error)">
                  Could not retrieve AI definition. Please verify your internet and API key.
                </div>
              `;
            }
          } catch (err) {
            showToast('AI Lookup failed.');
            resultContainer.innerHTML = `
              <div class="glass-card" style="text-align: center; color: var(--color-error)">
                Error: ${err.message || 'AI Lookup failed.'}
              </div>
            `;
          }
        });
      }
    }

    function _renderDictCard(item) {
      resultContainer.innerHTML = `
        <div class="glass-card dict-card">
          <div class="dict-word-header">
            <div class="dict-word-main">
              <div class="dict-word-marathi">${item.word}</div>
              <div class="dict-word-translit">${item.transliteration}</div>
              <div class="dict-word-pos">${item.partOfSpeech || 'Word'}</div>
            </div>
            <button class="btn btn-icon btn-secondary small" id="btnSpeakDictWord" title="Speak word" style="border-radius: var(--radius-full)">🔊</button>
          </div>

          <div class="dict-word-meanings">
            <div class="dict-meaning-row">
              <div class="dict-meaning-label">English Meaning</div>
              <div class="dict-meaning-value">${item.englishMeaning}</div>
            </div>
            <div class="dict-meaning-row" style="margin-top: var(--space-xs)">
              <div class="dict-meaning-label">Hindi Meaning</div>
              <div class="dict-meaning-value">${item.hindiMeaning}</div>
            </div>
          </div>

          ${item.exampleMarathi ? `
            <div class="dict-example-box">
              <div class="dict-example-title">Example Usage</div>
              <div class="dict-example-marathi">${item.exampleMarathi}</div>
              <div class="dict-example-translation">${item.exampleEnglish}</div>
              ${item.exampleHindi ? `<div class="dict-example-translation" style="font-style: normal; opacity: 0.85; margin-top: 2px">${item.exampleHindi}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;

      document.getElementById('btnSpeakDictWord').addEventListener('click', () => {
        onSpeak(item.word);
      });
    }

    document.querySelectorAll('.dict-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const word = chip.dataset.word;
        searchInput.value = word;
        performSearch(word);
      });
    });

    searchBtn.addEventListener('click', () => {
      performSearch(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch(searchInput.value);
      }
    });
  }

  // ============================================================
  // FLASHCARDS SCREEN
  // ============================================================

  /**
   * Render the flip-card flashcard deck
   * @param {Array} cards - Array of flashcard objects
   * @param {string} title - Module title (with icon)
   * @param {Function} onComplete - Called with knownCount when deck is done
   * @param {Function} onBack - Called when user taps back
   */
  function renderFlashcards(cards, title, onComplete, onBack) {
    _updateNavBar('lessons');
    let currentIndex = 0;
    let knownCount = 0;
    let isFlipped = false;

    function _render() {
      if (currentIndex >= cards.length) {
        _renderSummary();
        return;
      }
      const card = cards[currentIndex];
      const progressPct = (currentIndex / cards.length) * 100;

      app().innerHTML = `
        <div class="screen active screen-flashcards" id="screen-flashcards">
          <div class="flashcard-header">
            <div class="flashcard-header__back" id="fcBack">←</div>
            <div class="flashcard-header__info">
              <div class="flashcard-header__title">${title}</div>
              <div class="flashcard-header__counter">${currentIndex + 1} / ${cards.length} cards</div>
            </div>
          </div>

          <div class="flashcard-progress">
            <div class="flashcard-progress__fill" style="width:${progressPct}%"></div>
          </div>

          <div class="flashcard-arena">
            <div class="flashcard-scene" id="fcScene">
              <div class="flashcard-inner" id="fcInner">
                <div class="flashcard-face flashcard-face--front">
                  <div class="flashcard-face__marathi">${card.front}</div>
                  <div class="flashcard-face__hint">${card.frontHint || ''}</div>
                </div>
                <div class="flashcard-face flashcard-face--back">
                  <div class="flashcard-face__meaning">${card.back}</div>
                  <div class="flashcard-face__back-hint">${card.backHint || ''}</div>
                </div>
              </div>
            </div>
            <div class="flashcard-tap-hint">Tap card to reveal answer</div>
          </div>

          <div class="flashcard-actions">
            <button class="btn-dont-know" id="fcDontKnow">✕ Don't Know</button>
            <button class="btn-know" id="fcKnow">✓ Know It!</button>
          </div>
        </div>
      `;

      document.getElementById('fcBack').addEventListener('click', onBack);
      document.getElementById('fcScene').addEventListener('click', () => {
        isFlipped = !isFlipped;
        const inner = document.getElementById('fcInner');
        if (inner) inner.classList.toggle('flipped', isFlipped);
      });
      document.getElementById('fcDontKnow').addEventListener('click', () => {
        isFlipped = false;
        currentIndex++;
        _render();
      });
      document.getElementById('fcKnow').addEventListener('click', () => {
        isFlipped = false;
        knownCount++;
        currentIndex++;
        _render();
      });
    }

    function _renderSummary() {
      const pct = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0;
      const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '🌟' : '💪';
      app().innerHTML = `
        <div class="screen active screen-flashcards" id="screen-flashcards">
          <div class="flashcard-header">
            <div class="flashcard-header__back" id="fcBackSummary">←</div>
            <div class="flashcard-header__info">
              <div class="flashcard-header__title">${title}</div>
            </div>
          </div>
          <div class="flashcard-summary">
            <div class="flashcard-summary__emoji">${emoji}</div>
            <div class="flashcard-summary__title">Session Complete!</div>
            <div class="flashcard-summary__score">${knownCount} / ${cards.length} cards known (${pct}%)</div>
            <button class="btn btn-primary" id="fcRetry" style="width:auto;padding:12px 28px">🔄 Practice Again</button>
            <button class="btn btn-secondary" id="fcDone" style="width:auto;padding:12px 28px;margin-top:8px">✓ Done</button>
          </div>
        </div>
      `;
      document.getElementById('fcBackSummary').addEventListener('click', () => onComplete(knownCount));
      document.getElementById('fcDone').addEventListener('click', () => onComplete(knownCount));
      document.getElementById('fcRetry').addEventListener('click', () => {
        currentIndex = 0; knownCount = 0; isFlipped = false;
        _render();
      });
    }

    _render();
  }

  // ============================================================
  // QUIZ SCREEN
  // ============================================================

  /**
   * Render an MCQ quiz screen
   * @param {Array} questions
   * @param {string} title
   * @param {Function} onComplete - Called with score (0-100)
   * @param {Function} onBack
   */
  function renderQuiz(questions, title, onComplete, onBack) {
    _updateNavBar('lessons');
    let currentQ = 0;
    let correct = 0;
    const letters = ['A', 'B', 'C', 'D'];

    function _renderQuestion() {
      if (currentQ >= questions.length) {
        _renderSummary();
        return;
      }
      const q = questions[currentQ];
      const progressPct = (currentQ / questions.length) * 100;

      app().innerHTML = `
        <div class="screen active screen-quiz" id="screen-quiz">
          <div class="quiz-header">
            <div class="quiz-header__back" id="qBack">←</div>
            <div class="quiz-header__info">
              <div class="quiz-header__title">🧠 ${title} — Quiz</div>
              <div class="quiz-header__counter">Question ${currentQ + 1} of ${questions.length}</div>
            </div>
          </div>
          <div class="quiz-progress">
            <div class="quiz-progress__fill" style="width:${progressPct}%"></div>
          </div>
          <div class="quiz-body">
            <div class="quiz-question-card">
              <div class="quiz-question-text">${q.question}</div>
              <div class="quiz-options">
                ${q.options.map((opt, i) => `
                  <button class="quiz-option" data-index="${i}" id="qOpt${i}">
                    <div class="quiz-option__letter">${letters[i]}</div>
                    <span>${opt}</span>
                  </button>
                `).join('')}
              </div>
              <div id="quizExplanation"></div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('qBack').addEventListener('click', onBack);

      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.dataset.index);
          const isCorrect = chosen === q.correctIndex;
          if (isCorrect) correct++;

          // Disable all options
          document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);

          // Mark correct and wrong
          document.getElementById(`qOpt${q.correctIndex}`)?.classList.add('correct');
          if (!isCorrect) document.getElementById(`qOpt${chosen}`)?.classList.add('wrong');

          // Show explanation
          if (q.explanation) {
            document.getElementById('quizExplanation').innerHTML = `
              <div class="quiz-explanation">💡 ${q.explanation}</div>
            `;
          }

          // Auto-advance after 1.5s
          setTimeout(() => {
            currentQ++;
            _renderQuestion();
          }, 1600);
        });
      });
    }

    function _renderSummary() {
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const circumference = 2 * Math.PI * 50;
      const offset = circumference - (score / 100) * circumference;
      const emoji = score >= 80 ? '🏆' : score >= 60 ? '🌟' : '💪';
      const msg = score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good job!' : 'Keep practicing!';

      app().innerHTML = `
        <div class="screen active screen-quiz" id="screen-quiz-summary">
          <div class="quiz-header">
            <div class="quiz-header__back" id="qSummaryBack">←</div>
            <div class="quiz-header__info">
              <div class="quiz-header__title">Quiz Complete!</div>
            </div>
          </div>
          <div class="quiz-summary">
            <div class="quiz-summary__score-ring">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#progressGradient)" stroke-width="10"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
              </svg>
              <div class="quiz-summary__score-value">
                <div class="quiz-summary__score-num">${score}</div>
                <div class="quiz-summary__score-pct">%</div>
              </div>
            </div>
            <div class="quiz-summary__title">${emoji} ${msg}</div>
            <div class="quiz-summary__subtitle">${correct} / ${questions.length} correct</div>
            <button class="btn btn-primary" id="qRetry" style="width:auto;padding:12px 28px">🔄 Try Again</button>
            <button class="btn btn-secondary" id="qDone" style="width:auto;padding:12px 28px;margin-top:8px">✓ Done</button>
          </div>
        </div>
      `;
      document.getElementById('qSummaryBack').addEventListener('click', () => onComplete(score));
      document.getElementById('qDone').addEventListener('click', () => onComplete(score));
      document.getElementById('qRetry').addEventListener('click', () => {
        currentQ = 0; correct = 0;
        _renderQuestion();
      });
    }

    _renderQuestion();
  }

  // ============================================================
  // MODULE TEST SCREEN
  // ============================================================

  /**
   * Render a full module test
   * @param {Object} test - { title, passingScore, questions }
   * @param {string} moduleTitle
   * @param {Function} onComplete - Called with (score, passed)
   * @param {Function} onBack
   */
  function renderModuleTest(test, moduleTitle, onComplete, onBack) {
    _updateNavBar('lessons');
    const questions = test.questions || [];
    let currentQ = 0;
    let correct = 0;
    const letters = ['A', 'B', 'C', 'D'];

    // Show intro first
    function _renderIntro() {
      app().innerHTML = `
        <div class="screen active screen-test" id="screen-test">
          <div class="quiz-header">
            <div class="quiz-header__back" id="testBack">←</div>
            <div class="quiz-header__info">
              <div class="quiz-header__title">${moduleTitle}</div>
            </div>
          </div>
          <div class="test-intro">
            <div class="test-intro__icon">📝</div>
            <div class="test-intro__title">${test.title}</div>
            <div class="test-intro__meta">${questions.length} questions · Multiple choice</div>
            <div class="test-intro__passing">Pass with ${test.passingScore}% or higher</div>
            <button class="btn btn-primary" id="testStart" style="width:auto;padding:14px 36px;margin-top:12px">Start Test →</button>
          </div>
        </div>
      `;
      document.getElementById('testBack').addEventListener('click', onBack);
      document.getElementById('testStart').addEventListener('click', _renderQuestion);
    }

    function _renderQuestion() {
      if (currentQ >= questions.length) {
        _renderResult();
        return;
      }
      const q = questions[currentQ];
      const progressPct = (currentQ / questions.length) * 100;

      app().innerHTML = `
        <div class="screen active screen-test" id="screen-test-q">
          <div class="quiz-header">
            <div class="quiz-header__info" style="flex:1">
              <div class="quiz-header__title">📝 ${test.title}</div>
              <div class="quiz-header__counter">Q${currentQ + 1} of ${questions.length}</div>
            </div>
          </div>
          <div class="quiz-progress">
            <div class="quiz-progress__fill" style="width:${progressPct}%"></div>
          </div>
          <div class="quiz-body">
            <div class="quiz-question-card">
              <div class="quiz-question-text">${q.question}</div>
              <div class="quiz-options">
                ${q.options.map((opt, i) => `
                  <button class="quiz-option" data-index="${i}" id="tOpt${i}">
                    <div class="quiz-option__letter">${letters[i]}</div>
                    <span>${opt}</span>
                  </button>
                `).join('')}
              </div>
              <div id="testExplanation"></div>
            </div>
          </div>
        </div>
      `;

      document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = parseInt(btn.dataset.index);
          const isCorrect = chosen === q.correctIndex;
          if (isCorrect) correct++;

          document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
          document.getElementById(`tOpt${q.correctIndex}`)?.classList.add('correct');
          if (!isCorrect) document.getElementById(`tOpt${chosen}`)?.classList.add('wrong');

          if (q.explanation) {
            document.getElementById('testExplanation').innerHTML = `
              <div class="quiz-explanation">💡 ${q.explanation}</div>
            `;
          }

          setTimeout(() => { currentQ++; _renderQuestion(); }, 1600);
        });
      });
    }

    function _renderResult() {
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= test.passingScore;

      // Call callback
      onComplete(score, passed);

      // Confetti on pass
      if (passed) _spawnConfetti();

      // Result overlay (auto-dismiss after 4s)
      const overlay = document.createElement('div');
      overlay.className = `test-result-overlay ${passed ? 'passed' : 'failed'}`;
      overlay.innerHTML = `
        <div class="test-result__emoji">${passed ? '🎓' : '💪'}</div>
        <div class="test-result__status ${passed ? 'pass' : 'fail'}">${passed ? 'PASSED!' : 'NOT YET'}</div>
        <div class="test-result__score">${score}%  ·  ${correct}/${questions.length} correct</div>
        <div class="test-result__message">${passed
          ? `You passed with ${score}%! Excellent work on ${moduleTitle}.`
          : `You need ${test.passingScore}% to pass. Keep practicing and try again!`
        }</div>
      `;
      document.body.appendChild(overlay);
    }

    _renderIntro();
  }

  // --- Confetti helper ---
  function _spawnConfetti() {
    const colors = ['#0072ff', '#00d2ff', '#43e97b', '#f6d365', '#f5576c', '#c471ed'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const dot = document.createElement('div');
      dot.className = 'confetti-dot';
      dot.style.cssText = [
        `left: ${Math.random() * 100}%`,
        `background: ${colors[Math.floor(Math.random() * colors.length)]}`,
        `animation-duration: ${0.8 + Math.random() * 1.5}s`,
        `animation-delay: ${Math.random() * 0.5}s`,
        `width: ${5 + Math.random() * 8}px`,
        `height: ${5 + Math.random() * 8}px`,
      ].join(';');
      container.appendChild(dot);
    }

    setTimeout(() => container.remove(), 3000);
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
    renderVideos,
    renderDictionary,
    renderFlashcards,
    renderQuiz,
    renderModuleTest,
  };
})();
