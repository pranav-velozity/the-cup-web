import { useEffect, useState, useCallback } from "react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { Bar, Spinner } from "../components.jsx";

const STATUS_COLOR = { unused: "#9A7A1F", claimed: "#2F8A5E", revoked: "#a8a399", pending: "#C77C2E", rejected: "#a8a399" };

export default function Admin() {
  const api = useApi();
  const { back, go } = useNav();
  const [passes, setPasses] = useState(null);
  const [minted, setMinted] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(null);
  const [freeForAll, setFreeForAll] = useState(null);

  const load = useCallback(async () => {
    try { setPasses(await api("/api/admin/gate-passes")); }
    catch (e) { setErr(e.message); setPasses([]); }
    try { const s = await api("/api/admin/settings"); setFreeForAll(s.freeForAll); }
    catch { /* ignore */ }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const toggleFFA = async () => {
    const next = !freeForAll;
    setFreeForAll(next);
    try { const s = await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ freeForAll: next }) }); setFreeForAll(s.freeForAll); }
    catch (e) { setErr(e.message); setFreeForAll(!next); }
  };

  const mint = async () => {
    try { const p = await api("/api/admin/gate-passes", { method: "POST", body: "{}" }); setMinted(p.code); load(); }
    catch (e) { setErr(e.message); }
  };
  const revoke = async (id) => {
    try { await api(`/api/admin/gate-passes/${id}/revoke`, { method: "POST", body: "{}" }); load(); }
    catch (e) { setErr(e.message); }
  };
  const decide = async (id, action) => {
    setBusy(id);
    try { await api(`/api/admin/gate-passes/${id}/${action}`, { method: "POST", body: "{}" }); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(null);
  };

  const pending = (passes || []).filter((p) => p.status === "pending");
  const rest = (passes || []).filter((p) => p.status !== "pending");

  return (
    <div className="screen">
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div className="h1">Gate passes</div>
        <p className="sub">Approve requests and mint passes. Each pass unlocks one tournament.</p>
        {err && <div className="ban err">{err}</div>}
        {minted && <div className="ban ok">New pass: <b style={{ letterSpacing: ".1em" }}>{minted}</b> — share it with an organizer.</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>Free for all</b>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              {freeForAll === null ? "…" : freeForAll
                ? "On — organizers get a code instantly, no approval."
                : "Off — every request needs your approval."}
            </p>
          </div>
          <button role="switch" aria-checked={!!freeForAll} onClick={toggleFFA} disabled={freeForAll === null}
            style={{ width: 50, height: 30, borderRadius: 15, border: "none", cursor: "pointer", flex: "0 0 auto",
              background: freeForAll ? "#2E7D5B" : "#cfd6cb", position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: freeForAll ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
          </button>
        </div>

        {pending.length > 0 && (
          <>
            <div className="lab" style={{ marginTop: 6 }}>Requests awaiting approval</div>
            {pending.map((p) => (
              <div key={p.id} style={{ border: "1px solid #EAD9A8", background: "#FBF6E8", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📨</span>
                  <b style={{ fontSize: 14.5 }}>{p.requested_by || "Someone"}</b>
                  <span className="muted" style={{ fontSize: 11.5, marginLeft: "auto" }}>wants to create a tournament</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <button className="btn grn" style={{ marginTop: 0, flex: 1 }} disabled={busy === p.id} onClick={() => decide(p.id, "approve")}>
                    {busy === p.id ? "…" : "✓ Approve"}
                  </button>
                  <button className="btn ghost" style={{ marginTop: 0, flex: 1 }} disabled={busy === p.id} onClick={() => decide(p.id, "reject")}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        <button className="btn grn" style={{ marginTop: pending.length ? 8 : 0 }} onClick={mint}>＋ Mint a gate pass</button>

        <div className="lab" style={{ marginTop: 18 }}>All passes</div>
        {passes === null ? <Spinner /> : rest.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No passes yet.</p>
        ) : rest.map((p) => {
          const openable = !!p.tournament_id;
          return (
            <div key={p.id} role={openable ? "button" : undefined}
              onClick={openable ? () => go("adminview", { code: p.tournament_code, entry: { tid: p.tournament_id } }) : undefined}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--line)", cursor: openable ? "pointer" : "default" }}>
              <b style={{ fontSize: 18, letterSpacing: ".1em" }}>{p.code}</b>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: STATUS_COLOR[p.status] }}>{p.status}</span>
              {p.requested_by && <span className="muted" style={{ fontSize: 12 }}>👤 {p.requested_by}</span>}
              {p.tournament_name && <span className="muted" style={{ fontSize: 12 }}>{p.tournament_name}</span>}
              {p.status === "unused" ? (
                <button className="btn ghost" style={{ marginLeft: "auto", width: "auto", padding: "5px 10px", fontSize: 12, marginTop: 0 }}
                  onClick={(e) => { e.stopPropagation(); revoke(p.id); }}>Revoke</button>
              ) : openable ? (
                <span style={{ marginLeft: "auto", color: "var(--mut)", fontSize: 18 }}>›</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
