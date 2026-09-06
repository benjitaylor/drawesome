<script lang="ts">
  import css from "./Toolbar.module.css";

  let {
    value,
    onChange,
  }: {
    value: string;
    onChange: (color: string) => void;
  } = $props();
  // The field deliberately starts from the initial prop, then the effect below
  // keeps it in sync whenever it is not being edited.
  // svelte-ignore state_referenced_locally
  let text = $state(value);
  let editing = false;

  function normalise(input: string): string | null {
    const hex = input.trim().replace(/^#/, "");
    if (/^[\da-f]{3}$/i.test(hex)) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
    }
    if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`;
    return null;
  }

  $effect(() => {
    if (!editing) text = value;
  });
</script>

<span class={css.hex}>
  <span aria-hidden="true">#</span>
  <input
    value={text.replace(/^#/, "").toUpperCase()}
    spellcheck="false"
    autocomplete="off"
    inputmode="text"
    maxlength="6"
    aria-label="Hex colour"
    onfocus={() => {
      editing = true;
    }}
    oninput={(event) => {
      text = event.currentTarget.value;
      const parsed = normalise(text);
      if (parsed) onChange(parsed);
    }}
    onblur={() => {
      editing = false;
      text = value;
    }}
    onkeydown={(event) => {
      if (event.key === "Enter") event.currentTarget.blur();
      event.stopPropagation();
    }}
  />
</span>
