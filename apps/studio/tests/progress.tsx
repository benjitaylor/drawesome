import { useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Draw,
  type DrawHandle,
  type Point,
  type Stroke,
  type Tool,
} from "drawesome";

declare global {
  interface Window {
    progress: {
      /** Read late: the handle is rebuilt as the drawing changes. */
      draw: () => DrawHandle | null;
      /** Every `onProgress` call, holding the array it was handed. */
      calls: { points: readonly Point[]; tool: Tool }[];
      /** Whatever `onChange` last reported. */
      committed: Stroke[];
    };
  }
}

/** `?listen=0` mounts the same drawing with no listener at all. */
const listening = new URLSearchParams(location.search).get("listen") !== "0";

function Fixture() {
  const draw = useRef<DrawHandle>(null);
  const record = useRef<Window["progress"]>({
    draw: () => draw.current,
    calls: [],
    committed: [],
  });
  useLayoutEffect(() => {
    window.progress = record.current;
  });
  return (
    <div id="frame" style={{ width: 900, height: 760, margin: 30 }}>
      <Draw
        ref={draw}
        motion="none"
        tooltips={false}
        onProgress={
          listening
            ? (points, tool) => record.current.calls.push({ points, tool })
            : undefined
        }
        onChange={(strokes) => {
          record.current.committed = strokes;
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("fixture")!).render(<Fixture />);
