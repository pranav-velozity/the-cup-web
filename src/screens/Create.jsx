import { useState } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar } from "../components.jsx";
import { SWATCHES } from "../theme.js";

const DEFAULT_DAYS = [
  { format: "singles", count: 18, pph: 1, playAll: true },
  { format: "scramble", count: 9, pph: 2, playAll: true },
];

export default function Create() {
  const api = useApi();
  const { back, reset, go } = useNav();
  const [step, setStep] = useState("pass");   // pass | wizard
  const [page, setPage] = useState(1);
  const [code, setCode] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [a, setA] = useState({ name: "Eagles", color: "#2E7D5B" });
  const [b, setB] = useState({ name: "Hawks", color: "#B68A2E" });
  const [days, setDays] = useState(DEFAULT_DAYS.map((d) => ({ ...d })));

  const setDay = (i, patch) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const setDayCount = (n) => setDays((ds) => {
    const next = ds.slice(0, n);
    while (next.length < n) next.push({ format: "singles", count: 9, pph: 1, playAll: true });
    return next;
  });

  if (step === "pass") {
    return (
      <div className="screen">
        <Bar title="Home" onBack={back} />
        <div className="pad">
          <div className="h1">Enter your gate pass</div>
          <p className="sub">The 5-digit code an admin gave you.</p>
          {err && <div className="ban err">{err}</div>}
          <input className="inp code" maxLength={5} placeholder="00000"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button className="btn grn" onClick={() => { setErr(null); setStep("wizard"); setPage(1); }}
            disabled={code.length !== 5}>Continue ›</button>
        </div>
      </div>
    );
  }

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const t = await api("/api/organizer/redeem", {
        method: "POST",
        body: JSON.stringify({ code, name: name.trim() || "Untitled Cup", teamA: a, teamB: b, days }),
      });
      reset("home");
      go("hub", { code: t.code });
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const dot = (n) => (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
      {[1, 2, 3].map((x) => (
        <div key={x} style={{ width: x === n ? 22 : 8, height: 8, borderRadius: 4, background: x === n ? "#3E9D6C" : "#D8DDD2", transition: "width .3s" }} />
      ))}
    </div>
  );

  return (
    <div className="screen">
      <Bar title="Home" onBack={() => (page > 1 ? setPage(page - 1) : setStep("pass"))} />
      <div className="pad">
        {dot(page)}
        {err && <div className="ban err">{err}</div>}

        {page === 1 && (
          <>
            <div className="h1">Tournament basics</div>
            <p className="sub">The essentials first.</p>
            <div className="field"><label className="lab">Tournament name</label>
              <input className="inp" placeholder="The Club Cup" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label className="lab">Teams</label>
              <div className="tilerow">
                {[2, 4, 6].map((nn) => (
                  <button key={nn} className={`tilebtn${nn === 2 ? " on" : " off"}`} disabled={nn !== 2}>{nn}</button>
                ))}
              </div>
              <div className="help">Two teams for now — more teams coming soon.</div></div>
            <div className="field"><label className="lab">Competition days</label>
              <div className="tilerow">
                {[1, 2, 3, 4].map((nn) => (
                  <button key={nn} className={`tilebtn${days.length === nn ? " on" : ""}`} onClick={() => setDayCount(nn)}>{nn}</button>
                ))}
              </div>
              <div className="help">{days.length} day{days.length > 1 ? "s" : ""} · set each day's format on the last step.</div></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}><label className="lab">Team A name</label>
                <input className="inp" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></div>
              <div className="field" style={{ flex: 1 }}><label className="lab">Team B name</label>
                <input className="inp" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></div>
            </div>
          </>
        )}

        {page === 2 && (
          <>
            <div className="h1">Team identity</div>
            <p className="sub">Give each side a colour.</p>
            {[["A", a, setA], ["B", b, setB]].map(([k, tm, set]) => (
              <div key={k} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <b style={{ fontSize: 15 }}>{tm.name}</b>
                <div className="lab" style={{ marginTop: 10 }}>Team colour</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {SWATCHES.map((s) => (
                    <button key={s} onClick={() => set({ ...tm, color: s })}
                      style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: s, cursor: "pointer", outline: tm.color === s ? "2px solid #1B2A22" : "none", outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {page === 3 && (
          <>
            <div className="h1">The matches</div>
            <p className="sub">Format, count and points for each day.</p>
            {days.map((d, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 14, padding: 13, marginBottom: 11 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 9 }}>Day {i + 1}</div>
                <div className="tilerow">
                  <button className={`tilebtn${d.format === "singles" ? " on" : ""}`} onClick={() => setDay(i, { format: "singles", pph: 1 })}>Singles</button>
                  <button className={`tilebtn${d.format === "scramble" ? " on" : ""}`} onClick={() => setDay(i, { format: "scramble", pph: 2 })}>Scramble</button>
                </div>
                <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
                  <div style={{ flex: 1 }}><label className="lab">Matches</label>
                    <input className="inp" type="number" value={d.count} onChange={(e) => setDay(i, { count: Math.max(1, Math.min(30, +e.target.value || 1)) })} /></div>
                  <div style={{ flex: 1 }}><label className="lab">Points / hole</label>
                    <input className="inp" type="number" value={d.pph} onChange={(e) => setDay(i, { pph: Math.max(1, Math.min(10, +e.target.value || 1)) })} /></div>
                </div>
                <div className="checkrow" onClick={() => setDay(i, { playAll: !d.playAll })}>
                  <div className={`checkbox${d.playAll ? " on" : ""}`}>✓</div>
                  <div><b style={{ fontSize: 13 }}>Play all 18 holes</b>
                    <div className="help" style={{ marginTop: 2 }}>{d.playAll ? "Every hole is played and counted." : "Match play — a match ends once the lead is bigger than the holes left."}</div></div>
                </div>
              </div>
            ))}
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {page > 1 && <button className="btn ghost" style={{ marginTop: 0, flex: 1 }} onClick={() => setPage(page - 1)}>Back</button>}
          {page < 3
            ? <button className="btn grn" style={{ marginTop: 0, flex: 2 }} onClick={() => setPage(page + 1)}>Next ›</button>
            : <button className="btn grn" style={{ marginTop: 0, flex: 2 }} onClick={create} disabled={busy}>{busy ? "Creating…" : "Create tournament"}</button>}
        </div>
      </div>
    </div>
  );
}
