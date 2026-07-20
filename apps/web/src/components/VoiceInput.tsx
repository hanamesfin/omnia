"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Languages, Loader2, Mic, MicOff } from "lucide-react";
import {
  SPEECH_LANGUAGES,
  getStoredSpeechLang,
  isAppleSafari,
  setStoredSpeechLang,
  speechSupported,
} from "@/lib/speech-langs";
import { detectInputLanguage } from "@/lib/detect-input-language";
import {
  isAutoDetectInputLanguage,
  isSpeechLangManualLock,
  setSpeechLangManualLock,
} from "@/lib/input-language-prefs";
import { transcribeAudio } from "@/lib/api";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((c) =>
    MediaRecorder.isTypeSupported(c)
  );
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  onError?: (message: string) => void;
  onLanguageDetected?: (code: string, label: string) => void;
  disabled?: boolean;
  compact?: boolean;
  menuPlacement?: "up" | "down";
};

/**
 * Mic always opens a real audio stream (level meter) so “listening” is visible.
 * SpeechRecognition runs in the same tap when available; otherwise we record → Whisper.
 */
export function VoiceInput({
  value,
  onChange,
  onError,
  onLanguageDetected,
  disabled,
  compact,
  menuPlacement = "up",
}: Props) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [breath, setBreath] = useState(0);
  const [status, setStatus] = useState("");
  const [lang, setLang] = useState("en-US");
  const [autoLang, setAutoLang] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [interim, setInterim] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef(value);
  const interimRef = useRef("");
  const wantRef = useRef(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safariRef = useRef(false);
  const listId = useId();

  const report = (msg: string) => {
    setStatus(msg);
    onError?.(msg);
  };

  useEffect(() => {
    safariRef.current = isAppleSafari();
    setLang(getStoredSpeechLang());
    setAutoLang(isAutoDetectInputLanguage() && !isSpeechLangManualLock());
    const canMic = !!navigator.mediaDevices?.getUserMedia;
    const canSpeech = speechSupported();
    setReady(canMic || canSpeech);
    if (!canMic && !canSpeech) {
      setStatus("Mic unavailable in this browser");
    }
    const onLocale = (e: Event) => {
      const speech = (e as CustomEvent<{ speech?: string }>).detail?.speech;
      if (speech) setLang(speech);
      else setLang(getStoredSpeechLang());
    };
    window.addEventListener("omnia-locale", onLocale);
    const onPrefs = (e: Event) => {
      const d = (e as CustomEvent<{ autoDetect?: boolean; manualLock?: boolean }>).detail;
      if (d?.manualLock !== undefined) {
        setAutoLang(isAutoDetectInputLanguage() && !d.manualLock);
      } else if (d?.autoDetect !== undefined) {
        setAutoLang(d.autoDetect && !isSpeechLangManualLock());
      }
    };
    window.addEventListener("omnia-input-lang-prefs", onPrefs);
    return () => {
      window.removeEventListener("omnia-locale", onLocale);
      window.removeEventListener("omnia-input-lang-prefs", onPrefs);
    };
  }, []);

  // Per-message auto-detect: retarget speech recognition / Whisper from typed text
  useEffect(() => {
    if (!isAutoDetectInputLanguage() || isSpeechLangManualLock()) return;
    const detected = detectInputLanguage(value);
    if (!detected || detected.confidence < 0.4) return;
    setAutoLang(true);
    setLang(detected.speechCode);
    onLanguageDetected?.(detected.speechCode, detected.native);
  }, [value, onLanguageDetected]);

  useEffect(() => {
    if (!active) baseRef.current = value;
  }, [value, active]);

  /** Soft idle pulse while listening; voice level overrides when you speak. */
  useEffect(() => {
    if (!active) {
      setBreath(0);
      return;
    }
    let id = 0;
    const loop = (t: number) => {
      setBreath(0.5 + 0.5 * Math.sin(t / 180));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);

  useEffect(() => {
    if (!langOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [langOpen]);

  useEffect(() => {
    return () => {
      wantRef.current = false;
      teardownAudio();
      try {
        recogRef.current?.abort();
      } catch {
        /* ignore */
      }
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitText = (piece: string) => {
    const cleaned = piece.trim();
    if (!cleaned) return;
    const base = baseRef.current.trimEnd();
    const next = (base ? `${base} ${cleaned}` : cleaned).replace(/\s+/g, " ");
    baseRef.current = next;
    onChange(next);
  };

  const paintLive = (text: string) => {
    interimRef.current = text;
    setInterim(text);
    const base = baseRef.current.trimEnd();
    onChange(text ? (base ? `${base} ${text}` : text) : base);
  };

  const flushInterim = () => {
    const pending = interimRef.current.trim();
    interimRef.current = "";
    setInterim("");
    if (!pending) return;
    const base = baseRef.current.trimEnd();
    baseRef.current = (base ? `${base} ${pending}` : pending).replace(/\s+/g, " ");
    onChange(baseRef.current);
  };

  const teardownAudio = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
    } catch {
      /* ignore */
    }
    mediaRecRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    setLevel(0);
  };

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 4));
        rafRef.current = requestAnimationFrame(tick);
      };
      void ctx.resume();
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* meter optional */
    }
  };

  const attachRecognition = (): boolean => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return false;
    const recog = new Ctor();
    recogRef.current = recog;
    recog.lang = lang;
    recog.continuous = !safariRef.current;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      setActive(true);
      setStatus("Listening — speak now");
    };

    recog.onresult = (ev) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finalChunk += piece;
        else interimChunk += piece;
      }
      if (finalChunk.trim()) {
        interimRef.current = "";
        setInterim("");
        commitText(finalChunk);
      } else if (interimChunk.trim()) {
        paintLive(interimChunk.trim());
      }
    };

    recog.onerror = (ev) => {
      if (ev.error === "aborted" || ev.error === "no-speech") return;
      if (ev.error === "not-allowed") {
        wantRef.current = false;
        report("Microphone blocked — Safari → Settings for This Website → Microphone: Allow");
        stopAll();
        return;
      }
      if (ev.error === "network" || ev.error === "service-not-allowed") {
        // Keep the mic stream / recorder running; dictation engines can fail on Safari.
        setStatus("Dictation engine busy — keep talking, then tap mic to finish");
        return;
      }
      setStatus(`Voice: ${ev.error}`);
    };

    recog.onend = () => {
      flushInterim();
      if (!wantRef.current) {
        setActive(false);
        return;
      }
      // Safari dies after one utterance — restart a fresh instance
      restartTimerRef.current = setTimeout(() => {
        if (!wantRef.current) return;
        try {
          attachRecognition();
          recogRef.current?.start();
        } catch {
          /* recorder path still running */
        }
      }, safariRef.current ? 300 : 150);
    };

    return true;
  };

  const startRecorder = (stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") return;
    try {
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(200);
    } catch {
      /* optional backup */
    }
  };

  const stopAll = () => {
    wantRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    flushInterim();
    teardownAudio();
    setActive(false);
    setStatus("");
  };

  const finishWithRecording = async () => {
    const startedValue = value;
    const rec = mediaRecRef.current;
    const mime = rec?.mimeType || pickRecorderMime() || "audio/webm";

    wantRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    flushInterim();

    const stopRec = () =>
      new Promise<Blob | null>((resolve) => {
        if (!rec || rec.state === "inactive") {
          resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null);
          return;
        }
        rec.onstop = () => {
          resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: mime }) : null);
        };
        try {
          rec.stop();
        } catch {
          resolve(null);
        }
      });

    const blob = await stopRec();
    teardownAudio();
    setActive(false);

    // Live dictation already wrote into the field
    if (baseRef.current.trim() && baseRef.current.trim() !== startedValue.trim()) {
      setStatus("");
      setBusy(false);
      return;
    }

    if (!blob || blob.size < 600) {
      report("No speech captured — allow the mic, then tap and speak.");
      return;
    }

    setBusy(true);
    setStatus("Transcribing…");
    try {
      const ext = mime.includes("mp4") || mime.includes("aac") ? "m4a" : "webm";
      const file = new File([blob], `voice.${ext}`, { type: mime });
      const { text } = await transcribeAudio(file, lang);
      if (text?.trim()) {
        baseRef.current = startedValue;
        commitText(text);
        setStatus("");
      } else {
        report("No words detected — try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      if (/unavailable|not configured|Whisper|OPENAI/i.test(msg)) {
        report("Allow mic + use Live dictation (red “Listening” under the icon). Or set OPENAI_API_KEY.");
      } else {
        report(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const startAll = async () => {
    if (disabled || busy || !ready) return;
    if (typeof window !== "undefined" && !window.isSecureContext) {
      report("Voice needs http://localhost (or HTTPS).");
      return;
    }

    baseRef.current = value;
    interimRef.current = "";
    setInterim("");
    wantRef.current = true;
    setActive(true);
    setStatus("Listening — speak now");

    // Start SpeechRecognition SYNCHRONOUSLY in the tap (required for Safari).
    const hasSpeech = attachRecognition();
    if (hasSpeech) {
      try {
        recogRef.current!.start();
      } catch (e) {
        console.warn("speech start", e);
        report("Could not start dictation — tap the mic again.");
        wantRef.current = false;
        setActive(false);
        return;
      }
    }

    // Safari: do NOT also call getUserMedia — it steals the mic from SpeechRecognition.
    if (safariRef.current && hasSpeech) {
      return;
    }

    // Chrome / no speech engine: open stream for level meter + backup recording
    if (!navigator.mediaDevices?.getUserMedia) {
      if (!hasSpeech) {
        wantRef.current = false;
        setActive(false);
        report("This browser cannot access the microphone.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!wantRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      startLevelMeter(stream);
      startRecorder(stream);
      setStatus(hasSpeech ? "Listening — speak now" : "Recording — tap mic when done");
    } catch {
      if (!hasSpeech) {
        wantRef.current = false;
        setActive(false);
        report("Microphone blocked — allow access for this site, then try again.");
      }
    }
  };

  const onMicClick = () => {
    if (busy) return;
    if (active) {
      void finishWithRecording();
    } else {
      void startAll();
    }
  };

  if (!ready && status.includes("unavailable")) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl text-muted/40"
        aria-label="Voice input unavailable"
        title={status}
      >
        <MicOff size={18} />
      </button>
    );
  }

  const current = SPEECH_LANGUAGES.find((l) => l.code === lang) || SPEECH_LANGUAGES[0];
  // Voice amplitude wins; when quiet, gentle breath so it still “listens”
  const intensity = active ? Math.min(1, Math.max(level * 1.35, 0.22 + breath * 0.28)) : 0;
  const micScale = busy ? 1 : 1 + intensity * 0.9;

  return (
    <div className="relative flex flex-col items-start gap-1" ref={rootRef}>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label={active ? "Stop microphone" : "Start microphone"}
          aria-pressed={active}
          disabled={disabled || busy || !ready}
          onClick={onMicClick}
          className={`relative inline-flex min-h-tap min-w-tap items-center justify-center rounded-2xl disabled:opacity-50 ${
            active
              ? "bg-alive/15 text-alive ring-2 ring-alive/40"
              : "text-muted transition hover:bg-surface hover:text-alive"
          }`}
          title={active ? "Tap to stop" : "Tap to talk"}
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <span
              aria-hidden
              className="inline-flex origin-center will-change-transform"
              style={{
                transform: `scale(${micScale})`,
                transition: level > 0.04 ? "transform 55ms linear" : "transform 120ms ease-out",
              }}
            >
              <Mic size={18} strokeWidth={active ? 2.4 : 2} />
            </span>
          )}
        </button>

        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={langOpen}
          aria-controls={listId}
          disabled={disabled || active || busy}
          onClick={() => setLangOpen((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-2xl px-1.5 text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50 ${
            compact ? "min-h-9" : "min-h-tap"
          }`}
          title={
            autoLang
              ? `Auto-detected speech: ${current.label}`
              : `Speech language: ${current.label}`
          }
        >
          <Languages size={14} aria-hidden />
          {!compact && (
            <span className="hidden max-w-[5.5rem] truncate text-[10px] font-medium uppercase tracking-wide sm:inline">
              {autoLang ? `auto·${lang.split("-")[0]}` : lang.split("-")[0]}
            </span>
          )}
          <ChevronDown size={12} aria-hidden />
        </button>
      </div>

      {(active || busy || status) && (
        <p
          className={`max-w-[16rem] text-[11px] leading-snug ${
            active || busy ? "text-danger" : "text-muted"
          }`}
          role="status"
        >
          {busy ? "Transcribing…" : interim ? `${interim}…` : status || "Listening…"}
        </p>
      )}

      {langOpen && (
        <div
          id={listId}
          role="listbox"
          aria-label="Speech language"
          className={`absolute z-50 max-h-64 w-64 overflow-y-auto rounded-2xl border border-border bg-surface-elevated p-1.5 shadow-2xl ${
            menuPlacement === "down"
              ? "left-0 top-[calc(100%+0.4rem)]"
              : "bottom-[calc(100%+0.4rem)] left-0"
          }`}
        >
          <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
            Voice language
          </p>
          <button
            type="button"
            role="option"
            aria-selected={autoLang}
            onClick={() => {
              setSpeechLangManualLock(false);
              setAutoLang(true);
              const detected = detectInputLanguage(value);
              if (detected) {
                setLang(detected.speechCode);
                setStoredSpeechLang(detected.speechCode);
              }
              setLangOpen(false);
            }}
            className={`mb-1 flex w-full flex-col rounded-xl px-2.5 py-2 text-left text-sm transition ${
              autoLang ? "bg-alive/12 text-alive" : "hover:bg-surface"
            }`}
          >
            <span className="font-medium">Auto-detect</span>
            <span className="text-[11px] text-muted">Sense language per message</span>
          </button>
          {SPEECH_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              onClick={() => {
                setLang(l.code);
                setStoredSpeechLang(l.code);
                setSpeechLangManualLock(true);
                setAutoLang(false);
                setLangOpen(false);
              }}
              className={`flex w-full flex-col rounded-xl px-2.5 py-2 text-left text-sm transition ${
                l.code === lang ? "bg-alive/12 text-alive" : "hover:bg-surface"
              }`}
            >
              <span className="font-medium">{l.native}</span>
              <span className="text-[11px] text-muted">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
