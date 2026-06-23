import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar, Avatar, Spinner } from "../components.jsx";

export default function Hub() {
  const api = useApi();
  const { code, go, back } = useNav();
  const [t, setT] = useState(null);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api("/api/organizer/tournaments");
      const mine = list.find((x) => x.code === code);
      if (!mine) { setErr("Tournament not found"); return; }
      const detail = await api(`/api/organizer/tournaments/${mine.id}`);
      setT(detail);
    } catch (e) { setErr(e.message); }
  }, [api, code]);

  useEffect(() => { load(); }, [load]);

  if (err) return (<div className="screen"><Bar title="Home" onBack={back} /><div className="pad"><div className="ban err">{err}</div></div></div>);
  if (!t) return (<div className="screen"><Bar title="Home" onBack={back} /><Spinner /></div>);

  const teamA = { name: t.team_a_name, color: t.team_a_color, emoji: t.team_a_emoji, kind: t.team_a_kind, logoUrl: t.team_a_logo_url };
  const ca = t.roster.filter((r) => r.team === "A").length;
  const cb = t.roster.filter((r) => r.team === "B").length;
  let setM = 0, totM = t.matches.length;
  for (const m of t.matches) {
    const ok = m.kind === "scramble"
      ? (m.side_a?.[0] && m.side_a?.[1] && m.side_b?.[0] && m.side_b?.[1])
      : (m.side_a?.[0] && m.side_b?.[0]);
    if (ok) setM++;
  }

  const copyCode = () => {
    try { navigator.clipboard?.writeText(t.code); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="screen">
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Avatar team={teamA} size={34} />
          <div className="h1" style={{ margin: 0 }}>{t.name}</div>
        </div>
        <p className="sub">{t.team_a_name} vs {t.team_b_name}</p>

        <div className="tilepair">
          <button className="bigtile board" onClick={() => go("board", { code: t.code })}>
            <div className="ic">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4l11 3-4 3 4 3-11 3" /></svg>
            </div>
            <div className="bt-txt"><b>Live board</b><p>See the score & play</p></div>
          </button>
          <button className="bigtile roster" onClick={() => go("roster", { code: t.code })}>
            <div className="ic">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-4.9" /></svg>
            </div>
            <div className="bt-txt"><b>Roster</b><p>{t.roster.length} players · {ca}/{cb}</p></div>
          </button>
        </div>
        <div className="tilepair" style={{ marginTop: 11 }}>
          <button className="bigtile pairings" onClick={() => go("pairings", { code: t.code })}>
            <div className="ic">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h6v14H4zM14 5h6v14h-6" /><path d="M10 12h4" /></svg>
            </div>
            <div className="bt-txt"><b>Pairings</b><p>{setM} of {totM} set</p></div>
          </button>
          <button className="bigtile code" onClick={copyCode}>
            <div className="ic">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 19 4M16 7l3 .5M14 9l2.5 .5" /></svg>
            </div>
            <div className="bt-txt">
              <b style={{ fontSize: 23, letterSpacing: ".1em" }}>{t.code}</b>
              <p>{copied ? "✓ Copied!" : "Tap to copy join code"}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
