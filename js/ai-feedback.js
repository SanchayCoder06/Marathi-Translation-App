// ============================================================
// बोला मराठी — AI Feedback Engine
// Uses Gemini API for pronunciation assessment
// ============================================================

const AIFeedback = (() => {
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  /**
   * Assess user's pronunciation against the expected phrase
   * @param {Object} params
   * @param {string} params.expectedMarathi - The target Marathi phrase
   * @param {string} params.expectedTransliteration - Transliteration of the target
   * @param {string} params.expectedEnglish - English meaning
   * @param {string} params.userTranscription - What the user actually said (from STT)
   * @param {Blob|null} params.audioBlob - Raw audio recording (for enhanced analysis)
   * @param {string} params.apiKey - Gemini API key
   * @returns {Promise<FeedbackResult>}
   */
  async function assess(params) {
    const { expectedMarathi, expectedTransliteration, expectedEnglish, userTranscription, audioBlob, apiKey } = params;

    if (!apiKey) {
      return _fallbackScoring(expectedMarathi, userTranscription);
    }

    try {
      const prompt = _buildPrompt(expectedMarathi, expectedTransliteration, expectedEnglish, userTranscription);
      
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      };

      // If we have audio, add it as inline data for multimodal analysis
      if (audioBlob) {
        try {
          const base64Audio = await AudioEngine.blobToBase64(audioBlob);
          const mimeType = audioBlob.type || 'audio/webm';
          requestBody.contents[0].parts.unshift({
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            }
          });
          // Update prompt to mention audio
          requestBody.contents[0].parts[1].text = _buildPromptWithAudio(
            expectedMarathi, expectedTransliteration, expectedEnglish, userTranscription
          );
        } catch (audioErr) {
          console.warn('Could not include audio in API call:', audioErr);
        }
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', response.status, errData);
        return _fallbackScoring(expectedMarathi, userTranscription);
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resultText) {
        return _fallbackScoring(expectedMarathi, userTranscription);
      }

      return _parseResponse(resultText, expectedMarathi);
    } catch (err) {
      console.error('AI Feedback error:', err);
      return _fallbackScoring(expectedMarathi, userTranscription);
    }
  }

  /**
   * Build prompt for text-only analysis
   */
  function _buildPrompt(expectedMarathi, transliteration, english, userTranscription) {
    return `You are an expert Marathi language pronunciation coach helping English-speaking learners.

TASK: Assess the learner's spoken Marathi by comparing their transcription to the expected phrase.

EXPECTED PHRASE:
- Marathi (Devanagari): ${expectedMarathi}
- Transliteration: ${transliteration}  
- English meaning: ${english}

LEARNER'S TRANSCRIPTION: ${userTranscription || '(no transcription available)'}

RESPOND with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "accuracy": "<excellent|good|fair|poor>",
  "feedback": "<1-2 sentence constructive feedback in English>",
  "word_scores": [
    {
      "word": "<Marathi word>",
      "transliteration": "<transliteration>",
      "score": <number 0-100>,
      "tip": "<short pronunciation tip or null if good>"
    }
  ],
  "encouragement": "<short motivational message with emoji>"
}

SCORING GUIDE:
- 90-100 (excellent): Near-perfect match, all words clear
- 70-89 (good): Most words correct, minor issues
- 50-69 (fair): Several errors but understandable
- 0-49 (poor): Significant difficulties, needs more practice

IMPORTANT:
- If no transcription is available, give a score of 50 with encouraging feedback to try again
- Focus on common English-speaker mistakes with Marathi sounds (retroflex consonants, nasalization, aspirated vs unaspirated)
- Be encouraging and constructive, never discouraging
- Keep tips practical and specific (e.g., "Touch your tongue to the roof of your mouth for ट")`;
  }

  /**
   * Build prompt when audio is available
   */
  function _buildPromptWithAudio(expectedMarathi, transliteration, english, userTranscription) {
    return `You are an expert Marathi language pronunciation coach helping English-speaking learners.

TASK: Listen to the attached audio recording and assess the learner's Marathi pronunciation against the expected phrase.

EXPECTED PHRASE:
- Marathi (Devanagari): ${expectedMarathi}
- Transliteration: ${transliteration}
- English meaning: ${english}
${userTranscription ? `\nAUTO-TRANSCRIPTION (may be imperfect): ${userTranscription}` : ''}

INSTRUCTIONS:
1. Listen carefully to the audio
2. Compare pronunciation, rhythm, and clarity to native Marathi
3. Identify specific sounds the learner got right or wrong

RESPOND with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "accuracy": "<excellent|good|fair|poor>",
  "feedback": "<1-2 sentence constructive feedback in English>",
  "word_scores": [
    {
      "word": "<Marathi word>",
      "transliteration": "<transliteration>",
      "score": <number 0-100>,
      "tip": "<short pronunciation tip or null if good>"
    }
  ],
  "encouragement": "<short motivational message with emoji>"
}

SCORING GUIDE:
- 90-100 (excellent): Clear pronunciation, good rhythm, easily understood
- 70-89 (good): Mostly clear, minor accent issues
- 50-69 (fair): Understandable with effort, noticeable errors
- 0-49 (poor): Difficult to understand, needs significant practice

Be encouraging and constructive. Focus on actionable tips.`;
  }

  /**
   * Parse API response
   */
  function _parseResponse(text, expectedMarathi) {
    try {
      // Try to parse the JSON directly
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          // Try to find JSON object in the text
          const objMatch = text.match(/\{[\s\S]*\}/);
          if (objMatch) {
            parsed = JSON.parse(objMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        }
      }

      // Validate and normalize
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        accuracy: ['excellent', 'good', 'fair', 'poor'].includes(parsed.accuracy) ? parsed.accuracy : _scoreToAccuracy(parsed.score),
        feedback: parsed.feedback || 'Good attempt! Keep practicing.',
        wordScores: Array.isArray(parsed.word_scores) ? parsed.word_scores.map(w => ({
          word: w.word || '',
          transliteration: w.transliteration || '',
          score: Math.max(0, Math.min(100, w.score || 50)),
          tip: w.tip || null,
        })) : [],
        encouragement: parsed.encouragement || 'Keep going! 🎉',
      };
    } catch (e) {
      console.warn('Failed to parse AI response:', e);
      return _fallbackScoring(expectedMarathi, '');
    }
  }

  /**
   * Fallback scoring when API is unavailable
   * Does simple text comparison
   */
  function _fallbackScoring(expected, spoken) {
    if (!spoken || spoken.trim() === '') {
      return {
        score: 0,
        accuracy: 'poor',
        feedback: 'No speech was detected. Please try speaking louder and closer to your microphone.',
        wordScores: [],
        encouragement: 'Don\'t worry, try again! 🎤',
      };
    }

    // Simple similarity calculation
    const expectedNorm = _normalize(expected);
    const spokenNorm = _normalize(spoken);

    let score;
    if (expectedNorm === spokenNorm) {
      score = 95;
    } else {
      const similarity = _levenshteinSimilarity(expectedNorm, spokenNorm);
      score = Math.round(similarity * 100);
    }

    const accuracy = _scoreToAccuracy(score);

    const feedbackMessages = {
      excellent: 'Excellent pronunciation! You sound very natural.',
      good: 'Good job! Your pronunciation is coming along well.',
      fair: 'Not bad! Focus on the sounds you find tricky.',
      poor: 'Keep practicing! Try listening to the phrase again slowly.',
    };

    return {
      score,
      accuracy,
      feedback: feedbackMessages[accuracy],
      wordScores: [],
      encouragement: score >= 70 ? 'Great progress! 🌟' : 'Every attempt makes you better! 💪',
    };
  }

  function _scoreToAccuracy(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  function _normalize(text) {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Levenshtein-based similarity (0-1)
   */
  function _levenshteinSimilarity(a, b) {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;

    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[a.length][b.length];
    return 1 - (distance / maxLen);
  }

  async function translate(text, direction, apiKey) {
    if (!apiKey) {
      throw new Error('API key required for translation. Please configure it in Settings.');
    }

    const directionLabels = {
      'en_to_mr': { from: 'English', to: 'Marathi (Devanagari)' },
      'mr_to_en': { from: 'Marathi (Devanagari)', to: 'English' },
      'hi_to_mr': { from: 'Hindi', to: 'Marathi (Devanagari)' },
      'mr_to_hi': { from: 'Marathi (Devanagari)', to: 'Hindi' }
    };

    const dir = directionLabels[direction] || directionLabels['en_to_mr'];

    const prompt = `You are a professional translator specializing in Marathi, Hindi, and English.
    
TASK: Translate the following text from ${dir.from} to ${dir.to}.

TEXT TO TRANSLATE:
"${text}"

INSTRUCTIONS:
1. Provide a natural, culturally appropriate conversational translation.
2. If the target language is Marathi, provide a phonetic transliteration in English (Latin script) that helps a non-native speaker pronounce it.
3. Respond ONLY with valid JSON in this exact format:
{
  "translatedText": "<translated text>",
  "transliteration": "<phonetic pronunciation guide, or empty string if target is not Marathi>"
}`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with Gemini API');
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) {
        throw new Error('Empty response from AI translator');
      }

      // Try to parse the text directly or clean markdown
      let parsedText = resultText.trim();
      if (parsedText.startsWith('```')) {
        const jsonMatch = parsedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) parsedText = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(parsedText);
      return {
        translatedText: parsed.translatedText || '',
        transliteration: parsed.transliteration || ''
      };
    } catch (err) {
      console.error('Translation API error:', err);
      throw err;
    }
  }

  async function lookupWord(word, apiKey) {
    if (!apiKey) {
      throw new Error('API key required for online lookup. Please configure it in Settings.');
    }

    const prompt = `You are a professional Marathi-English-Hindi dictionary. Provide the translation, part of speech, transliteration, meanings, and a contextual example sentence for the searched word.
    
    SEARCH WORD: "${word}"
    
    INSTRUCTIONS:
    1. If the searched word is in English or Hindi, translate it to Marathi and then provide the dictionary information for that Marathi word.
    2. If the word is in Marathi, provide details directly.
    3. Respond ONLY with valid JSON in this exact format:
    {
      "word": "<Marathi word in Devanagari>",
      "transliteration": "<Latin phonetic pronunciation guide, e.g. namaskar>",
      "partOfSpeech": "<Noun / Verb / Adjective / Adverb / Phrase / Greeting>",
      "englishMeaning": "<Clear English definition/translation>",
      "hindiMeaning": "<Clear Hindi definition/translation in Devanagari>",
      "exampleMarathi": "<A natural, simple example sentence in Marathi Devanagari using this word>",
      "exampleEnglish": "<English translation of the example sentence>",
      "exampleHindi": "<Hindi translation of the example sentence in Devanagari>"
    }`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with Gemini API');
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) {
        throw new Error('Empty response from AI dictionary');
      }

      let parsedText = resultText.trim();
      if (parsedText.startsWith('```')) {
        const jsonMatch = parsedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) parsedText = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(parsedText);
      return {
        word: parsed.word || word,
        transliteration: parsed.transliteration || '',
        partOfSpeech: parsed.partOfSpeech || 'Word',
        englishMeaning: parsed.englishMeaning || '',
        hindiMeaning: parsed.hindiMeaning || '',
        exampleMarathi: parsed.exampleMarathi || '',
        exampleEnglish: parsed.exampleEnglish || '',
        exampleHindi: parsed.exampleHindi || ''
      };
    } catch (err) {
      console.error('Dictionary API error:', err);
      throw err;
    }
  }

  return {
    assess,
    translate,
    lookupWord,
  };
})();
