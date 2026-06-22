// Tiny synthesized sound system (no audio files). Off by default; the
// preference persists in localStorage. iOS only allows audio after a user
// gesture, so the AudioContext is created lazily on first play.
const KEY = "toto-sound";
let ctx = null;

export function soundOn() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function setSoundOn(v) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
}

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function blip(freq, dur, type, gain) {
  const a = audioCtx();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(a.destination);
  const t = a.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}

// Soft tick for hole/score taps.
export function playTap() {
  if (!soundOn()) return;
  try { blip(540, 0.09, "sine", 0.07); } catch { /* ignore */ }
}

// Two-note flourish when a match is decided.
export function playConfirm() {
  if (!soundOn()) return;
  try {
    const a = audioCtx(); if (!a) return;
    [660, 880].forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.value = f;
      o.connect(g); g.connect(a.destination);
      const t = a.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t); o.stop(t + 0.22);
    });
  } catch { /* ignore */ }
}
