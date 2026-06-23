import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Spinner } from "../components.jsx";
import InstallPrompt from "../components/InstallPrompt.jsx";
import { soundOn, setSoundOn } from "../lib/sound.js";

// Swipe a tournament left to reveal Delete (organizer owns everything here).
function TournamentRow({ t, onOpen, onDelete }) {
  const [pos, setPos] = useState(0);   // resting: 0 or -88
  const [drag, setDrag] = useState(0);
  const startX = useRef(null);
  const moved = useRef(false);
  const x = Math.max(-88, Math.min(0, pos + drag));

  return (
    <div style={{ position: "relative", marginBottom: 11, borderRadius: 16, overflow: "hidden" }}>
      <button onClick={onDelete}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 88, background: "#D9534F",
          color: "#fff", border: "none", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Delete</button>
      <div className="act" role="button" tabIndex={0}
        style={{ marginBottom: 0, position: "relative", transform: `translateX(${x}px)`,
          transition: startX.current == null ? "transform .2s ease" : "none" }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; moved.current = false; }}
        onTouchMove={(e) => { if (startX.current == null) return; const d = e.touches[0].clientX - startX.current; if (Math.abs(d) > 6) moved.current = true; setDrag(d); }}
        onTouchEnd={() => { const open = pos + drag < -44; setPos(open ? -88 : 0); setDrag(0); startX.current = null; }}
        onClick={() => { if (moved.current) return; if (pos < 0) { setPos(0); } else { onOpen(); } }}>
        <b>{t.name}</b>
        <p>{t.team_a_name} vs {t.team_b_name} · code {t.code}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const api = useApi();
  const { user } = useUser();
  const { go } = useNav();
  const [tournaments, setTournaments] = useState(null);
  const [joined, setJoined] = useState([]);
  const [err, setErr] = useState(null);
  const [snd, setSnd] = useState(soundOn());
  const first = user?.firstName || "there";

  const toggleSound = () => { const v = !snd; setSoundOn(v); setSnd(v); };

  const load = useCallback(() => {
    api("/api/organizer/tournaments")
      .then((rows) => setTournaments(rows))
      .catch((e) => { setErr(e.message); setTournaments([]); });
    api("/api/player/tournaments")
      .then((rows) => setJoined(rows || []))
      .catch(() => setJoined([]));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const del = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? This removes its roster, pairings and scores, and can't be undone.`)) return;
    try { await api(`/api/organizer/tournaments/${t.id}`, { method: "DELETE" }); load(); }
    catch (e) { window.alert(e.message); }
  };

  return (
    <div className="screen">
      <div className="bar">
        <span style={{ fontWeight: 700 }}>Home</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={toggleSound} title={snd ? "Sound on" : "Sound off"}
            style={{ background: "none", border: "none", cursor: "pointer", color: snd ? "#2E7D5B" : "#9aa394", padding: 0, display: "flex" }}>
            {snd ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
            )}
          </button>
          <span className="wordmark">TOTO</span>
        </div>
      </div>
      <div className="pad">
        <div className="h1">Hi {first} 👋</div>
        <p className="sub">Start a tournament or jump into one you're playing.</p>

        <InstallPrompt />

        <button className="act" onClick={() => go("create")}>
          <b>＋ Create a tournament</b>
          <p>Redeem a gate pass and set up your match.</p>
        </button>
        <button className="act" onClick={() => go("join")}>
          <b>▶ Join with a code</b>
          <p>Enter a tournament code to play and score.</p>
        </button>

        <div className="lab" style={{ marginTop: 18 }}>Your tournaments</div>
        {tournaments === null ? <Spinner /> :
          tournaments.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>{err || "None yet — create one to get started."}</p>
          ) : (
            <>
              {tournaments.map((t) => (
                <TournamentRow key={t.id} t={t} onOpen={() => go("hub", { code: t.code })} onDelete={() => del(t)} />
              ))}
              <p className="help" style={{ textAlign: "center", marginTop: 4 }}>Swipe a tournament left to delete it.</p>
            </>
          )}

        {joined.filter((j) => !(tournaments || []).some((o) => o.id === j.id)).length > 0 && (
          <>
            <div className="lab" style={{ marginTop: 20 }}>Playing in</div>
            {joined.filter((j) => !(tournaments || []).some((o) => o.id === j.id)).map((t) => (
              <button key={t.id} className="act" onClick={() => go("board", { code: t.code })}>
                <b>{t.name}</b>
                <p>{t.team_a_name} vs {t.team_b_name} · code {t.code}</p>
              </button>
            ))}
          </>
        )}

        <div className="help" style={{ textAlign: "center", marginTop: 24, opacity: .6 }}>TOTO · build v0.4</div>
      </div>
    </div>
  );
}
