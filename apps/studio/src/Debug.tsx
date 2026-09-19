import type { RefObject } from "react";
import {
  PENS,
  type DrawHandle,
  type InkMode,
  type PenId,
} from "drawesome";
import css from "./Debug.module.css";

/**
 * Demo-only controls for exercising the package's props.
 *
 * Lives in the demo app, never in the package — a drawing component has no
 * business shipping a panel that reconfigures itself. Everything here maps to
 * exactly one prop, so the panel doubles as the list of what's supported.
 */
export type DebugState = {
  placement: "bottom" | "left" | "right";
  theme: "light" | "dark" | "auto";
  depth: "flat" | "soft" | "regular" | "strong";
  settings: "bar" | "tool";
  align: "start" | "center" | "end";
  minimizeAlign: "auto" | "start" | "end";
  look: "classic" | "studio";
  gauge: boolean;
  shortcuts: boolean;
  ink: InkMode;
  chrome: boolean;
  motion: "rise" | "none";
  tooltips: false | "all" | "tools";
  eraser: boolean;
  transparent: boolean;
  draggable: boolean;
  /** Empty means "all of them". */
  tools: PenId[];
  controls: {
    color: boolean;
    size: boolean;
    opacity: boolean;
    custom: boolean;
    undo: boolean;
    clear: boolean;
    minimize: boolean;
  };
};

export const defaults: DebugState = {
  placement: "bottom",
  theme: "light",
  depth: "regular",
  settings: "bar",
  align: "center",
  minimizeAlign: "auto",
  look: "classic",
  gauge: false,
  shortcuts: true,
  ink: "auto",
  chrome: true,
  motion: "rise",
  tooltips: "all",
  eraser: true,
  transparent: false,
  draggable: false,
  tools: [],
  controls: {
    color: true,
    size: true,
    opacity: true,
    custom: true,
    undo: true,
    clear: true,
    minimize: true,
  },
};

const PLACEMENTS = ["bottom", "left", "right"] as const;
const THEMES = ["light", "dark", "auto"] as const;
const DEPTHS = ["flat", "soft", "regular", "strong"] as const;
const SETTINGS = ["bar", "tool"] as const;
const LOOKS = ["classic", "studio"] as const;
const ALIGNS = ["start", "center", "end"] as const;
const MINIMIZE_ALIGNS = ["auto", "start", "end"] as const;
const INKS: InkMode[] = ["auto", "shared", "per-tool"];
const CONTROLS = [
  "color",
  "size",
  "opacity",
  "custom",
  "undo",
  "clear",
  "minimize",
] as const;

