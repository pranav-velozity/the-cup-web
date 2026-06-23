import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import { T } from "./theme.js";
import "./index.css";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!pk) {
  document.getElementById("root").innerHTML =
    '<div style="font-family:Outfit,sans-serif;padding:40px;color:#1B2A22">Missing VITE_CLERK_PUBLISHABLE_KEY — set it in your environment.</div>';
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Clerk components themed to the TOTO light identity (green primary,
// cream surfaces, Outfit). Used for the phone-OTP sign-in.
const appearance = {
  variables: {
    colorPrimary: T.green,
    colorBackground: "#FFFFFF",
    colorText: T.ink,
    colorTextSecondary: T.mut,
    colorInputBackground: "#FFFFFF",
    colorInputText: T.ink,
    borderRadius: "12px",
    fontFamily: "'Outfit', system-ui, sans-serif",
  },
  elements: {
    card: { background: "#FFFFFF", border: `1px solid ${T.line}`, boxShadow: "none" },
    formButtonPrimary: { fontWeight: 800, fontSize: "15px" },
    footer: { display: "none" },
  },
};

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={pk} appearance={appearance} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);

// Register the service worker (PWA install + offline shell + push).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Re-check for a new version whenever the app is reopened/focused —
      // important for installed PWAs (esp. iOS) that stay "open" for days.
      const check = () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); };
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      setInterval(check, 60 * 60 * 1000);
    }).catch(() => {});

    // When a new service worker takes control, reload once so the fresh
    // assets are actually shown (no more "close all tabs" dance).
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
