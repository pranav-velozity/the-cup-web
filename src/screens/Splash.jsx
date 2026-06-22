import { useEffect, useRef, useState } from "react";

// Ported from the TOTO splash scene: exact bounceDrop physics + easeOutBack,
// brand palette, golf-ball drop into the cup, confetti burst, lockup reveal.
const GREEN = "#3FA56F", GOLD = "#C8A24C", INK = "#1B2A22", BG = "#F3F6F0", MUTED = "#67786C";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function bounceDrop(p) {
  const segs = [[0, 0.32, 1, "fall"], [0.32, 0.54, 0.42, "arc"], [0.54, 0.71, 0.19, "arc"],
    [0.71, 0.83, 0.08, "arc"], [0.83, 0.92, 0.032, "arc"], [0.92, 1, 0, "rest"]];
  for (const [a, b, H, type] of segs) {
    if (p >= a && p <= b) {
      const u = (b - a) === 0 ? 0 : (p - a) / (b - a);
      if (type === "fall") return 1 - u * u;
      if (type === "rest") return 0;
      return H * 4 * u * (1 - u);
    }
  }
  return 0;
}

const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  ang: (i / 26) * Math.PI * 2 + (i % 5) * 0.21,
  dist: 90 + (i * 131 % 150),
  size: 5 + (i % 5) * 3,
  gold: i % 2 === 0,
  spin: ((i % 2) ? 1 : -1) * (220 + (i % 5) * 120),
}));

export default function Splash({ onDone }) {
  const [t, setT] = useState(0);
  const [out, setOut] = useState(false);
  const raf = useRef(); const start = useRef();

  useEffect(() => {
    const loop = (ts) => {
      if (!start.current) start.current = ts;
      const el = (ts - start.current) / 1000;
      setT(el);
      if (el < 2.35) raf.current = requestAnimationFrame(loop);
      else setOut(true);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const dp = clamp((t - 0.15) / 1.25, 0, 1);     // ball drop window
  const ballY = -300 * bounceDrop(dp);
  const settle = clamp((dp - 0.86) / 0.14, 0, 1); // shrink into the cup at the end
  const ballScale = 1 - settle * 0.55;
  const confT = clamp((t - 1.25) / 0.7, 0, 1);    // confetti after it drops in

  const reveal = (s) => {
    const o = clamp((t - s) / 0.42, 0, 1);
    const e = easeOutBack(clamp((t - s) / 0.72, 0, 1));
    return { opacity: o, transform: `translateY(${(1 - e) * 36}px)` };
  };
  const wm = reveal(1.35), tag = reveal(1.65);

  return (
    <div className={`splash${out ? " out" : ""}`} style={{ background: BG }} onTransitionEnd={() => out && onDone()}>
      <div style={{ position: "relative", width: 200, height: 210 }}>
        {/* cup */}
        <div style={{ position: "absolute", left: "50%", top: 150, width: 56, height: 17, marginLeft: -28, borderRadius: "50%", background: "#DCE2D6", boxShadow: "inset 0 2px 4px rgba(0,0,0,.12)" }} />
        {/* confetti from the cup */}
        {confT > 0 && CONFETTI.map((c, i) => {
          const d = c.dist * easeOutBack(confT);
          const x = Math.cos(c.ang) * d, y = Math.sin(c.ang) * d * 0.85;
          return (
            <div key={i} style={{
              position: "absolute", left: "50%", top: 150, width: c.size, height: c.size,
              borderRadius: c.gold ? "50%" : 1, background: c.gold ? GOLD : GREEN,
              opacity: 1 - confT, transform: `translate(${x}px, ${-y}px) rotate(${c.spin * confT}deg)`,
            }} />
          );
        })}
        {/* ball */}
        <svg width="62" height="62" viewBox="0 0 62 62" style={{ position: "absolute", left: "50%", top: 120, marginLeft: -31,
          opacity: t > 0.12 ? 1 : 0, transform: `translateY(${ballY}px) scale(${ballScale})` }}>
          <defs><radialGradient id="ballg" cx="0.38" cy="0.32" r="0.85">
            <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e6ebe2" /></radialGradient></defs>
          <circle cx="31" cy="31" r="29" fill="url(#ballg)" />
          <circle cx="23" cy="21" r="2.6" fill="#dde3d8" /><circle cx="37" cy="25" r="2.2" fill="#dde3d8" />
          <circle cx="29" cy="33" r="2.2" fill="#dde3d8" /><circle cx="40" cy="36" r="2" fill="#dde3d8" />
        </svg>
      </div>
      <div className="sp-word" style={{ ...wm, color: INK, fontSize: 54, marginTop: 4 }}>TOTO</div>
      <div className="sp-tag" style={{ ...tag, fontSize: 15 }}>
        <span style={{ color: MUTED }}>Compete… </span>
        <span style={{ color: INK, fontFamily: "'Noto Sans Devanagari','Outfit',sans-serif" }}>मगर प्यार से</span>
      </div>
    </div>
  );
}
