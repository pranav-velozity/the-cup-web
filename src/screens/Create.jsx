import { useState } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar } from "../components.jsx";
import { SWATCHES, EMOJI } from "../theme.js";

const DEFAULT_DAYS = [
  { format: "singles", count: 18, pph: 1, playAll: true },
  { format: "scramble", count: 9, pph: 2, playAll: true },
];

export default function Create() {
  const api = useApi();
  const { back, reset, go } = useNav();
  const [step, setStep] = useState("pass");   // pass | request | issued | wizard
  const [page, setPage] = useState(1);
  const [code, setCode] = useState("");
  const [reqName, setReqName] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [a, setA] = useState({ name: "Eagles", color: "#2E7D5B", kind: "crest", emoji: null, logoUrl: null });
  const [b, setB] = useState({ name: "Hawks", color: "#B68A2E", kind: "crest", emoji: null, logoUrl: null });

  // Downscale an uploaded image to a small square data URL (no external storage).
  const onLogo = (set, tm) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const S = 128, c = document.createElement("canvas");
      c.width = S; c.height = S;
      const ctx = c.getContext("2d");
      const scale = Math.max(S / img.width, S / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      set({ ...tm, kind: "logo", logoUrl: c.toDataURL("image/jpeg", 0.82) });
    };
    img.src = URL.createObjectURL(file);
  };
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
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => { setErr(null); setStep("request"); }}>
            Don't have one? Request access
          </button>
        </div>
      </div>
    );
  }

  if (step === "request") {
    const getCode = async () => {
      if (!reqName.trim()) { setErr("Please enter your name first."); return; }
      setBusy(true); setErr(null);
      try {
        const res = await api("/api/organizer/request-access", {
          method: "POST", body: JSON.stringify({ name: reqName.trim() }),
        });
        setCode(res.code); setStep("issued");
      } catch (e) { setErr(e.message); }
      setBusy(false);
    };
    return (
      <div className="screen">
        <Bar title="Home" onBack={() => { setErr(null); setStep("pass"); }} />
        <div className="pad">
          <div className="h1">Request access</div>
          <p className="sub">Pop your name in and we'll generate a gate pass for you.</p>
          {err && <div className="ban err">{err}</div>}
          <div className="field"><label className="lab">Your name</label>
            <input className="inp" placeholder="e.g. Priya Shah" value={reqName} onChange={(e) => setReqName(e.target.value)} /></div>
          <button className="btn grn" onClick={getCode} disabled={busy}>{busy ? "Generating…" : "Get my code ›"}</button>
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => { setErr(null); setStep("pass"); }}>‹ Back to gate pass</button>
        </div>
      </div>
    );
  }

  if (step === "issued") {
    return (
      <div className="screen">
        <Bar title="Home" onBack={back} />
        <div className="pad">
          <div className="h1">You're in ✨</div>
          <p className="sub">Here's your gate pass — it's yours to keep.</p>
          <div className="codecard"><div className="muted" style={{ textAlign: "center", fontSize: 12, marginBottom: 4 }}>Your code</div><div className="bigcode">{code}</div></div>
          <p className="help" style={{ textAlign: "center" }}>An admin can see your request by name.</p>
          <button className="btn grn" onClick={() => { setErr(null); setStep("wizard"); setPage(1); }}>Start setup ›</button>
        </div>
      </div>
    );
  }

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const cleanDays = days.map((d) => ({
        ...d,
        count: Math.min(30, Math.max(1, +d.count || 1)),
        pph: Math.min(10, Math.max(1, +d.pph || 1)),
      }));
      const t = await api("/api/organizer/redeem", {
        method: "POST",
        body: JSON.stringify({ code, name: name.trim() || "Untitled Cup", teamA: a, teamB: b, days: cleanDays }),
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
            <p className="sub">Pick a look for each side — tap a tile to flip it.</p>
            {[["A", a, setA], ["B", b, setB]].map(([k, tm, set]) => (
              <div key={k} style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: "0 2px 10px rgba(27,42,34,.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                  <div className="crest" style={{ width: 44, height: 44, background: tm.color, fontSize: 18, overflow: "hidden" }}>
                    {tm.kind === "logo" && tm.logoUrl ? <img src={tm.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : tm.kind === "emoji" && tm.emoji ? <span style={{ fontSize: 22 }}>{tm.emoji}</span>
                      : (tm.name || "T").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <b style={{ fontSize: 15 }}>{tm.name}</b>
                </div>

                <div className="kindrow">
                  {[
                    ["crest", "Crest", <path key="c" d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />],
                    ["emoji", "Emoji", <><circle key="o" cx="12" cy="12" r="9" /><path key="m" d="M8.5 14a4 4 0 0 0 7 0" /><circle key="e1" cx="9" cy="10" r=".6" fill="currentColor" /><circle key="e2" cx="15" cy="10" r=".6" fill="currentColor" /></>],
                    ["logo", "Logo", <><rect key="r" x="3" y="3" width="18" height="18" rx="3" /><path key="p" d="M3 16l5-5 4 4 3-3 6 6" /></>],
                  ].map(([kind, label, icon]) => (
                    <div key={kind} className={`kindtile${tm.kind === kind ? " on" : ""}`} onClick={() => set({ ...tm, kind })}>
                      <div className="kindtile-inner">
                        <div className="kindtile-face">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                          {label}
                        </div>
                        <div className="kindtile-face kindtile-back">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {tm.kind === "crest" && (
                  <>
                    <div className="lab">Team color</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                      {SWATCHES.map((s) => (
                        <button key={s} onClick={() => set({ ...tm, color: s })}
                          style={{ width: 38, height: 38, borderRadius: 10, border: "none", background: s, cursor: "pointer", outline: tm.color === s ? "3px solid #1B2A22" : "none", outlineOffset: 2 }} />
                      ))}
                    </div>
                  </>
                )}
                {tm.kind === "emoji" && (
                  <>
                    <div className="lab">Pick an emoji</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {EMOJI.map((e) => (
                        <button key={e} onClick={() => set({ ...tm, emoji: e })}
                          style={{ width: 40, height: 40, fontSize: 21, borderRadius: 10, cursor: "pointer",
                            border: tm.emoji === e ? "2px solid #3E9D6C" : "1px solid var(--line)", background: tm.emoji === e ? "#E9F6EF" : "#fff" }}>{e}</button>
                      ))}
                    </div>
                    <div className="lab" style={{ marginTop: 12 }}>Badge color</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                      {SWATCHES.map((s) => (
                        <button key={s} onClick={() => set({ ...tm, color: s })}
                          style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: s, cursor: "pointer", outline: tm.color === s ? "3px solid #1B2A22" : "none", outlineOffset: 2 }} />
                      ))}
                    </div>
                  </>
                )}
                {tm.kind === "logo" && (
                  <label className="btn ghost" style={{ display: "block", textAlign: "center", marginTop: 0, cursor: "pointer" }}>
                    {tm.logoUrl ? "✓ Logo added — tap to replace" : "⬆ Upload a logo / photo"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={onLogo(set, tm)} />
                  </label>
                )}
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
                    <input className="inp" type="number" inputMode="numeric" value={d.count}
                      onChange={(e) => setDay(i, { count: e.target.value === "" ? "" : Math.min(30, Math.max(0, +e.target.value || 0)) })}
                      onBlur={(e) => setDay(i, { count: Math.min(30, Math.max(1, +e.target.value || 1)) })} /></div>
                  <div style={{ flex: 1 }}><label className="lab">Points / hole</label>
                    <input className="inp" type="number" inputMode="numeric" value={d.pph}
                      onChange={(e) => setDay(i, { pph: e.target.value === "" ? "" : Math.min(10, Math.max(0, +e.target.value || 0)) })}
                      onBlur={(e) => setDay(i, { pph: Math.min(10, Math.max(1, +e.target.value || 1)) })} /></div>
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