export function Debug({
  value,
  onChange,
  draw,
}: {
  value: DebugState;
  onChange: (next: DebugState) => void;
  draw: RefObject<DrawHandle | null>;
}) {
  const set = <K extends keyof DebugState>(k: K, v: DebugState[K]) =>
    onChange({ ...value, [k]: v });

  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className={css.group}>
      <span className={css.label}>{label}</span>
      <div className={css.row}>{children}</div>
    </div>
  );

  const Toggle = ({
    on,
    onClick,
    children,
  }: {
    on: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      className={css.chip}
      data-active={on || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return (
    <div className={css.panel}>
      <span className={css.tag}>demo</span>

      <Row label="Placement">
        {PLACEMENTS.map((p) => (
          <Toggle
            key={p}
            on={value.placement === p}
            onClick={() => set("placement", p)}
          >
            {p}
          </Toggle>
        ))}
      </Row>

      <Row label="Theme">
        {THEMES.map((t) => (
          <Toggle
            key={t}
            on={value.theme === t}
            onClick={() => set("theme", t)}
          >
            {t}
          </Toggle>
        ))}
      </Row>

      <Row label="Depth">
        {DEPTHS.map((d) => (
          <Toggle
            key={d}
            on={value.depth === d}
            onClick={() => set("depth", d)}
          >
            {d}
          </Toggle>
        ))}
      </Row>

      <Row label="Settings">
        {SETTINGS.map((v) => (
          <Toggle
            key={v}
            on={value.settings === v}
            onClick={() => set("settings", v)}
          >
            {v}
          </Toggle>
        ))}
      </Row>

      <Row label="Align">
        {ALIGNS.map((v) => (
          <Toggle
            key={v}
            on={value.align === v}
            onClick={() => set("align", v)}
          >
            {v}
          </Toggle>
        ))}
      </Row>

      <Row label="Minimize to">
        {MINIMIZE_ALIGNS.map((v) => (
          <Toggle
            key={v}
            on={value.minimizeAlign === v}
            onClick={() => set("minimizeAlign", v)}
          >
            {v}
          </Toggle>
        ))}
      </Row>

      <Row label="Tools">
        {LOOKS.map((v) => (
          <Toggle key={v} on={value.look === v} onClick={() => set("look", v)}>
            {v}
          </Toggle>
        ))}
        <Toggle on={value.gauge} onClick={() => set("gauge", !value.gauge)}>
          gauge
        </Toggle>
        <Toggle
          on={value.shortcuts}
          onClick={() => set("shortcuts", !value.shortcuts)}
        >
          keys
        </Toggle>
      </Row>

      <Row label="Ink">
        {INKS.map((m) => (
          <Toggle key={m} on={value.ink === m} onClick={() => set("ink", m)}>
            {m}
          </Toggle>
        ))}
      </Row>

      <Row label="Controls">
        {CONTROLS.map((c) => (
          <Toggle
            key={c}
            on={value.controls[c]}
            onClick={() =>
              set("controls", { ...value.controls, [c]: !value.controls[c] })
            }
          >
            {c}
          </Toggle>
        ))}
      </Row>

      <Row label="Tools">
        {PENS.map((p) => {
          // Empty means every tool, so the first click has to seed the list
          // with everything *except* the one being switched off.
          const on = value.tools.length === 0 || value.tools.includes(p.id);
          return (
            <Toggle
              key={p.id}
              on={on}
              onClick={() => {
                const current = value.tools.length
                  ? value.tools
                  : PENS.map((x) => x.id);
                // Switching one back on puts it at the end, so the chips
                // reorder the tray as well as filtering it — which is what
                // `tools` does, and there was no way to see it before.
                const next = on
                  ? current.filter((id) => id !== p.id)
                  : [...current, p.id];
                set("tools", next);
              }}
            >
              {p.name}
            </Toggle>
          );
        })}
      </Row>

      <Row label="Motion">
        {(["rise", "none"] as const).map((m) => (
          <Toggle key={m} on={value.motion === m} onClick={() => set("motion", m)}>
            {m}
          </Toggle>
        ))}
        {/* Out and back in, so both halves can be watched without having to
            find the toolbar switch and hit it twice. */}
        <Toggle
          on={false}
          onClick={() => {
            set("chrome", false);
            window.setTimeout(() => set("chrome", true), 900);
          }}
        >
          replay
        </Toggle>
        <Toggle on={value.chrome} onClick={() => set("chrome", !value.chrome)}>
          {value.chrome ? "hide" : "show"}
        </Toggle>
      </Row>

      <Row label="Also">
        {/* `chrome={false}` is the bring-your-own-UI switch: it takes the
            whole toolbar away and leaves the bare surface, for apps driving
            DrawSurface and the hooks with their own controls. */}
        <Toggle on={value.chrome} onClick={() => set("chrome", !value.chrome)}>
          toolbar
        </Toggle>
        <Toggle on={value.eraser} onClick={() => set("eraser", !value.eraser)}>
          eraser
        </Toggle>
        <Toggle
          on={value.tooltips !== false}
          onClick={() =>
            set(
              "tooltips",
              value.tooltips === "all"
                ? "tools"
                : value.tooltips === "tools"
                  ? false
                  : "all",
            )
          }
        >
          tips: {value.tooltips === false ? "off" : value.tooltips}
        </Toggle>
        <Toggle
          on={value.transparent}
          onClick={() => set("transparent", !value.transparent)}
        >
          transparent
        </Toggle>
        <Toggle
          on={value.draggable}
          onClick={() => set("draggable", !value.draggable)}
        >
          draggable
        </Toggle>
      </Row>

      <Row label="Export">
        <button
          type="button"
          className={css.chip}
          onClick={() => draw.current?.download("drawing", "svg")}
        >
          .svg
        </button>
        <button
          type="button"
          className={css.chip}
          onClick={() => draw.current?.download("drawing", "png", 2)}
        >
          .png @2x
        </button>
        <button
          type="button"
          className={css.chip}
          onClick={() => {
            const svg = draw.current?.toSvg() ?? "";
            // eslint-disable-next-line no-console
            console.log(svg);
            navigator.clipboard?.writeText(svg);
          }}
        >
          copy svg
        </button>
      </Row>
    </div>
  );
}
