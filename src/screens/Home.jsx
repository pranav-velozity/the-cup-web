import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Spinner } from "../components.jsx";
import InstallPrompt from "../components/InstallPrompt.jsx";
import { soundOn, setSoundOn } from "../lib/sound.js";
import { hasUnseen } from "./Notifications.jsx";
import { enablePush, notifGranted } from "../lib/push.js";
import { usePullToRefresh, pullIndicatorStyle } from "../lib/usePullToRefresh.js";

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
  const [unseen, setUnseen] = useState(false);
  const first = user?.firstName || "there";

  const toggleSound = () => { const v = !snd; setSoundOn(v); setSnd(v); };

  const load = useCallback(() => {
    api("/api/organizer/tournaments")
      .then((rows) => setTournaments(rows))
      .catch((e) => { setErr(e.message); setTournaments([]); });
    api("/api/player/tournaments")
      .then((rows) => setJoined(rows || []))
      .catch(() => setJoined([]));
    api("/api/player/notifications")
      .then((feed) => setUnseen(hasUnseen(feed)))
      .catch(() => {});
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const ptr = usePullToRefresh(load);

  // Push subscriptions get invalidated when the service worker updates on a
  // redeploy — silently re-subscribe on load so notifications keep flowing.
  useEffect(() => {
    if (notifGranted()) enablePush(api).catch(() => {});
  }, [api]);

  const del = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? This removes its roster, pairings and scores, and can't be undone.`)) return;
    try { await api(`/api/organizer/tournaments/${t.id}`, { method: "DELETE" }); load(); }
    catch (e) { window.alert(e.message); }
  };

  return (
    <div className="screen" ref={ptr.ref} {...ptr.handlers}>
      <div style={pullIndicatorStyle(ptr.pull, ptr.refreshing)}>
        <span style={{ fontSize: 20, transform: ptr.refreshing ? "none" : `rotate(${ptr.pull * 3}deg)`, animation: ptr.refreshing ? "spin .8s linear infinite" : "none" }}>↻</span>
      </div>
      <div className="bar">
        <span style={{ fontWeight: 700 }}>Home</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={toggleSound} title={snd ? "Sound on" : "Sound off"}
            style={{ background: "none", border: "none", cursor: "pointer", color: snd ? "#2E7D5B" : "#9aa394", padding: 0, display: "flex" }}>
            {snd ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
            )}
          </button>
          <img src="/icons/logo.png" alt="TOTO" className="barlogo" />
        </div>
      </div>
      <div className="pad">
        <div className="h1">Hi {first} 👋</div>
        <p className="sub">Start a tournament or jump into one you're playing.</p>

        <InstallPrompt />

        <div className="tilepair">
          <button className="bigtile create" onClick={() => go("create")}>
            <div className="ic">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <div className="bt-txt"><b>Create</b><p>Start a tournament</p></div>
          </button>
          <button className="bigtile join" onClick={() => go("join")}>
            <div className="ic">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
            </div>
            <div className="bt-txt"><b>Join</b><p>Enter a code to play</p></div>
          </button>
        </div>
        <div className="tilepair" style={{ marginTop: 11 }}>
          <button className={`bigtile alerts${unseen ? " unread" : ""}`} onClick={() => go("notifs")}>
            <div className="ic" style={{ position: "relative" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              {unseen && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: "#D9534F", border: "2px solid #fff" }} />}
            </div>
            <div className="bt-txt"><b>Alerts</b><p>Match updates & news</p></div>
          </button>
          <button className="bigtile gallery" onClick={() => go("gallery")}>
            <div className="ic">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="M21 15l-5-5L5 21" /></svg>
            </div>
            <div className="bt-txt"><b>Gallery</b><p>Photos from the round</p></div>
          </button>
        </div>

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

        <div style={{ textAlign: "center", marginTop: 28, marginBottom: 4 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#B68A2E", fontWeight: 700, fontSize: 12.5, letterSpacing: ".03em" }}>
            <span style={{ height: 1, width: 22, background: "linear-gradient(90deg, transparent, #D9C38A)" }} />
            Designed by Pranav
            <span style={{ height: 1, width: 22, background: "linear-gradient(90deg, #D9C38A, transparent)" }} />
          </div>
          <div style={{ fontSize: 9, color: "var(--mut)", opacity: .45, marginTop: 3, letterSpacing: ".14em" }}>TOTO · v1.2</div>
        </div>
      </div>
    </div>
  );
}
