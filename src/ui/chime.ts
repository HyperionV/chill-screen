/** A soft two-note chime made on the spot, so no sound file is needed. */
export function chime(): void {
  const ac = new AudioContext();
  const now = ac.currentTime;
  [659.25, 880].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.35);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.35 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 1.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * 0.35);
    osc.stop(now + i * 0.35 + 1.7);
  });
  window.setTimeout(() => void ac.close(), 2600);
}
