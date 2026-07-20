/**
 * Deterministic input-language detection — no external models.
 * Uses Unicode script ranges + light keyword hints for Latin scripts.
 */
import type { LocaleId } from "@/lib/i18n";
import { SPEECH_LANGUAGES } from "@/lib/speech-langs";

export type DetectedInputLanguage = {
  speechCode: string;
  localeId: LocaleId | null;
  label: string;
  native: string;
  confidence: number;
};

type ScriptRule = {
  test: RegExp;
  speechCode: string;
  localeId: LocaleId | null;
  label: string;
  native: string;
  weight: number;
};

const SCRIPT_RULES: ScriptRule[] = [
  { test: /[\u0600-\u06FF\u0750-\u077F]/, speechCode: "ar-SA", localeId: "ar", label: "Arabic", native: "العربية", weight: 0.95 },
  { test: /[\u0590-\u05FF]/, speechCode: "he-IL", localeId: null, label: "Hebrew", native: "עברית", weight: 0.95 },
  { test: /[\u0400-\u04FF]/, speechCode: "ru-RU", localeId: "ru", label: "Russian", native: "Русский", weight: 0.92 },
  { test: /[\u0900-\u097F]/, speechCode: "hi-IN", localeId: "hi", label: "Hindi", native: "हिन्दी", weight: 0.92 },
  { test: /[\u0980-\u09FF]/, speechCode: "bn-IN", localeId: null, label: "Bengali", native: "বাংলা", weight: 0.92 },
  { test: /[\u0B80-\u0BFF]/, speechCode: "ta-IN", localeId: null, label: "Tamil", native: "தமிழ்", weight: 0.92 },
  { test: /[\u0C00-\u0C7F]/, speechCode: "te-IN", localeId: null, label: "Telugu", native: "తెలుగు", weight: 0.92 },
  { test: /[\u0A00-\u0A7F]/, speechCode: "pa-IN", localeId: null, label: "Punjabi", native: "ਪੰਜਾਬੀ", weight: 0.9 },
  { test: /[\u0D00-\u0D7F]/, speechCode: "ml-IN", localeId: null, label: "Malayalam", native: "മലയാളം", weight: 0.9 },
  { test: /[\u0E00-\u0E7F]/, speechCode: "th-TH", localeId: null, label: "Thai", native: "ไทย", weight: 0.92 },
  { test: /[\u1100-\u11FF\uAC00-\uD7AF]/, speechCode: "ko-KR", localeId: "ko", label: "Korean", native: "한국어", weight: 0.94 },
  { test: /[\u3040-\u30FF\u31F0-\u31FF]/, speechCode: "ja-JP", localeId: "ja", label: "Japanese", native: "日本語", weight: 0.94 },
  { test: /[\u4E00-\u9FFF]/, speechCode: "zh-CN", localeId: "zh", label: "Chinese", native: "中文", weight: 0.9 },
  { test: /[\u0370-\u03FF]/, speechCode: "el-GR", localeId: null, label: "Greek", native: "Ελληνικά", weight: 0.88 },
];

const LATIN_HINTS: { re: RegExp; speechCode: string; localeId: LocaleId | null; label: string; native: string }[] = [
  { re: /\b(hola|gracias|por qué|porque|está|estoy|cómo|buenos|señor|señora|qué)\b/i, speechCode: "es-ES", localeId: "es", label: "Spanish", native: "Español" },
  { re: /\b(bonjour|merci|vous|nous|être|c'est|pourquoi|comment|très)\b/i, speechCode: "fr-FR", localeId: "fr", label: "French", native: "Français" },
  { re: /\b(hallo|danke|bitte|nicht|warum|können|über|für)\b/i, speechCode: "de-DE", localeId: "de", label: "German", native: "Deutsch" },
  { re: /\b(olá|obrigad[oa]|você|não|porque|como|está)\b/i, speechCode: "pt-BR", localeId: "pt", label: "Portuguese", native: "Português" },
  { re: /\b(ciao|grazie|perché|come|sono|questo|quella)\b/i, speechCode: "it-IT", localeId: "it", label: "Italian", native: "Italiano" },
  { re: /\b(merhaba|teşekkür|nasıl|değil|için|bir)\b/i, speechCode: "tr-TR", localeId: "tr", label: "Turkish", native: "Türkçe" },
  { re: /\b(dank|hallo|niet|waarom|graag|jij|zijn)\b/i, speechCode: "nl-NL", localeId: "nl", label: "Dutch", native: "Nederlands" },
  { re: /\b(việt|không|cảm ơn|tôi|bạn|như thế nào)\b/i, speechCode: "vi-VN", localeId: null, label: "Vietnamese", native: "Tiếng Việt" },
  { re: /\b(terima kasih|apa|saya|anda|tidak)\b/i, speechCode: "id-ID", localeId: null, label: "Indonesian", native: "Bahasa Indonesia" },
];

function speechMeta(code: string) {
  const hit = SPEECH_LANGUAGES.find((l) => l.code === code);
  return hit ? { label: hit.label, native: hit.native } : { label: code, native: code };
}

function fromSpeech(code: string, localeId: LocaleId | null, confidence: number): DetectedInputLanguage {
  const meta = speechMeta(code);
  return { speechCode: code, localeId, label: meta.label, native: meta.native, confidence };
}

/** Detect language from user-typed or dictated text. Returns null when unknown. */
export function detectInputLanguage(text: string): DetectedInputLanguage | null {
  const sample = text.trim();
  if (!sample) return null;

  // Script-first (high confidence)
  for (const rule of SCRIPT_RULES) {
    if (rule.test.test(sample)) {
      return fromSpeech(rule.speechCode, rule.localeId, rule.weight);
    }
  }

  // Latin keyword hints
  let best: (typeof LATIN_HINTS)[number] | null = null;
  let hits = 0;
  for (const hint of LATIN_HINTS) {
    const m = sample.match(hint.re);
    if (m && m.length > hits) {
      hits = m.length;
      best = hint;
    }
  }
  if (best && hits > 0) {
    return fromSpeech(best.speechCode, best.localeId, Math.min(0.85, 0.45 + hits * 0.12));
  }

  // Short Latin text — fall back to browser language
  if (sample.length < 24 && typeof navigator !== "undefined") {
    const nav = navigator.language || "en-US";
    const exact = SPEECH_LANGUAGES.find((l) => l.code.toLowerCase() === nav.toLowerCase());
    const prefix = nav.split("-")[0]?.toLowerCase();
    const fuzzy = SPEECH_LANGUAGES.find((l) => l.code.toLowerCase().startsWith(`${prefix}-`));
    const code = exact?.code || fuzzy?.code;
    if (code) return fromSpeech(code, null, 0.35);
  }

  // Default Latin → English when ASCII-heavy
  if (/^[\x00-\x7F\s\d.,!?'"()-]+$/.test(sample)) {
    return fromSpeech("en-US", "en", 0.4);
  }

  return null;
}
