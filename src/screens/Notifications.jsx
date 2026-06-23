import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar, Spinner } from "../components.jsx";
import { enablePush, notifGranted, pushSupported } from "../lib/push.js";

const SEEN = "toto-notifs-seen";
const ICON = { match_final: "🏁", lead_change: "🔄", day_end: "📅", hole_won: "⛳" };

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Notifications() {
  const api = useApi();
  const { back } = useNav();
  const [feed, setFeed] = useState(null);
  const [granted, setGranted] = useState(notifGranted());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try { setFeed(await api("/api/player/notifications")); }
    catch { setFeed([]); }
  }, [api]);

  useEffect(() => {
    load();
    // Opening the feed marks everything seen.
    try { localStorage.setItem(SEEN, new Date().toISOString()); } catch {}
  }, [load]);

  const turnOn = async () => {
    setBusy(true); setMsg(null);
    try { await enablePush(api); setGranted(true); setMsg({ k: "ok", t: "Notifications are on for this device." }); }
    catch (e) { setMsg({ k: "err", t: e.message }); }
    setBusy(false);
  };

  return (
    <div className="screen">
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div className="h1">Notifications</div>
        <p className="sub">Match results, lead changes and day wrap-ups from tournaments you're in.</p>

        {msg && <div className={`ban ${msg.k}`}>{msg.t}</div>}

        {!granted && (
          <div style={{ background: "#FBF1D8", border: "1px solid #EBD9A6", borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <b style={{ fontSize: 14 }}>Get a buzz when it matters</b>
            <p style={{ fontSize: 12.5, color: "#7a5b18", margin: "3px 0 10px" }}>
              {pushSupported() ? "Turn on push to hear about match finishes and lead changes even when TOTO is closed." : "Add TOTO to your home screen first, then enable notifications from the installed app."}
            </p>
            {pushSupported() && <button className="btn grn" style={{ marginTop: 0 }} onClick={turnOn} disabled={busy}>{busy ? "Enabling…" : "Turn on notifications"}</button>}
          </div>
        )}

        {granted && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#EAF6EF", border: "1px solid #CdE8D8", borderRadius: 12, padding: "10px 12px", marginBottom: 14 }}>
            <span className="livedot" style={{ background: "#2F8A5E" }} />
            <span style={{ fontSize: 12.5, color: "#2F6B4C", fontWeight: 600, flex: 1 }}>Notifications on for this device</span>
            <button className="linkbtn" style={{ width: "auto", padding: "2px 4px", fontSize: 12 }} onClick={turnOn} disabled={busy}>
              {busy ? "…" : "Re-register"}
            </button>
          </div>
        )}

        <div className="lab">Recent</div>
        {feed === null ? <Spinner /> : feed.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Nothing yet — updates will show up here as matches play out.</p>
        ) : feed.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 20, lineHeight: 1.1 }}>{ICON[n.type] || "🔔"}</div>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13.5 }}>{n.title}</b>
              <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 1 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: "#9aa394", marginTop: 3 }}>{n.tournament_name} · {timeAgo(n.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper for the Home bell: are there unseen notifications?
export function hasUnseen(feed) {
  if (!feed?.length) return false;
  let seen = 0;
  try { seen = new Date(localStorage.getItem(SEEN) || 0).getTime(); } catch {}
  return feed.some((n) => new Date(n.created_at).getTime() > seen);
}
