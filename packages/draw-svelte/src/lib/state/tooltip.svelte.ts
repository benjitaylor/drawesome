import type { Action } from "svelte/action";
import type { TooltipOptions } from "../components/Toolbar.svelte";

type Face = { label: string; hint?: string };
type Placement = "top" | "right" | "left";
export type ShownTooltip = Face & {
  x: number;
  y: number;
  at: Placement;
};
type Binding = Face & { control?: boolean };

const SWAP = 260;
const EXIT = 170;

export class TooltipController {
  shown = $state<ShownTooltip | null>(null);
  leaving = $state<Face | null>(null);
  width = $state<number | null>(null);
  swap = $state(0);
  closing = $state(false);
  face = $state<HTMLDivElement | null>(null);
  #open = false;
  #delay: ReturnType<typeof setTimeout> | null = null;
  #leave: ReturnType<typeof setTimeout> | null = null;
  #settle: ReturnType<typeof setTimeout> | null = null;
  #exit: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly options: () => boolean | TooltipOptions | undefined,
    private readonly bar: () => "bottom" | "left" | "right",
  ) {}

  get style() {
    const options = this.options();
    return typeof options === "object" ? options.style : undefined;
  }

  #clear(timer: ReturnType<typeof setTimeout> | null) {
    if (timer) clearTimeout(timer);
    return null;
  }

  hide = (now = false) => {
    this.#delay = this.#clear(this.#delay);
    this.#leave = this.#clear(this.#leave);
    const go = () => {
      this.closing = true;
      this.#exit = this.#clear(this.#exit);
      this.#exit = setTimeout(() => {
        this.#open = false;
        this.shown = null;
        this.leaving = null;
        this.width = null;
        this.closing = false;
      }, EXIT);
    };
    if (now) go();
    else this.#leave = setTimeout(go, 130);
  };

  show(
    element: HTMLElement,
    label: string,
    hint?: string,
    control = false,
  ) {
    const options = this.options();
    if (
      options === false ||
      (control &&
        typeof options === "object" &&
        options.scope === "tools")
    ) {
      return;
    }
    this.#delay = this.#clear(this.#delay);
    this.#leave = this.#clear(this.#leave);
    this.#exit = this.#clear(this.#exit);
    this.closing = false;

    const place = () => {
      const rect = element.getBoundingClientRect();
      const bar = this.bar();
      const at: Placement =
        bar === "left" ? "right" : bar === "right" ? "left" : "top";
      const x = Math.round(
        at === "right"
          ? rect.right + 12
          : at === "left"
            ? rect.left - 12
            : rect.left + rect.width / 2,
      );
      const y = Math.round(
        at === "top" ? rect.top - 10 : rect.top + rect.height / 2,
      );
      if (this.shown && this.shown.label !== label) {
        this.leaving = {
          label: this.shown.label,
          hint: this.shown.hint,
        };
        this.swap += 1;
        this.#settle = this.#clear(this.#settle);
        this.#settle = setTimeout(() => {
          this.leaving = null;
        }, SWAP);
      }
      this.shown = { label, hint, x, y, at };
      this.#open = true;
    };

    const wait =
      typeof options === "object" ? (options.delay ?? 400) : 400;
    if (this.#open) place();
    else this.#delay = setTimeout(place, wait);
  }

  tooltip: Action<HTMLElement, Binding> = (element, binding) => {
    let value = binding;
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") {
        this.show(element, value.label, value.hint, value.control);
      }
    };
    const leave = () => this.hide();
    const down = () => this.hide(true);
    const focus = () => {
      if (element.matches(":focus-visible")) {
        this.show(element, value.label, value.hint, value.control);
      }
    };
    const blur = () => this.hide();
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("pointerdown", down);
    element.addEventListener("focus", focus);
    element.addEventListener("blur", blur);
    return {
      update(next) {
        value = next;
      },
      destroy() {
        element.removeEventListener("pointerenter", enter);
        element.removeEventListener("pointerleave", leave);
        element.removeEventListener("pointerdown", down);
        element.removeEventListener("focus", focus);
        element.removeEventListener("blur", blur);
      },
    };
  };

  measure() {
    if (this.face) this.width = this.face.scrollWidth;
  }

  destroy() {
    this.#delay = this.#clear(this.#delay);
    this.#leave = this.#clear(this.#leave);
    this.#settle = this.#clear(this.#settle);
    this.#exit = this.#clear(this.#exit);
  }
}
