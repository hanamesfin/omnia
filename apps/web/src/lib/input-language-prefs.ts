/** Preferences for per-message input language auto-detection. */

const AUTO_KEY = "omnia-auto-detect-input-lang";
const MANUAL_LOCK_KEY = "omnia-speech-lang-manual";

export function isAutoDetectInputLanguage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(AUTO_KEY);
    if (v === "0" || v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function setAutoDetectInputLanguage(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("omnia-input-lang-prefs", { detail: { autoDetect: enabled } }));
  } catch {
    /* ignore */
  }
}

export function isSpeechLangManualLock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MANUAL_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSpeechLangManualLock(locked: boolean) {
  try {
    localStorage.setItem(MANUAL_LOCK_KEY, locked ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("omnia-input-lang-prefs", { detail: { manualLock: locked } })
    );
  } catch {
    /* ignore */
  }
}
