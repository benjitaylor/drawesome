import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Draw, useDrawing } from "drawesome";
import "drawesome/styles.css";
import "./style.css";

function Fixture() {
  const [props, setProps] = useState(JSON.parse(new URLSearchParams(location.search).get("props") || "{}"));
  const ref = useRef(null);
  const controller = useDrawing();
  useEffect(() => {
    window.fixture = {
      get draw() { return ref.current; },
      controller,
      setProps: (next) => setProps((previous) => ({ ...previous, ...next })),
    };
  });
  return <Draw ref={ref} {...props} onChange={(strokes) => { window.changes = strokes; }} />;
}
createRoot(document.getElementById("app")!).render(<Fixture />);
