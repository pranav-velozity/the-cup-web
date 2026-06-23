import { useState, useEffect } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { NavProvider, useNav } from "./store.jsx";
import { BottomNav } from "./components.jsx";
import { useApi } from "./api.js";
import Splash from "./screens/Splash.jsx";
import SignIn from "./screens/SignIn.jsx";
import Home from "./screens/Home.jsx";
import Create from "./screens/Create.jsx";
import Join from "./screens/Join.jsx";
import Admin from "./screens/Admin.jsx";
import Hub from "./screens/Hub.jsx";
import Roster from "./screens/Roster.jsx";
import Pairings from "./screens/Pairings.jsx";
import Board from "./screens/Board.jsx";
import Entry from "./screens/Entry.jsx";
import Notifications, { hasUnseen } from "./screens/Notifications.jsx";
import AdminView from "./screens/AdminView.jsx";
import Gallery from "./screens/Gallery.jsx";

function Shell() {
  const { screen, go, reset } = useNav();
  const { user } = useUser();
  const api = useApi();
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [unread, setUnread] = useState(false);

  // Keep the bottom-nav Alerts dot fresh; re-check whenever the screen changes
  // (so it clears after the feed is opened).
  useEffect(() => {
    api("/api/player/notifications").then((feed) => setUnread(hasUnseen(feed))).catch(() => {});
  }, [api, screen]);

  const screens = {
    home: <Home />, create: <Create />, join: <Join />, admin: <Admin />,
    hub: <Hub />, roster: <Roster />, pairings: <Pairings />,
    board: <Board />, entry: <Entry />, notifs: <Notifications />,
    adminview: <AdminView />, gallery: <Gallery />,
  };
  const showNav = ["home", "hub", "board"].includes(screen);

  return (
    <div className="phone">
      <div className="screen">{screens[screen] || <Home />}</div>
      {showNav && (
        <BottomNav
          active={screen === "hub" ? "home" : screen}
          isAdmin={isAdmin}
          unread={unread}
          go={(key) => (key === "home" ? reset("home") : go(key))}
        />
      )}
    </div>
  );
}

export default function App() {
  const [splashed, setSplashed] = useState(false);

  // The animated splash plays on every cold load, before Clerk or any screen.
  if (!splashed) {
    return (
      <div className="phone-wrap">
        <Splash onDone={() => setSplashed(true)} />
      </div>
    );
  }

  return (
    <div className="phone-wrap">
      <SignedOut>
        <div className="phone"><SignIn /></div>
      </SignedOut>
      <SignedIn>
        <NavProvider><Shell /></NavProvider>
      </SignedIn>
    </div>
  );
}
