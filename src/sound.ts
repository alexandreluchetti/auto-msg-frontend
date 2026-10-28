/**
 * New-order alert. Browsers only play sound after a user gesture, so the board asks staff to turn
 * it on once; the alert is a short two-tone chime made with the Web Audio API (no audio file).
 */
let context: AudioContext | null = null;

export function enableSound(): boolean {
  if (typeof AudioContext === 'undefined') {
    return false;
  }
  context ??= new AudioContext();
  void context.resume();
  return true;
}

export function playNewOrderAlert(): void {
  const audio = context;
  if (!audio) {
    return;
  }
  const start = audio.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const at = start + index * 0.25;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.25);
  });
}
