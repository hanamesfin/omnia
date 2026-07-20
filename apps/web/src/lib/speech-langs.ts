/** BCP-47 tags for Web Speech Recognition — broad multilingual coverage. */

export type SpeechLang = { code: string; label: string; native: string };

export const SPEECH_LANGUAGES: SpeechLang[] = [
  { code: "en-US", label: "English (US)", native: "English" },
  { code: "en-GB", label: "English (UK)", native: "English" },
  { code: "en-AU", label: "English (AU)", native: "English" },
  { code: "en-IN", label: "English (India)", native: "English" },
  { code: "es-ES", label: "Spanish (Spain)", native: "Español" },
  { code: "es-MX", label: "Spanish (Mexico)", native: "Español" },
  { code: "es-AR", label: "Spanish (Argentina)", native: "Español" },
  { code: "fr-FR", label: "French", native: "Français" },
  { code: "fr-CA", label: "French (Canada)", native: "Français" },
  { code: "de-DE", label: "German", native: "Deutsch" },
  { code: "it-IT", label: "Italian", native: "Italiano" },
  { code: "pt-BR", label: "Portuguese (Brazil)", native: "Português" },
  { code: "pt-PT", label: "Portuguese (Portugal)", native: "Português" },
  { code: "nl-NL", label: "Dutch", native: "Nederlands" },
  { code: "pl-PL", label: "Polish", native: "Polski" },
  { code: "uk-UA", label: "Ukrainian", native: "Українська" },
  { code: "ru-RU", label: "Russian", native: "Русский" },
  { code: "tr-TR", label: "Turkish", native: "Türkçe" },
  { code: "ar-SA", label: "Arabic", native: "العربية" },
  { code: "he-IL", label: "Hebrew", native: "עברית" },
  { code: "fa-IR", label: "Persian", native: "فارسی" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur-PK", label: "Urdu", native: "اردو" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "中文" },
  { code: "zh-HK", label: "Chinese (Hong Kong)", native: "中文" },
  { code: "ja-JP", label: "Japanese", native: "日本語" },
  { code: "ko-KR", label: "Korean", native: "한국어" },
  { code: "th-TH", label: "Thai", native: "ไทย" },
  { code: "vi-VN", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "id-ID", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms-MY", label: "Malay", native: "Bahasa Melayu" },
  { code: "fil-PH", label: "Filipino", native: "Filipino" },
  { code: "sv-SE", label: "Swedish", native: "Svenska" },
  { code: "da-DK", label: "Danish", native: "Dansk" },
  { code: "no-NO", label: "Norwegian", native: "Norsk" },
  { code: "fi-FI", label: "Finnish", native: "Suomi" },
  { code: "cs-CZ", label: "Czech", native: "Čeština" },
  { code: "sk-SK", label: "Slovak", native: "Slovenčina" },
  { code: "hu-HU", label: "Hungarian", native: "Magyar" },
  { code: "ro-RO", label: "Romanian", native: "Română" },
  { code: "bg-BG", label: "Bulgarian", native: "Български" },
  { code: "hr-HR", label: "Croatian", native: "Hrvatski" },
  { code: "sr-RS", label: "Serbian", native: "Српски" },
  { code: "el-GR", label: "Greek", native: "Ελληνικά" },
  { code: "ca-ES", label: "Catalan", native: "Català" },
  { code: "eu-ES", label: "Basque", native: "Euskara" },
  { code: "gl-ES", label: "Galician", native: "Galego" },
  { code: "af-ZA", label: "Afrikaans", native: "Afrikaans" },
  { code: "sw-KE", label: "Swahili", native: "Kiswahili" },
  { code: "am-ET", label: "Amharic", native: "አማርኛ" },
  { code: "zu-ZA", label: "Zulu", native: "isiZulu" },
  { code: "ne-NP", label: "Nepali", native: "नेपाली" },
  { code: "si-LK", label: "Sinhala", native: "සිංහල" },
  { code: "my-MM", label: "Burmese", native: "မြန်မာ" },
  { code: "km-KH", label: "Khmer", native: "ខ្មែរ" },
  { code: "lo-LA", label: "Lao", native: "ລາວ" },
  { code: "ka-GE", label: "Georgian", native: "ქართული" },
  { code: "hy-AM", label: "Armenian", native: "Հայերեն" },
  { code: "az-AZ", label: "Azerbaijani", native: "Azərbaycan" },
  { code: "kk-KZ", label: "Kazakh", native: "Қазақ" },
  { code: "uz-UZ", label: "Uzbek", native: "Oʻzbek" },
  { code: "mn-MN", label: "Mongolian", native: "Монгол" },
  { code: "is-IS", label: "Icelandic", native: "Íslenska" },
  { code: "lt-LT", label: "Lithuanian", native: "Lietuvių" },
  { code: "lv-LV", label: "Latvian", native: "Latviešu" },
  { code: "et-EE", label: "Estonian", native: "Eesti" },
  { code: "sl-SI", label: "Slovenian", native: "Slovenščina" },
];

const STORAGE_KEY = "omnia-speech-lang";

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  // Web Speech Recognition requires a secure context (HTTPS or localhost).
  if (!window.isSecureContext) return false;
  const w = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Safari/WebKit — SpeechRecognition is far less reliable than Chrome. */
export function isAppleSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|crios|chromium|android|edg|firefox|fxios/i.test(ua);
}

export function getStoredSpeechLang(): string {
  if (typeof window === "undefined") return "en-US";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SPEECH_LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const exact = SPEECH_LANGUAGES.find((l) => l.code.toLowerCase() === nav.toLowerCase());
  if (exact) return exact.code;
  const prefix = nav.split("-")[0]?.toLowerCase();
  const fuzzy = SPEECH_LANGUAGES.find((l) => l.code.toLowerCase().startsWith(`${prefix}-`));
  return fuzzy?.code || "en-US";
}

export function setStoredSpeechLang(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}
