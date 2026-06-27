import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { useLiveBoard } from "../lib/useSocket.js";
import { usePullToRefresh, pullIndicatorStyle } from "../lib/usePullToRefresh.js";
import { Bar, Avatar, Spinner } from "../components.jsx";

export default function Board() {
  const api = useApi();
  const { user } = useUser();
  const { code, go, back } = useNav();
  const [board, setBoard] = useState(null);
  const [view, setView] = useState("tile");
  const [flash, setFlash] = useState({});
  const prevScores = useRef({});
  const mineRef = useRef({ yourMatchIds: [], canScoreAll: false });

  const applyBoard = useCallback((b) => {
    // Live socket broadcasts are per-tournament and don't carry the per-user
    // fields the initial fetch does — carry them forward so the "your match"
    // pill doesn't flicker out on every update.
    if (b.yourMatchIds !== undefined) mineRef.current.yourMatchIds = b.yourMatchIds;
    else b.yourMatchIds = mineRef.current.yourMatchIds;
    if (b.canScoreAll !== undefined) mineRef.current.canScoreAll = b.canScoreAll;
    else b.canScoreAll = mineRef.current.canScoreAll;

    // Detect which matches changed score -> flash them once.
    const f = {};
    for (const m of b.matches) {
      const key = m.id;
      const sig = `${m.a}-${m.b}`;
      if (prevScores.current[key] && prevScores.current[key] !== sig) f[key] = true;
      prevScores.current[key] = sig;
    }
    if (Object.keys(f).length) {
      setFlash(f);
      setTimeout(() => setFlash({}), 950);
    }
    setBoard(b);
  }, []);

  const load = useCallback(() => {
    return api(`/api/score/${code}/board`).then(applyBoard).catch(() => {});
  }, [api, code, applyBoard]);

  useEffect(() => { load(); }, [load]);
  useLiveBoard(code, { onBoard: applyBoard });
  const ptr = usePullToRefresh(load);

  if (!board) return (<div className="screen"><Bar title="Tournament" onBack={back} /><Spinner /></div>);

  const A = board.teamA, B = board.teamB;

  // "Your match" quick-link: prefer an unfinished match the user is in.
  const mineIds = board.yourMatchIds || [];
  let mine = board.matches.find((m) => mineIds.includes(m.id) && !m.done)
    || board.matches.find((m) => mineIds.includes(m.id));
  // Stroke-diff matches aren't in board.matches; fall back to a stroke pair.
  if (!mine) {
    for (const sd of board.strokeDays || []) {
      const p = sd.pairs.find((x) => mineIds.includes(x.matchId));
      if (p) { mine = { id: p.matchId, holes: [] }; break; }
    }
  }
  const first = user?.firstName;
  const teamA = { name: A.name, color: A.color, emoji: A.emoji, kind: A.kind, logoUrl: A.logoUrl };
  const teamB = { name: B.name, color: B.color, emoji: B.emoji, kind: B.kind, logoUrl: B.logoUrl };
  const labels = { tight: "TIGHT", tied: "TIED", ahead: "AHEAD", final: "FINAL" };

  // Which side leads the match (by holes won), with display fields oriented
  // leader-first. null => all square.
  const leadInfo = (m) => {
    if (m.a === m.b) return null;
    const side = m.a > m.b ? "A" : "B";
    return {
      side,
      team: side === "A" ? teamA : teamB,
      topName: side === "A" ? m.nameA : m.nameB,
      topColor: side === "A" ? A.color : B.color,
      topPts: side === "A" ? m.pointsA : m.pointsB,
      botName: side === "A" ? m.nameB : m.nameA,
      botColor: side === "A" ? B.color : A.color,
      botPts: side === "A" ? m.pointsB : m.pointsA,
    };
  };

  const tile = (m) => {
    const L = leadInfo(m);
    const live = !m.done && m.played > 0;
    const topName = L ? L.topName : m.nameA, topColor = L ? L.topColor : A.color;
    const botName = L ? L.botName : m.nameB, botColor = L ? L.botColor : B.color;
    const leftPts = L ? L.topPts : m.pointsA, rightPts = L ? L.botPts : m.pointsB;
    return (
      <div key={m.id} className={`mtile${flash[m.id] ? " justchanged" : ""}`}
        onClick={() => go("entry", { code, entry: { matchId: m.id, hole: nextHole(m.holes) } })}>
        <div className="tlead">
          <div className="tlead-team">
            {L ? (<><Avatar team={L.team} size={20} /><span className="tlead-name" style={{ color: L.topColor }}>{L.team.name}</span></>)
              : <span className="tlead-name" style={{ color: "var(--mut)" }}>{m.done ? "Halved" : "All square"}</span>}
          </div>
          <div className="tlead-stat">
            {live && <span className="livedot" title="Live" />}
            <span className={`tstat-in${m.status === "tight" ? " breathe" : ""}`}>{labels[m.status]}</span>
          </div>
        </div>
        <div className="tilescore">
          <div className="tnameT" style={{ color: topColor, fontWeight: 700 }}>{topName}</div>
          <div className={`tnum${flash[m.id] ? " numrefresh" : ""}`}>{leftPts}–{rightPts}</div>
          <div className="tnameT" style={{ color: botColor, fontWeight: 600 }}>{botName}</div>
        </div>
        <div className="tmeta">
          Day {m.dayIndex + 1} · {m.format === "scramble" ? "Scramble" : "Singles"}
          {m.done ? " · done" : ` · thru ${m.played}`}
        </div>
        {m.hot && <span className="hot" style={{ position: "absolute", bottom: 7, right: 8, fontSize: 9 }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%",
            background: m.hot === "A" ? A.color : B.color, marginRight: 4, verticalAlign: 1 }} />HOT</span>}
      </div>
    );
  };

  const row = (m) => {
    const L = leadInfo(m);
    const live = !m.done && m.played > 0;
    const leftName = L ? L.topName : m.nameA, leftColor = L ? L.topColor : A.color, leftPts = L ? L.topPts : m.pointsA;
    const rightName = L ? L.botName : m.nameB, rightColor = L ? L.botColor : B.color, rightPts = L ? L.botPts : m.pointsB;
    return (
      <div key={m.id} className={`mcard${flash[m.id] ? " justchanged" : ""}`}
        onClick={() => go("entry", { code, entry: { matchId: m.id, hole: nextHole(m.holes) } })}>
        <div className={`spine s-${m.status}`}>{labels[m.status]}</div>
        <div className="mbody">
          <div className="mlead">
            {L ? (<><Avatar team={L.team} size={16} /><span style={{ color: L.topColor, fontWeight: 800, fontSize: 11.5 }}>{L.team.name} leads</span></>)
              : <span className="muted" style={{ fontSize: 11.5, fontWeight: 700 }}>{m.done ? "Halved" : "All square"}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 13.5, color: leftColor, fontWeight: 700 }}>{leftName}</span>
            <b className={flash[m.id] ? "numrefresh" : ""} style={{ fontSize: 17 }}>{leftPts}–{rightPts}</b>
            <span style={{ flex: 1, textAlign: "right", fontSize: 13.5, color: rightColor, fontWeight: 500 }}>{rightName}</span>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 4, textAlign: "center" }}>
            Day {m.dayIndex + 1} · {m.format === "scramble" ? "Scramble" : "Singles"}{m.done ? " · done" : ` · thru ${m.played}`}
          </div>
        </div>
        {live && <span className="livedot" title="Live" style={{ position: "absolute", top: 9, right: 9 }} />}
      </div>
    );
  };

  // Stroke-diff day: team totals + the moving "Leading" pill + ranked pairs.
  const strokeCard = (sd) => {
    const leadTeam = sd.leader === "A" ? A : sd.leader === "B" ? B : null;
    const leadColor = sd.leader === "A" ? A.color : sd.leader === "B" ? B.color : "var(--mut)";
    return (
      <div key={`sd${sd.dayIndex}`} className="strokecard">
        <div className="strokehead">
          <div>
            <b style={{ fontSize: 14 }}>Day {sd.dayIndex + 1} · Stroke play</b>
            <div className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
              {sd.locked ? "Final" : sd.provisional ? <><span className="livedot" />Live</> : "Not started"}
            </div>
          </div>
          <div style={{ fontSize: 20 }}>
            <span style={{ color: A.color, fontWeight: 800 }}>{sd.teamATotal}</span>
            <span className="muted" style={{ margin: "0 6px" }}>–</span>
            <span style={{ color: B.color, fontWeight: 800 }}>{sd.teamBTotal}</span>
          </div>
        </div>

        <div className="leadwrap">
          {sd.leader ? (
            <div className="leadpill" style={{ transform: sd.leader === "B" ? "translateX(115%)" : "translateX(0)", background: leadColor }}>
              <span className="leaddot" /> {leadTeam.name} leading +{sd.diff}
            </div>
          ) : (
            <div className="leadpill flat">{sd.provisional ? "All square" : "Waiting for scores"}</div>
          )}
        </div>

        <div className="pairlist">
          {sd.pairs.map((p, i) => (
            <div key={p.matchId + p.side} className="pairrow"
              onClick={() => go("entry", { code, entry: { matchId: p.matchId } })}>
              <span className="pairrank">{p.thru > 0 ? i + 1 : "·"}</span>
              <span className="pairdot" style={{ background: p.side === "A" ? A.color : B.color }} />
              <span className="pairname" style={{ color: p.side === "A" ? A.color : B.color }}>{p.name}</span>
              <span className="muted" style={{ fontSize: 11.5 }}>{p.thru ? `thru ${p.thru}` : "—"}</span>
              <b style={{ fontSize: 18, minWidth: 26, textAlign: "right" }}>{p.thru ? p.total : "–"}</b>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="screen" ref={ptr.ref} {...ptr.handlers}>
      <div style={pullIndicatorStyle(ptr.pull, ptr.refreshing)}>
        <span style={{ fontSize: 20, transform: ptr.refreshing ? "none" : `rotate(${ptr.pull * 3}deg)`, animation: ptr.refreshing ? "spin .8s linear infinite" : "none" }}>↻</span>
      </div>
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="h1">Live board</div>
            <p className="sub" style={{ display: "flex", alignItems: "center", gap: 7, margin: 0 }}>
              {board.live ? <><span className="livedot" /><span style={{ color: "#16A34A", fontWeight: 700, fontSize: 11.5, letterSpacing: ".12em" }}>LIVE</span></>
                : <span style={{ color: "var(--mut)", fontWeight: 700, fontSize: 11.5, letterSpacing: ".12em" }}>FINAL</span>}
            </p>
          </div>
          {mine && (
            <button className="mpill" style={{ marginTop: 2, flex: "0 0 auto" }}
              onClick={() => go("entry", { code, entry: { matchId: mine.id, hole: nextHole(mine.holes) } })}>
              <span className="livedot" style={{ marginRight: 7 }} />
              {first ? `${first}'s match` : "Your match"}
              <span style={{ opacity: .55, fontSize: 16, marginLeft: 3 }}>›</span>
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6 }}>
          <div className="crestwrap"><Avatar team={teamA} size={44} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>{A.name}</div>
            <div className="bigpts" style={{ color: A.color }}>{A.points}</div></div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{board.holesPlayed}</div>
            <div className="muted" style={{ fontSize: 11 }}>holes played</div>
            <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600, marginTop: 3 }}>{board.holesLeft} to play</div></div>
          <div className="crestwrap"><Avatar team={teamB} size={44} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>{B.name}</div>
            <div className="bigpts" style={{ color: B.color }}>{B.points}</div></div>
        </div>
        <div className="tug">
          <div style={{ width: `${board.aShare}%`, background: A.color }} />
          <div style={{ width: `${100 - board.aShare}%`, background: B.color }} />
        </div>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>{board.leadText}</div>

        {board.last9?.length > 0 && (
          <div className="form9">
            <span className="form9lab">LAST 9</span>
            <div className="form9cells">
              {Array.from({ length: 9 }).map((_, i) => {
                const pad = 9 - board.last9.length;
                const e = i >= pad ? board.last9[i - pad] : null;
                const bg = e === "A" ? A.color : e === "B" ? B.color : e === "T" ? "#C4CABD" : null;
                return <span key={i} className={`f9${bg ? "" : " empty"}`} style={bg ? { background: bg } : {}} />;
              })}
            </div>
          </div>
        )}

        {board.strokeDays?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lab" style={{ marginBottom: 9 }}>Stroke play</div>
            {board.strokeDays.map(strokeCard)}
          </div>
        )}

        {board.matches.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginTop: 14, marginBottom: 9 }}>
              <div className="lab" style={{ margin: 0 }}>Matches</div>
              <div style={{ marginLeft: "auto" }}>
                <div className="viewtog">
                  <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                  </button>
                  <button className={view === "tile" ? "on" : ""} onClick={() => setView("tile")}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {view === "tile"
              ? <div className="tilegrid">{board.matches.map(tile)}</div>
              : board.matches.map(row)}
          </>
        )}
      </div>
    </div>
  );
}

function nextHole(holes) {
  const i = (holes || []).indexOf(null);
  return i < 0 ? 17 : i;
}
