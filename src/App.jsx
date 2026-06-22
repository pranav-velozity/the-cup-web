import { useState } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { NavProvider, useNav } from "./store.jsx";
import { BottomNav } from "./components.jsx";
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

function Shell() {
  const { screen, go, reset } = useNav();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const screens = {
    home: <Home />, create: <Create />, join: <Join />, admin: <Admin />,
    hub: <Hub />, roster: <Roster />, pairings: <Pairings />,
    board: <Board />, entry: <Entry />,
  };

  const showNav = ["home", "hub", "board"].includes(screen);

  return (
    <div className="phone">
      <div className="screen">{screens[screen] || <Home />}</div>
      {showNav && (
        <BottomNav
          active={screen === "hub" ? "home" : screen}
          isAdmin={isAdmin}
          go={(key) => (key === "home" ? reset("home") : go(key))}
        />
      )}
    </div>
  );
}

export default function App() {
  const [splashed, setSplashed] = useState(false);
  return (
    <div className="phone-wrap">
      {!splashed && <SplashGate onDone={() => setSplashed(true)} />}
      <SignedOut>
        <div className="phone"><SignIn /></div>
      </SignedOut>
      <SignedIn>
        <NavProvider><Shell /></NavProvider>
      </SignedIn>
    </div>
  );
}

function SplashGate({ onDone }) {
  const [out, setOut] = useState(false);
  if (!out) setTimeout(() => setOut(true), 2200);
  return (
    <div className={`splash${out ? " out" : ""}`} onTransitionEnd={onDone}>
      <div className="sp-word">TOTO</div>
      <div className="sp-tag">
        <span className="c">Compete… </span>
        <span className="d">मगर प्यार से</span>
      </div>
    </div>
  );
}
