<script lang="ts">
  import css from "./BarSlider.module.css";

  let {
    label,
    value,
    min,
    max,
    curve = 1,
    display,
    color,
    checker = false,
    vertical = false,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    curve?: number;
    display: string;
    color: string;
    checker?: boolean;
    vertical?: boolean;
    onChange: (value: number) => void;
  } = $props();

  let track: HTMLDivElement;
  let dragging = false;
  let tracking = $state(false);
  let pressedAt = 0;
  const knob = 16;
  const percentage = $derived(
    Math.pow((value - min) / (max - min), 1 / curve),
  );
  const at = $derived(
    `calc(${knob / 2}px + ${percentage} * (100% - ${knob}px))`,
  );
  const step = $derived((max - min) / 50);

  function valueAt(clientX: number, clientY: number) {
    const rect = track.getBoundingClientRect();
    const usable = Math.max(1, (vertical ? rect.height : rect.width) - knob);
    const along = vertical
      ? rect.bottom - clientY - knob / 2
      : clientX - rect.left - knob / 2;
    const t = Math.min(1, Math.max(0, along / usable));
    return min + (max - min) * Math.pow(t, curve);
  }
</script>

<div class={`${css.field} ${vertical ? css.fieldVertical : ""}`}>
  <div class={css.head}>
    <span class={css.label}>{label}</span>
    <span class={css.value}>{display}</span>
  </div>
  <div
    bind:this={track}
    class={`${css.track} ${vertical ? css.trackVertical : ""}`}
    data-dragging={tracking || undefined}
    onpointerdown={(event) => {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort.
      }
      dragging = true;
      tracking = false;
      pressedAt = vertical ? event.clientY : event.clientX;
      onChange(valueAt(event.clientX, event.clientY));
    }}
    onpointermove={(event) => {
      if (!dragging) return;
      const position = vertical ? event.clientY : event.clientX;
      if (Math.abs(position - pressedAt) > 4) tracking = true;
      onChange(valueAt(event.clientX, event.clientY));
    }}
    onpointerup={() => {
      dragging = false;
      tracking = false;
    }}
    onpointercancel={() => {
      dragging = false;
      tracking = false;
    }}
    role="slider"
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-valuetext={display}
    tabindex="0"
    onkeydown={(event) => {
      const up = vertical ? "ArrowUp" : "ArrowRight";
      const down = vertical ? "ArrowDown" : "ArrowLeft";
      if (event.key === up) onChange(Math.min(max, value + step));
      if (event.key === down) onChange(Math.max(min, value - step));
    }}
  >
    <span class={css.groove}>
      {#if checker}<span class={css.checker}></span>{/if}
      <span
        class={css.fill}
        style:height={vertical ? at : undefined}
        style:width={vertical ? undefined : at}
        style:background={color}
      ></span>
    </span>
    <span
      class={css.knob}
      style:bottom={vertical ? at : undefined}
      style:left={vertical ? undefined : at}
    ></span>
  </div>
</div>
