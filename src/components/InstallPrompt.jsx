import { useEffect, useState } from "react";

const DISMISS = "toto-install-dismissed";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS) === "1") return;
    if (isIOS()) { setIos(true); setShow(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => { localStorage.setItem(DISMISS, "1"); setShow(false); };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null); setShow(false);
  };

  return (
    <div style={{ background: "#FBF1D8", border: "1px solid #EBD9A6", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/icons/icon-192.png" alt="" width="34" height="34" style={{ borderRadius: 9 }} />
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 13.5 }}>Add TOTO to your home screen</b>
          <div style={{ fontSize: 12, color: "#7a5b18", marginTop: 1 }}>
            {ios ? "Tap the Share icon, then \u201CAdd to Home Screen.\u201D" : "Launch it like an app, full-screen."}
          </div>
        </div>
        {!ios && <button className="btn grn" style={{ width: "auto", marginTop: 0, padding: "8px 14px", fontSize: 13 }} onClick={install}>Add</button>}
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: "none", border: "none", fontSize: 18, color: "#9a8a5a", cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}
