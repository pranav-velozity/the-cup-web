import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useApi } from "../api.js";
import { useNav } from "../store.jsx";
import { useLiveBoard } from "../lib/useSocket.js";
import { usePullToRefresh, pullIndicatorStyle } from "../lib/usePullToRefresh.js";
import { Bar, Avatar, Spinner } from "../components.jsx";

// Small inline icon set for day headers + the view toggle.
const ICONS = {
  match: <path d="M4 12l5-4v8zM20 12l-5-4v8zM10 12h4" />,        // two sides head-to-head
  stroke: <path d="M7 21V4M7 4h10l-3 3.5L17 11H7" />,            // flag (stroke play)
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  tile: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
};
const Ico = ({ d, size = 16, sw = 2 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export default function Board() {
  const api = useApi();
  const { user } = useUser();
  const { code, go, back } = useNav();
  const [board, setBoard] = useState(null);
  const [view, setView] = useState("tile");
  const [openPairs, setOpenPairs] = useState({}); // dayIndex -> show idle pairs
  const [activeDay, setActiveDay] = useState(null);
  const [drag, setDrag] = useState(0);            // live horizontal swipe offset
  const [tickerNew, setTickerNew] = useState(null);
  const touch = useRef(null);
  const prevTop = useRef(null);
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

    // New ticker headline -> slide it in on top.
    const top = b.ticker?.[0]?.id;
    if (top && prevTop.current && top !== prevTop.current) {
      setTickerNew(top);
      setTimeout(() => setTickerNew(null), 1300);
    }
    prevTop.current = top;

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

  // ---- stroke-day pieces (respect the global tile/list toggle) ----
  const pairRow = (p, rank) => (
    <div key={p.matchId + p.side} className="pairrow"
      onClick={() => go("entry", { code, entry: { matchId: p.matchId } })}>
      <span className="pairrank">{p.thru > 0 ? rank : "·"}</span>
      <span className="pairdot" style={{ background: p.side === "A" ? A.color : B.color }} />
      <span className="pairname" style={{ color: p.side === "A" ? A.color : B.color }}>{p.name}</span>
      <span className="muted" style={{ fontSize: 11.5 }}>{p.thru ? `thru ${p.thru}` : "—"}</span>
      <b style={{ fontSize: 18, minWidth: 26, textAlign: "right" }}>{p.thru ? p.total : "–"}</b>
    </div>
  );
  const pairTile = (p, rank) => (
    <div key={p.matchId + p.side} className="ptile"
      onClick={() => go("entry", { code, entry: { matchId: p.matchId } })}>
      <div className="ptile-top">
        <span className="pairrank">{p.thru > 0 ? rank : "·"}</span>
        <span className="pairdot" style={{ background: p.side === "A" ? A.color : B.color }} />
        <span className="ptile-name" style={{ color: p.side === "A" ? A.color : B.color }}>{p.name}</span>
      </div>
      <div className="ptile-bot">
        <b style={{ fontSize: 22 }}>{p.thru ? p.total : "–"}</b>
        <span className="muted" style={{ fontSize: 11 }}>{p.thru ? `thru ${p.thru}` : "—"}</span>
      </div>
    </div>
  );

  const strokeBlock = (sd) => {
    const played = sd.pairs.filter((p) => p.thru > 0);
    const idle = sd.pairs.filter((p) => p.thru === 0);
    const open = !!openPairs[sd.dayIndex];
    const renderSet = (arr, ranked) =>
      view === "tile"
        ? <div className="ptilegrid">{arr.map((p, i) => pairTile(p, ranked ? i + 1 : "·"))}</div>
        : <div className="pairlist">{arr.map((p, i) => pairRow(p, ranked ? i + 1 : "·"))}</div>;
    return (
      <>
        <div className="stroketote">
          <span style={{ color: A.color, fontWeight: 800 }}>{A.name} {sd.teamATotal}</span>
          <span className="muted" style={{ fontSize: 11 }}>combined strokes · lower wins</span>
          <span style={{ color: B.color, fontWeight: 800 }}>{sd.teamBTotal} {B.name}</span>
        </div>
        {played.length > 0 ? renderSet(played, true)
          : <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: "10px 0" }}>No scores in yet.</div>}
        {idle.length > 0 && (
          <>
            <button className="idletoggle" onClick={() => setOpenPairs((o) => ({ ...o, [sd.dayIndex]: !open }))}>
              {open ? "Hide pairs yet to tee off" : `${idle.length} pair${idle.length > 1 ? "s" : ""} yet to tee off`}
              <span style={{ marginLeft: 6 }}>{open ? "▴" : "▾"}</span>
            </button>
            {open && renderSet(idle, false)}
          </>
        )}
      </>
    );
  };

  // ---- merge match-play + stroke into one day-ordered list ----
  const dayMap = {};
  for (const m of board.matches) {
    const d = (dayMap[m.dayIndex] ||= { dayIndex: m.dayIndex, scoring: "match", format: m.format, matches: [], a: 0, b: 0, live: false, done: true });
    d.matches.push(m);
    d.a += m.pointsA; d.b += m.pointsB;
    d.format = m.format;
    if (!m.done && m.played > 0) d.live = true;
    if (!m.done) d.done = false;
  }
  for (const sd of board.strokeDays || []) {
    dayMap[sd.dayIndex] = {
      dayIndex: sd.dayIndex, scoring: "stroke", format: sd.format, stroke: sd,
      a: sd.teamATotal, b: sd.teamBTotal, leader: sd.leader, diff: sd.diff,
      live: sd.provisional, done: sd.locked,
    };
  }
  const dayList = Object.values(dayMap).sort((x, y) => x.dayIndex - y.dayIndex);

  const chipScore = (d) =>
    d.scoring === "stroke"
      ? (d.leader ? `${d.leader === "A" ? A.name : B.name} +${d.diff}` : "Level")
      : `${d.a}–${d.b}`;

  // Detail for one day — the pill above carries the score, so this is just the play.
  const dayDetail = (d) => (
    <div>
      <div className="daycontext">
        <span className="dayico" style={{ color: d.scoring === "stroke" ? B.color : A.color, borderColor: (d.scoring === "stroke" ? B.color : A.color) + "33" }}>
          <Ico d={ICONS[d.scoring === "stroke" ? "stroke" : "match"]} size={16} />
        </span>
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
          {d.scoring === "stroke" ? "Stroke play" : "Match play"} · {d.format === "scramble" ? "Scramble" : "Singles"}
          {d.scoring === "stroke" && !d.done && <span style={{ opacity: .8 }}> · locks when all pairs finish</span>}
        </span>
      </div>
      {d.scoring === "stroke" ? strokeBlock(d.stroke) : matchSet(d)}
    </div>
  );

  // Match-play set with not-started matches collapsed (keeps the live ones up top).
  const matchSet = (d) => {
    const playing = d.matches.filter((m) => m.played > 0 || m.done);
    const idle = d.matches.filter((m) => m.played === 0 && !m.done);
    const open = !!openPairs[`m${d.dayIndex}`];
    const render = (arr) => view === "tile" ? <div className="tilegrid">{arr.map(tile)}</div> : <div>{arr.map(row)}</div>;
    return (
      <>
        {playing.length > 0 ? render(playing)
          : <div className="muted" style={{ fontSize: 12.5, textAlign: "center", padding: "10px 0" }}>No matches under way yet.</div>}
        {idle.length > 0 && (
          <>
            <button className="idletoggle" onClick={() => setOpenPairs((o) => ({ ...o, [`m${d.dayIndex}`]: !open }))}>
              {open ? "Hide matches not started" : `${idle.length} match${idle.length > 1 ? "es" : ""} still to start`}
              <span style={{ marginLeft: 6 }}>{open ? "▴" : "▾"}</span>
            </button>
            {open && render(idle)}
          </>
        )}
      </>
    );
  };

  // Resolve which single day is on screen (default: the live one).
  const liveDefault = (dayList.find((d) => d.live) || dayList[dayList.length - 1])?.dayIndex ?? 0;
  const active = (activeDay != null && dayList.some((d) => d.dayIndex === activeDay)) ? activeDay : liveDefault;
  const activeIdx = Math.max(0, dayList.findIndex((d) => d.dayIndex === active));
  const activeD = dayList[activeIdx];
  const goDay = (delta) => {
    const ni = Math.min(dayList.length - 1, Math.max(0, activeIdx + delta));
    if (ni !== activeIdx) setActiveDay(dayList[ni].dayIndex);
  };

  // Horizontal swipe across the detail = change day (touch-action:pan-y keeps
  // vertical scroll free, so no preventDefault needed).
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, dx: 0, axis: null }; };
  const onTouchMove = (e) => {
    if (!touch.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    if (!touch.current.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) touch.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (touch.current.axis === "x") {
      touch.current.dx = dx;
      const end = (activeIdx === 0 && dx > 0) || (activeIdx === dayList.length - 1 && dx < 0);
      setDrag(end ? dx * 0.3 : dx);
    }
  };
  const onTouchEnd = () => {
    if (touch.current?.axis === "x") {
      if (touch.current.dx < -55) goDay(1);
      else if (touch.current.dx > 55) goDay(-1);
    }
    touch.current = null;
    setDrag(0);
  };

  return (
    <div className="screen" ref={ptr.ref} {...ptr.handlers}>
      <div style={pullIndicatorStyle(ptr.pull, ptr.refreshing)}>
        <span style={{ fontSize: 20, transform: ptr.refreshing ? "none" : `rotate(${ptr.pull * 3}deg)`, animation: ptr.refreshing ? "spin .8s linear infinite" : "none" }}>↻</span>
      </div>
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <div className="h1" style={{ margin: 0 }}>Live board</div>
            {board.live
              ? <span className="livetag"><span className="livedot" />LIVE</span>
              : <span className="finaltag">FINAL</span>}
          </div>
          {mine && (
            <button className="mpill" style={{ flex: "0 0 auto" }}
              onClick={() => go("entry", { code, entry: { matchId: mine.id, hole: nextHole(mine.holes) } })}>
              <span className="livedot" style={{ marginRight: 7 }} />
              {first ? `${first}'s match` : "Your match"}
              <span style={{ opacity: .55, fontSize: 16, marginLeft: 3 }}>›</span>
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 6, marginTop: 12 }}>
          <div className="crestwrap"><Avatar team={teamA} size={44} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>{A.name}</div>
            <div className="bigpts" style={{ color: A.color }}>{A.points}</div></div>
          <div style={{ textAlign: "center", minWidth: 96 }}>
            {A.points === B.points
              ? <><div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>—</div><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>All square</div></>
              : <><div style={{ fontWeight: 900, fontSize: 30, lineHeight: 1, color: A.points > B.points ? A.color : B.color }}>+{Math.abs(A.points - B.points)}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{(A.points > B.points ? A.name : B.name)} lead</div></>}
            <div style={{ fontSize: 9.5, color: "var(--mut)", fontWeight: 700, letterSpacing: ".08em", marginTop: 3 }}>CUP · {board.holesPlayed} HOLES IN</div>
          </div>
          <div className="crestwrap"><Avatar team={teamB} size={44} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>{B.name}</div>
            <div className="bigpts" style={{ color: B.color }}>{B.points}</div></div>
        </div>
        <div className="tug">
          <div style={{ width: `${board.aShare}%`, background: A.color }} />
          <div style={{ width: `${100 - board.aShare}%`, background: B.color }} />
        </div>

        {/* live feed — newest slides in on top */}
        {board.ticker?.length > 0 && (
          <div className="ticker">
            {board.ticker.slice(0, 3).map((e) => (
              <div key={e.id} className={`tickrow${e.id === tickerNew ? " new" : ""}`}>
                <span className="tickdot" style={{ background: e.side === "A" ? A.color : e.side === "B" ? B.color : "#C4CABD" }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.text}</span>
                {e.hole != null && <span className="tickhole">H{e.hole}</span>}
              </div>
            ))}
          </div>
        )}

        {/* day switcher — equal pills, swipe the strip for 3+ days */}
        {dayList.length > 0 && (
          <div className="dayseg">
            {dayList.map((d) => (
              <button key={d.dayIndex} className={`segpill${d.dayIndex === active ? " on" : ""}`} onClick={() => setActiveDay(d.dayIndex)}>
                <span className="seg-d">Day {d.dayIndex + 1}</span>
                <span className="seg-s">{chipScore(d)}</span>
                {d.live && <span className="livedot" style={{ marginLeft: 6 }} />}
              </button>
            ))}
          </div>
        )}

        {/* the play — one day, swipe left/right to move between days */}
        {activeD && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginTop: 14, marginBottom: 4 }}>
              <div className="viewtog" style={{ marginLeft: "auto" }}>
                <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}><Ico d={ICONS.list} size={15} sw={2.2} /></button>
                <button className={view === "tile" ? "on" : ""} onClick={() => setView("tile")}><Ico d={ICONS.tile} size={15} sw={2.2} /></button>
              </div>
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ touchAction: "pan-y", transform: `translateX(${drag}px)`, transition: drag ? "none" : "transform .26s ease" }}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                {dayDetail(activeD)}
              </div>
            </div>
            {dayList.length > 1 && (
              <div className="swipehint">
                <span>{activeIdx > 0 ? `‹ Day ${dayList[activeIdx - 1].dayIndex + 1}` : ""}</span>
                <span className="swipedots">{dayList.map((d, i) => <span key={d.dayIndex} className={`sdot${i === activeIdx ? " on" : ""}`} />)}</span>
                <span>{activeIdx < dayList.length - 1 ? `Day ${dayList[activeIdx + 1].dayIndex + 1} ›` : ""}</span>
              </div>
            )}
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
