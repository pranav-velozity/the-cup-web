import { useState } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { useUser } from "@clerk/clerk-react";
import { Bar } from "../components.jsx";

export default function Join() {
  const api = useApi();
  const { back, go } = useNav();
  const { user } = useUser();
  const [code, setCode] = useState("");
  const [name, setName] = useState(user?.firstName || "");
  const [err, setErr] = useState(null);
  const [diag, setDiag] = useState(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true); setErr(null); setDiag(null);
    try {
      const res = await api("/api/player/join", {
        method: "POST",
        body: JSON.stringify({ code, name: name.trim() }),
      });
      go("board", { code: res.tournament.code });
    } catch (e) {
      setErr(e.message);
      // Pull a diagnosis so we can see exactly why it didn't match.
      try { setDiag(await api(`/api/player/diagnose?code=${code}`)); } catch {}
    }
    setBusy(false);
  };

  return (
    <div className="screen">
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div className="h1">Join a tournament</div>
        <p className="sub">Enter the code your organizer shared. Your phone number needs to be on the roster.</p>
        {err && <div className="ban err">{err}</div>}

        {diag && (
          <div style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12.5 }}>
            <div className="lab" style={{ marginBottom: 6 }}>Why this didn't work</div>
            <div>We see your number as <b>{diag.yourPhone || "— none on your account —"}</b>.</div>
            {!diag.tournamentFound
              ? <div style={{ marginTop: 4 }}>No tournament found for code <b>{code}</b>.</div>
              : <div style={{ marginTop: 4 }}>The roster for <b>{diag.tournamentName}</b> has <b>{diag.rosterCount}</b> number(s){diag.matched ? "" : ", and none match yours"}. Ask your organizer to add <b>{diag.yourPhone}</b> exactly.</div>}
          </div>
        )}

        <div className="field"><label className="lab">Tournament code</label>
          <input className="inp code" maxLength={5} placeholder="00000"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
        <div className="field"><label className="lab">Your name</label>
          <input className="inp" placeholder="e.g. Dave Chen" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <button className="btn grn" onClick={join} disabled={busy || code.length !== 5}>{busy ? "Joining…" : "Join ›"}</button>
      </div>
    </div>
  );
}
