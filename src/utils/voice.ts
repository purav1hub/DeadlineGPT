export const VoiceHelper = {
  speak(text: string, onStart?: () => void, onEnd?: () => void): SpeechSynthesisUtterance | null {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech Synthesis is not supported in this browser.");
      return null;
    }

    // Cancel any active speech first
    window.speechSynthesis.cancel();

    // Strip out markdown symbols for cleaner voice speech
    const cleanText = text
      .replace(/[\*\#\-\_\[\]\(\)\`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick a good default voice (preferably an English female/male natural sounding voice)
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) =>
        v.lang.startsWith("en-") &&
        (v.name.toLowerCase().includes("google") ||
          v.name.toLowerCase().includes("natural") ||
          v.name.toLowerCase().includes("premium"))
    ) || voices.find((v) => v.lang.startsWith("en-")) || voices[0];

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.rate = 1.05; // Slightly faster for punchier feedback
    utterance.pitch = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd; // Handle interruptions gracefully
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
  },

  stop(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  isSupported(): boolean {
    return typeof window !== "undefined" && !!window.speechSynthesis;
  }
};
