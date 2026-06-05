"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India) - हिन्दी" },
  { value: "bn-IN", label: "Bengali (India) - বাংলা" },
  { value: "ta-IN", label: "Tamil (India) - தமிழ்" },
  { value: "te-IN", label: "Telugu (India) - తెలుగు" },
  { value: "kn-IN", label: "Kannada (India) - ಕನ್ನಡ" },
  { value: "ml-IN", label: "Malayalam (India) - മലയാളം" },
  { value: "mr-IN", label: "Marathi (India) - मराठी" },
  { value: "gu-IN", label: "Gujarati (India) - ગુજરાતી" },
  { value: "pa-IN", label: "Punjabi (India) - ਪੰਜਾਬੀ" },
  { value: "od-IN", label: "Odia (India) - ଓଡ଼ିଆ" },
];

export default function Home() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("hi-IN"); // Default to Hindi to showcase translation
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  
  const [originalAudioSrc, setOriginalAudioSrc] = useState("");
  const [translatedAudioSrc, setTranslatedAudioSrc] = useState("");
  const [translatedText, setTranslatedText] = useState("");

  const originalUrlRef = useRef(null);
  const translatedUrlRef = useRef(null);

  const revokeAudioUrls = useCallback(() => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    if (translatedUrlRef.current) {
      URL.revokeObjectURL(translatedUrlRef.current);
      translatedUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokeAudioUrls();
  }, [revokeAudioUrls]);

  const generateSpeech = async () => {
    if (!text.trim()) return;
    setError("");
    setLoading(true);
    setLoadingStep("Processing translation & generating audio...");
    setOriginalAudioSrc("");
    setTranslatedAudioSrc("");
    setTranslatedText("");
    revokeAudioUrls();

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload?.error ?? `Request failed (${res.status}).`);
        return;
      }

      const { originalAudio, translatedAudio, translatedText: returnedTranslation, mimeType } = payload;

      if (originalAudio) {
        const binary = Uint8Array.from(atob(originalAudio), (c) => c.charCodeAt(0));
        const blob = new Blob([binary], { type: mimeType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        originalUrlRef.current = url;
        setOriginalAudioSrc(url);
      }

      if (translatedAudio) {
        const binary = Uint8Array.from(atob(translatedAudio), (c) => c.charCodeAt(0));
        const blob = new Blob([binary], { type: mimeType || "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        translatedUrlRef.current = url;
        setTranslatedAudioSrc(url);
      }

      if (returnedTranslation) {
        setTranslatedText(returnedTranslation);
      }
    } catch (e) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const downloadAudio = (src, isOriginal) => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    const langLabel = isOriginal ? "English" : (LANGUAGES.find((opt) => opt.value === language)?.label.split(" ")[0] || language);
    a.download = `vykhya-${langLabel}-${Date.now()}.mp3`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const currentLangLabel = LANGUAGES.find((opt) => opt.value === language)?.label || language;

  return (
    <div className="tts-page">
      <header className="tts-header">
        <div className="logo-container">
          <span className="logo-badge">Indian Speech Agent</span>
        </div>
        <h1 className="tts-title">Vykhya AI</h1>
        <p className="tts-subtitle">Translate text & synthesize voice in Indian Languages</p>
      </header>

      <main className="tts-container">
        {/* Input Card */}
        <section className="tts-card input-card" aria-label="Input Settings">
          <div className="form-group">
            <label className="tts-label" htmlFor="tts-text">
              Enter English Text <span className="char-count">({text.length}/2000)</span>
            </label>
            <textarea
              id="tts-text"
              className="tts-textarea"
              rows={5}
              maxLength={2000}
              placeholder="Type your message in English to translate and hear in Indian languages..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="tts-label" htmlFor="tts-lang">
                Target Language
              </label>
              <div className="select-wrapper">
                <select
                  id="tts-lang"
                  className="tts-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                >
                  {LANGUAGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tts-actions flex-end">
              <button
                type="button"
                id="btn-generate"
                className="tts-btn tts-btn-primary"
                onClick={generateSpeech}
                disabled={loading || !text.trim()}
              >
                {loading ? (
                  <span className="tts-inline">
                    <span className="tts-spinner" aria-hidden />
                    {loadingStep || "Processing…"}
                  </span>
                ) : (
                  "Translate & Speak"
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="tts-error" role="alert">
              <svg className="error-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        {/* Output Area - Dual Columns when translated */}
        {(originalAudioSrc || translatedAudioSrc || translatedText) && (
          <section className="results-section" aria-label="Generated speech outputs">
            <h2 className="section-title">Your Audio Outputs</h2>
            
            <div className="results-grid">
              {/* Original Column (only show if originalAudio exists, or always if language is en-IN) */}
              {(language === "en-IN" || originalAudioSrc) && (
                <div className="result-card original-card">
                  <div className="card-header">
                    <span className="lang-tag">English (India)</span>
                    {originalAudioSrc && (
                      <button
                        type="button"
                        id="btn-download-en"
                        className="btn-icon-text"
                        onClick={() => downloadAudio(originalAudioSrc, true)}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                        </svg>
                        Download
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <p className="source-text-display">"{text}"</p>
                  </div>
                  <div className="card-footer">
                    {originalAudioSrc ? (
                      <audio className="tts-audio" controls src={originalAudioSrc} preload="metadata">
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="tts-muted">Generating English speech...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Translation Column (only if not English) */}
              {language !== "en-IN" && (
                <div className="result-card translated-card">
                  <div className="card-header">
                    <span className="lang-tag accent-tag">{currentLangLabel.split(" - ")[1] || currentLangLabel.split(" (")[0]}</span>
                    {translatedAudioSrc && (
                      <button
                        type="button"
                        id="btn-download-tr"
                        className="btn-icon-text accent-btn"
                        onClick={() => downloadAudio(translatedAudioSrc, false)}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                        </svg>
                        Download
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    {translatedText ? (
                      <p className="translated-text-display font-indic">"{translatedText}"</p>
                    ) : (
                      <div className="translation-skeleton">
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line short"></div>
                      </div>
                    )}
                  </div>
                  <div className="card-footer">
                    {translatedAudioSrc ? (
                      <audio className="tts-audio" controls src={translatedAudioSrc} preload="metadata" autoPlay>
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="tts-muted">Generating translated speech...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

