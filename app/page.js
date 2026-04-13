"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
];

export default function Home() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const objectUrlRef = useRef(null);

  const revokeAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokeAudioUrl();
  }, [revokeAudioUrl]);

  const generateSpeech = async () => {
    setError("");
    setLoading(true);
    setAudioSrc("");
    revokeAudioUrl();

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

      const { audioBase64, mimeType } = payload;
      if (!audioBase64) {
        setError("No audio returned from the server.");
        return;
      }

      const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([binary], { type: mimeType || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setAudioSrc(url);
    } catch (e) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAudio = () => {
    if (!audioSrc) return;
    const a = document.createElement("a");
    a.href = audioSrc;
    a.download = `sarvam-tts-${language}-${Date.now()}.mp3`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="tts-page">
      <header className="tts-header">
        <h1 className="tts-title">Text to Speech</h1>
        <p className="tts-subtitle">Powered by Sarvam AI · Minimal demo</p>
      </header>

      <main className="tts-card">
        <label className="tts-label" htmlFor="tts-text">
          Text
        </label>
        <textarea
          id="tts-text"
          className="tts-textarea"
          rows={6}
          placeholder="Type or paste text to convert to speech…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        <label className="tts-label" htmlFor="tts-lang">
          Language
        </label>
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

        <div className="tts-actions">
          <button
            type="button"
            className="tts-btn tts-btn-primary"
            onClick={generateSpeech}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <span className="tts-inline">
                <span className="tts-spinner" aria-hidden />
                Generating…
              </span>
            ) : (
              "Generate Speech"
            )}
          </button>
          <button
            type="button"
            className="tts-btn tts-btn-secondary"
            onClick={downloadAudio}
            disabled={!audioSrc || loading}
          >
            Download MP3
          </button>
        </div>

        {error ? (
          <p className="tts-error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="tts-player-section" aria-label="Audio preview">
          <span className="tts-label">Playback</span>
          {audioSrc ? (
            <audio className="tts-audio" controls src={audioSrc} preload="metadata">
              Your browser does not support the audio element.
            </audio>
          ) : (
            <p className="tts-muted">Generated audio will appear here.</p>
          )}
        </section>
      </main>
    </div>
  );
}
