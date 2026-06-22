import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Spinner } from "../components.jsx";

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
  const [err, setErr] = useState(null);
  const first = user?.firstName || "there";

  const load = useCallback(() => {
    api("/api/organizer/tournaments")
      .then((rows) => setTournaments(rows))
      .catch((e) => { setErr(e.message); setTournaments([]); });
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const del = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? This removes its roster, pairings and scores, and can't be undone.`)) return;
    try { await api(`/api/organizer/tournaments/${t.id}`, { method: "DELETE" }); load(); }
    catch (e) { window.alert(e.message); }
  };

  return (
    <div className="screen">
      <div className="bar"><span style={{ fontWeight: 700 }}>Home</span><span className="wordmark">TOTO</span></div>
      <div className="pad">
        <div className="h1">Hi {first} 👋</div>
        <p className="sub">Start a tournament or jump into one you're playing.</p>

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
      </div>
    </div>
  );
}
