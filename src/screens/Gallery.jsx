import { Bar } from "../components.jsx";
import { useNav } from "../store.jsx";

export default function Gallery() {
  const { back } = useNav();
  return (
    <div className="screen">
      <Bar title="Home" onBack={back} />
      <div className="pad">
        <div className="h1">Gallery</div>
        <p className="sub">Photos from the round — coming soon.</p>
        <div style={{ marginTop: 30, textAlign: "center", color: "var(--mut)" }}>
          <div style={{ fontSize: 46 }}>📸</div>
          <p style={{ fontSize: 13.5, marginTop: 8, maxWidth: 260, marginInline: "auto" }}>
            Soon you'll be able to drop in photos from each match and relive the best shots of the day.
          </p>
        </div>
      </div>
    </div>
  );
}
