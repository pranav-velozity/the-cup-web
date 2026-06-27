import { useEffect, useState, useCallback, useRef } from "react";
import { useApi, useScoreApi } from "../api.js";
import { Bar, Avatar, Spinner } from "../components.jsx";
import { enqueue, flush, pendingCount } from "../lib/outbox.js";
import { playTap } from "../lib/sound.js";

const NUMS = [2, 3, 4, 5, 6, 7, 8];

// Stroke-differential entry: each pair records its own scramble strokes,
// two taps per hole (pick hole → pick number). Per-pair scoped.
export default function StrokeEntry({ code, matchId, back }) {
  const api = useApi();
  const score = useScoreApi();
  const [board, setBoard] = useState(null);
  const [side, setSide] = useState(null);     // which pair we're entering (A/B)
  const [strokes, setStrokes] = useState(null); // local optimistic array for `side`
  const [sel, setSel] = useState(0);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const stripRef = useRef(null);

  const sdayOf = (b) => (b?.strokeDays || []).find((d) => d.pairs.some((p) => p.matchId === matchId));
  const pairFor = (b, sd, sideWanted) => sd?.pairs.find((p) => p.matchId === matchId && p.side === sideWanted);

  const loadBoard = useCallback(async () => {
    try {
      const b = await api(`/api/score/${code}/board`);
      setBoard(b);
      const sd = sdayOf(b);
      const mySide = b.canScoreAll ? (side || "A") : (b.yourSides || {})[matchId] || null;
      if (side === null) setSide(mySide);
      if (strokes === null && sd) {
        const p = pairFor(b, sd, mySide || "A");
        setStrokes((p?.holes || new Array(18).fill(null)).slice());
      }
    } catch { /* offline: keep local */ }
  }, [api, code, matchId, side, strokes]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const trySync = useCallback(async () => {
    try { await flush(score.batch); setPending(await pendingCount()); loadBoard(); }
    catch { setPending(await pendingCount()); }
  }, [score, loadBoard]);

  useEffect(() => {
    const on = () => { setOnline(true); trySync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    pendingCount().then(setPending);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [trySync]);

  useEffect(() => {
    const el = stripRef.current?.children[sel];
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [sel]);

  if (!board || strokes === null) return (<div className="screen"><Bar title="Board" onBack={back} /><Spinner /></div>);

  const sd = sdayOf(board);
  if (!sd) return (<div className="screen"><Bar title="Board" onBack={back} /><div className="pad"><div className="ban err">Match not found.</div></div></div>);

  const A = board.teamA, B = board.teamB;
  const pairA = pairFor(board, sd, "A"), pairB = pairFor(board, sd, "B");
  const mePair = side === "B" ? pairB : pairA;
  const editable = !!(board.canScoreAll || ((board.yourSides || {})[matchId] === side && side));

  // Local running total for the side being entered (optimistic).
  const myTotal = strokes.reduce((n, v) => n + (v != null ? v : 0), 0);
  const myThru = strokes.filter((v) => v != null).length;

  // Switch which pair the organizer is entering for.
  const switchSide = (s) => {
    if (s === side) return;
    setSide(s);
    const p = pairFor(board, sd, s);
    setStrokes((p?.holes || new Array(18).fill(null)).slice());
    setSel(0);
  };

  const writeNum = async (n) => {
    if (!editable) return;
    const next = strokes.slice();
    next[sel] = next[sel] === n ? null : n;  // tap same number to clear
    setStrokes(next);
    playTap();
    if (next[sel] != null && sel < 17) setSel(sel + 1);
    const clientTs = new Date().toISOString();
    await enqueue({ matchId, hole: sel + 1, side, strokes: next[sel], clientTs });
    setPending(await pendingCount());
    if (navigator.onLine) trySync();
  };

  const bump = async () => {            // "+" for scores above 8
    if (!editable) return;
    const cur = strokes[sel] != null ? strokes[sel] : 8;
    await writeNumValue(Math.min(30, cur + 1));
  };
  const writeNumValue = async (n) => {
    const next = strokes.slice();
    next[sel] = n;
    setStrokes(next);
    playTap();
    const clientTs = new Date().toISOString();
    await enqueue({ matchId, hole: sel + 1, side, strokes: n, clientTs });
    setPending(await pendingCount());
    if (navigator.onLine) trySync();
  };

  const meColor = side === "B" ? B.color : A.color;
  const leadTeam = sd.leader === "A" ? A : sd.leader === "B" ? B : null;

  return (
    <div className="screen">
      <Bar title="Board" onBack={back} />
      <div className="pad">
        <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
          Day {sd.dayIndex + 1} · Scramble (stroke play)
        </div>

        {!online && <div className="offline" style={{ marginTop: 10 }}>📡 Offline — saved on your phone, will sync. {pending} waiting.</div>}
        {online && pending > 0 && <div className="offline" style={{ marginTop: 10 }}>Syncing {pending}…</div>}
        {!editable && (
          <div className="ban" style={{ marginTop: 10, background: "#EEF1EC", color: "#5a6b5f" }}>
            👀 View only — only this pair (or the organizer) can enter its score.
          </div>
        )}

        {/* organizer can pick which pair to enter */}
        {board.canScoreAll && (
          <div style={{ display: "flex", gap: 8, margin: "12px 0 4px" }}>
            {[["A", pairA, A], ["B", pairB, B]].map(([s, p, tm]) => (
              <button key={s} onClick={() => switchSide(s)}
                style={{ flex: 1, padding: "9px 8px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
                  border: `1.5px solid ${side === s ? tm.color : "var(--line)"}`,
                  background: side === s ? tm.color : "#fff", color: side === s ? "#fff" : "var(--ink)" }}>
                {shortName(p?.name) || tm.name}
              </button>
            ))}
          </div>
        )}

        {/* who you're entering for */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 4px" }}>
          <Avatar team={{ name: side === "B" ? B.name : A.name, color: meColor }} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: meColor }}>{mePair?.name || (side === "B" ? B.name : A.name)}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>your pair · {myThru}/18 holes in</div>
          </div>
          <b style={{ fontSize: 30 }}>{myTotal || "–"}</b>
        </div>

        {/* hole strip showing this pair's strokes */}
        <div className="timeline" ref={stripRef}>
          {strokes.map((v, i) => (
            <div key={i} className={`cell${i === sel ? " sel" : ""}`} onClick={() => setSel(i)}
              style={{ background: v != null ? meColor : "#fff", color: v != null ? "#fff" : "#c2c8ba", borderColor: v != null ? meColor : "var(--line)" }}>
              {v != null ? v : i + 1}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontWeight: 800, fontSize: 18, margin: "6px 0 10px" }}>Hole {sel + 1}</div>

        {/* number row replaces the A / Tie / B buttons */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", opacity: editable ? 1 : .4, pointerEvents: editable ? "auto" : "none" }}>
          {NUMS.map((n) => (
            <button key={n} onClick={() => writeNum(n)} disabled={!editable}
              style={{ width: 42, height: 50, borderRadius: 12, fontSize: 19, fontWeight: 800, cursor: "pointer",
                border: `1.5px solid ${strokes[sel] === n ? meColor : "var(--line)"}`,
                background: strokes[sel] === n ? meColor : "#fff", color: strokes[sel] === n ? "#fff" : "var(--ink)" }}>
              {n}
            </button>
          ))}
          <button onClick={bump} disabled={!editable} title="Higher score"
            style={{ width: 42, height: 50, borderRadius: 12, fontSize: 19, fontWeight: 800, cursor: "pointer",
              border: "1.5px solid var(--line)", background: "#fff", color: "var(--mut)" }}>+</button>
        </div>
        <div className="help" style={{ textAlign: "center", marginTop: 10 }}>
          {editable ? "Pick the hole, then tap the score — it jumps to the next hole. Tap the same number to clear." :
            "You can follow live, but only this pair (or the organizer) enters its score."}
        </div>

        {/* team scoreboard for this day */}
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 14, textAlign: "center" }}>
          <div className="lab">Team totals (lower wins)</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontWeight: 600 }}>{A.name}</span>
            <b style={{ color: A.color, fontSize: 26 }}>{sd.teamATotal}</b>
            <span className="muted">–</span>
            <b style={{ color: B.color, fontSize: 26 }}>{sd.teamBTotal}</b>
            <span style={{ fontWeight: 600 }}>{B.name}</span>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            {leadTeam ? `${leadTeam.name} ahead by ${sd.diff}${sd.locked ? " · final" : " · live"}` : "All square"}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortName(n) { return (n || "").split(/[ &]/)[0]; }
