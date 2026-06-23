import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar, Avatar, Spinner } from "../components.jsx";

export default function AdminView() {
  const api = useApi();
  const { code, entry, go, back } = useNav();
  const tid = entry?.tid;
  const [t, setT] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try { setT(await api(`/api/admin/tournaments/${tid}`)); }
    catch (e) { setErr(e.message); }
  }, [api, tid]);

  useEffect(() => { load(); }, [load]);

  if (err) return (<div className="screen"><Bar title="Passes" onBack={back} /><div className="pad"><div className="ban err">{err}</div></div></div>);
  if (!t) return (<div className="screen"><Bar title="Passes" onBack={back} /><Spinner /></div>);

  const teamA = { name: t.team_a_name, color: t.team_a_color, emoji: t.team_a_emoji, kind: t.team_a_kind, logoUrl: t.team_a_logo_url };
  const teamB = { name: t.team_b_name, color: t.team_b_color, emoji: t.team_b_emoji, kind: t.team_b_kind, logoUrl: t.team_b_logo_url };

  const names = {};
  for (const r of t.roster) names[r.id] = r.planned_name || "—";
  const nameList = (ids) => (ids || []).map((id) => names[id]).filter(Boolean).join(" & ") || "—";

  const rosterA = t.roster.filter((r) => r.team === "A");
  const rosterB = t.roster.filter((r) => r.team === "B");
  const joined = new Set(t.registrations.map((r) => r.phone));

  return (
    <div className="screen">
      <Bar title="Passes" onBack={back} />
      <div className="pad">
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
          <Avatar team={teamA} size={34} />
          <div className="h1" style={{ margin: 0 }}>{t.name}</div>
        </div>
        <p className="sub">{t.team_a_name} vs {t.team_b_name} · code {t.code} · admin view</p>

        <button className="btn grn" onClick={() => go("board", { code: code || t.code })}>🏌️ Open live board</button>

        <div className="lab" style={{ marginTop: 18 }}>Format</div>
        {t.days.map((d) => (
          <div key={d.day_index} className="muted" style={{ fontSize: 13, padding: "3px 0" }}>
            Day {d.day_index + 1}: {d.format === "scramble" ? "Scramble" : "Singles"} · {d.points_per_hole} pt/hole{d.play_all ? " · play all" : ""}
          </div>
        ))}

        <div className="lab" style={{ marginTop: 18 }}>Roster · {t.roster.length} players · {t.registrations.length} joined</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[[t.team_a_name, rosterA], [t.team_b_name, rosterB]].map(([label, list], i) => (
            <div key={i}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: i === 0 ? t.team_a_color : t.team_b_color }}>{label}</div>
              {list.length === 0 ? <div className="muted" style={{ fontSize: 12.5 }}>—</div> : list.map((r) => (
                <div key={r.id} style={{ fontSize: 13, padding: "2px 0", display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span>{r.planned_name || "(no name)"}</span>
                  {joined.has(r.phone) && <span style={{ color: "#2F8A5E", fontSize: 11 }}>✓</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="lab" style={{ marginTop: 18 }}>Pairings · {t.matches.length} matches</div>
        {t.matches.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No matches set up yet.</p>
        ) : t.matches.map((m) => {
          const set = m.format === "scramble"
            ? (m.side_a?.[0] && m.side_a?.[1] && m.side_b?.[0] && m.side_b?.[1])
            : (m.side_a?.[0] && m.side_b?.[0]);
          return (
            <div key={m.id} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: "var(--mut)" }}>
                DAY {m.day_index + 1} · {m.format === "scramble" ? "SCRAMBLE" : "SINGLES"} · MATCH {m.ordinal}{set ? "" : " · INCOMPLETE"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 13.5 }}>
                <span style={{ flex: 1, color: t.team_a_color, fontWeight: 600 }}>{nameList(m.side_a)}</span>
                <span className="muted" style={{ fontSize: 11 }}>vs</span>
                <span style={{ flex: 1, textAlign: "right", color: t.team_b_color, fontWeight: 600 }}>{nameList(m.side_b)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
