import { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Draw, type DrawHandle, type DrawProps } from "drawesome";

declare global {
  interface Window {
    fixture: {
      draw: DrawHandle | null;
      setProps: (props: Partial<DrawProps>) => void;
      resize: (width: number, height: number) => void;
    };
  }
}

function Fixture() {
  const [props, setProps] = useState<DrawProps>(
    JSON.parse(new URLSearchParams(location.search).get("props") ?? "{}"),
  );
  const [size, setSize] = useState({ width: 900, height: 760 });
  const draw = useRef<DrawHandle>(null);
  useLayoutEffect(() => {
    window.fixture = {
      draw: draw.current,
      setProps: (next) => setProps((previous) => ({ ...previous, ...next })),
      resize: (width, height) => setSize({ width, height }),
    };
  });
  return (
    <div id="frame" style={{ ...size, margin: 30, borderRadius: 16 }}>
      <Draw ref={draw} motion="none" tooltips={false} {...props} />
    </div>
  );
}

createRoot(document.getElementById("fixture")!).render(<Fixture />);
