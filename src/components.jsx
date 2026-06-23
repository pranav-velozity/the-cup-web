import { T } from "./theme.js";

export function Avatar({ team, size = 44 }) {
  const bg = team?.color || T.teamA;
  const kind = team?.kind || "crest";
  const logo = team?.logoUrl || team?.logo_url;
  const initials = (team?.name || "T")
    .split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="crest" style={{ width: size, height: size, background: bg, fontSize: size * 0.34, overflow: "hidden" }}>
      {kind === "logo" && logo
        ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : kind === "emoji" && team?.emoji
        ? <span style={{ fontSize: size * 0.5 }}>{team.emoji}</span>
        : initials}
    </div>
  );
}

export function Bar({ title, onBack }) {
  return (
    <div className="bar">
      {onBack ? (
        <button className="back" onClick={onBack}>‹ {title || "Back"}</button>
      ) : (
        <span style={{ fontWeight: 700 }}>{title}</span>
      )}
      <img src="/icons/logo.png" alt="TOTO" className="barlogo" />
    </div>
  );
}

const IC = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  create: <path d="M12 5v14M5 12h14" />,
  play: <path d="M8 5v14l11-7z" />,
  admin: <path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  gallery: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="M21 15l-5-5L5 21" /></>,
};

export function BottomNav({ active, go, isAdmin, unread }) {
  const item = (key, label, path, dot) => (
    <button className={`navbtn${active === key ? " on" : ""}`} onClick={() => go(key)}>
      <span style={{ position: "relative", display: "flex" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">{path}</svg>
        {dot && <span style={{ position: "absolute", top: -2, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#D9534F", border: "1.5px solid #fff" }} />}
      </span>
      <span>{label}</span>
    </button>
  );
  return (
    <div className="bottomnav">
      {item("home", "Home", IC.home)}
      {item("create", "Create", IC.create)}
      {item("join", "Play", IC.play)}
      {item("notifs", "Alerts", IC.bell, unread)}
      {isAdmin && item("admin", "Admin", IC.admin)}
    </div>
  );
}

export function Splash({ onDone }) {
  return (
    <div className="splash" onAnimationEnd={onDone}>
      <div className="sp-word">TOTO</div>
      <div className="sp-tag">
        <span className="c">Compete… </span>
        <span className="d">मगर प्यार से</span>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="center" style={{ padding: 50 }}><div className="spin" /></div>;
}
