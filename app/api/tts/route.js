const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate";

const ALLOWED_LANGUAGES = new Set([
  "en-IN",
  "hi-IN",
  "bn-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "gu-IN",
  "pa-IN",
  "od-IN"
]);

function sarvamHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "api-subscription-key": apiKey,
  };
}

async function translateText(apiKey, text, targetLanguage) {
  const response = await fetch(SARVAM_TRANSLATE_URL, {
    method: "POST",
    headers: sarvamHeaders(apiKey),
    body: JSON.stringify({
      input: text,
      source_language_code: "auto",
      target_language_code: targetLanguage,
      model: "mayura:v1",
    }),
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Invalid JSON from translation API");
  }

  if (!response.ok) {
    const msg = data?.error?.message ?? data?.message ?? `Translation API returned status ${response.status}`;
    throw new Error(msg);
  }

  if (!data?.translated_text) {
    throw new Error("Translation API did not return translated text");
  }

  return data.translated_text;
}

async function textToSpeech(apiKey, text, languageCode) {
  const response = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: sarvamHeaders(apiKey),
    body: JSON.stringify({
      text: text,
      target_language_code: languageCode,
      model: "bulbul:v3",
      output_audio_codec: "mp3",
    }),
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Invalid JSON from TTS API");
  }

  if (!response.ok) {
    const msg = data?.error?.message ?? data?.message ?? `TTS API returned status ${response.status}`;
    throw new Error(msg);
  }

  const audioBase64 = data?.audios?.[0];
  if (typeof audioBase64 !== "string" || !audioBase64.length) {
    throw new Error(`TTS API did not return audio data for language ${languageCode}`);
  }

  return audioBase64;
}

export async function POST(request) {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Server is not configured with SARVAM_API_KEY." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, language } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Field `text` is required." }, { status: 400 });
  }

  if (typeof language !== "string" || !ALLOWED_LANGUAGES.has(language)) {
    return Response.json(
      {
        error: "Invalid or unsupported target language.",
      },
      { status: 400 }
    );
  }

  try {
    // Case 1: Target language is English (No translation needed)
    if (language === "en-IN") {
      const originalAudio = await textToSpeech(apiKey, text.trim(), "en-IN");
      return Response.json({
        mimeType: "audio/mpeg",
        originalAudio,
        translatedAudio: null,
        translatedText: null,
      });
    }

    // Case 2: Target language is different (e.g. hi-IN).
    // Perform translation and English TTS in parallel
    const [originalAudio, translatedText] = await Promise.all([
      textToSpeech(apiKey, text.trim(), "en-IN").catch((err) => {
        console.error("English TTS failed: ", err);
        return null; // Don't crash the whole request if English TTS fails
      }),
      translateText(apiKey, text.trim(), language)
    ]);

    // Perform TTS on the translated text
    const translatedAudio = await textToSpeech(apiKey, translatedText.trim(), language);

    return Response.json({
      mimeType: "audio/mpeg",
      originalAudio,
      translatedAudio,
      translatedText,
    });

  } catch (err) {
    console.error("Process failed:", err);
    return Response.json(
      { error: err?.message ?? "Failed to translate or generate speech." },
      { status: 502 }
    );
  }
}

