// ============================================================
// बोला मराठी — Audio Engine
// TTS playback (Marathi) + Speech Recognition + Recording
// ============================================================

const AudioEngine = (() => {
  let _recognition = null;
  let _mediaRecorder = null;
  let _audioChunks = [];
  let _isRecording = false;
  let _recordingTimer = null;
  let _recordingStartTime = 0;
  let _onTimerUpdate = null;
  let _analyser = null;
  let _audioContext = null;
  let _stream = null;

  const MAX_RECORD_SECONDS = 15;

  // --- TTS (Text-to-Speech) ---

  /**
   * Speak Marathi text aloud using browser TTS
   * @param {string} text - Marathi text in Devanagari
   * @param {string} speed - 'slow' | 'normal' | 'fast'
   * @returns {Promise<void>}
   */
  function speak(text, speed = 'normal') {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'mr-IN';

      // Set speed
      const rates = { slow: 0.6, normal: 0.9, fast: 1.2 };
      utterance.rate = rates[speed] || 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to find a Marathi voice
      const voices = window.speechSynthesis.getVoices();
      const marathiVoice = voices.find(v => v.lang === 'mr-IN' || v.lang.startsWith('mr'));
      if (marathiVoice) {
        utterance.voice = marathiVoice;
      }

      utterance.onend = resolve;
      utterance.onerror = (e) => {
        // Don't reject on 'interrupted' errors (happens when we cancel)
        if (e.error === 'interrupted') resolve();
        else reject(e);
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop any ongoing speech
   */
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if Marathi TTS is available
   */
  function isTTSAvailable() {
    if (!('speechSynthesis' in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.some(v => v.lang === 'mr-IN' || v.lang.startsWith('mr')) || voices.length > 0;
  }

  /**
   * Preload voices (needed on some browsers)
   */
  function preloadVoices() {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
      // Timeout fallback
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000);
    });
  }

  // --- Speech Recognition ---

  /**
   * Check if Web Speech Recognition is available for Marathi
   */
  function isRecognitionAvailable() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Start recording user's speech
   * @param {Function} onTimerTick - Callback with elapsed seconds
   * @returns {Promise<{ transcription: string, audioBlob: Blob|null }>}
   */
  function startRecording(onTimerTick) {
    return new Promise(async (resolve, reject) => {
      if (_isRecording) {
        reject(new Error('Already recording'));
        return;
      }

      _isRecording = true;
      _onTimerUpdate = onTimerTick;
      _audioChunks = [];

      let transcription = '';
      let recognitionEnded = false;
      let recorderReady = false;

      // Strategy 1: Try Web Speech API for transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        _recognition = new SpeechRecognition();
        _recognition.lang = 'mr-IN';
        _recognition.continuous = false;
        _recognition.interimResults = false;
        _recognition.maxAlternatives = 1;

        _recognition.onresult = (event) => {
          transcription = event.results[0][0].transcript;
        };

        _recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
          // Don't reject — we can still use the audio blob for AI feedback
        };

        _recognition.onend = () => {
          recognitionEnded = true;
        };

        try {
          _recognition.start();
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      }

      // Strategy 2: Also record raw audio via MediaRecorder (for AI fallback)
      try {
        _stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Set up audio analyser for waveform visualization
        _audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = _audioContext.createMediaStreamSource(_stream);
        _analyser = _audioContext.createAnalyser();
        _analyser.fftSize = 256;
        source.connect(_analyser);

        _mediaRecorder = new MediaRecorder(_stream, {
          mimeType: _getSupportedMimeType(),
        });

        _mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            _audioChunks.push(event.data);
          }
        };

        _mediaRecorder.onstop = () => {
          const audioBlob = new Blob(_audioChunks, { type: _mediaRecorder.mimeType });
          _cleanup();
          resolve({ transcription, audioBlob });
        };

        _mediaRecorder.start();
        recorderReady = true;
      } catch (e) {
        console.warn('MediaRecorder failed:', e);
        // If we can't record, still try to get transcription from SpeechRecognition
        if (_recognition) {
          _recognition.onend = () => {
            _cleanup();
            resolve({ transcription, audioBlob: null });
          };
        } else {
          _cleanup();
          reject(new Error('No recording method available. Please allow microphone access.'));
          return;
        }
      }

      // Start timer
      _recordingStartTime = Date.now();
      _recordingTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - _recordingStartTime) / 1000);
        if (_onTimerUpdate) _onTimerUpdate(elapsed);

        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 200);
    });
  }

  /**
   * Stop recording
   */
  function stopRecording() {
    if (!_isRecording) return;

    if (_recognition) {
      try { _recognition.stop(); } catch (e) { /* ignore */ }
    }

    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
      try { _mediaRecorder.stop(); } catch (e) { /* ignore */ }
    }

    if (_recordingTimer) {
      clearInterval(_recordingTimer);
      _recordingTimer = null;
    }

    _isRecording = false;
  }

  /**
   * Get audio levels for waveform visualization
   * @returns {Uint8Array|null}
   */
  function getAudioLevels() {
    if (!_analyser) return null;
    const dataArray = new Uint8Array(_analyser.frequencyBinCount);
    _analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Check if currently recording
   */
  function isRecording() {
    return _isRecording;
  }

  // --- Internal Helpers ---

  function _cleanup() {
    _isRecording = false;

    if (_recordingTimer) {
      clearInterval(_recordingTimer);
      _recordingTimer = null;
    }

    if (_stream) {
      _stream.getTracks().forEach(t => t.stop());
      _stream = null;
    }

    if (_audioContext && _audioContext.state !== 'closed') {
      _audioContext.close().catch(() => {});
      _audioContext = null;
    }

    _analyser = null;
    _recognition = null;
    _mediaRecorder = null;
    _audioChunks = [];
  }

  function _getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm'; // fallback
  }

  /**
   * Convert audio blob to base64 for API transmission
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return {
    speak,
    stopSpeaking,
    isTTSAvailable,
    preloadVoices,
    isRecognitionAvailable,
    startRecording,
    stopRecording,
    getAudioLevels,
    isRecording,
    blobToBase64,
  };
})();
