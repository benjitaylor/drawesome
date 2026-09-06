<script lang="ts">
  let {
    name,
    size = 16,
  }: {
    name: "back" | "collapse" | "dropper" | "redo" | "undo" | "trash";
    size?: number;
  } = $props();
  import trash from "./TrashIcon.module.css";
</script>

{#if name === "dropper"}
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m14.6 6.6 3-3a2.1 2.1 0 1 1 3 3l-3 3 .4.4a2.1 2.1 0 1 1-3 3l-3.4-3.4a2.1 2.1 0 1 1 3-3l.4.4Z" />
    <path d="M5 20v-2.6l7.2-7.2" />
    <path d="m4 21 .9-.9h2.6l7.2-7.2" />
  </svg>
{:else}
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={name === "trash" ? trash.icon : undefined}
  >
    {#if name === "back"}
      <path d="M9.8 3.6 5.4 8l4.4 4.4" />
    {:else if name === "collapse"}
      <path d="M6.6 2.9v3.7H2.9" />
      <path d="M2.6 2.6 6.6 6.6" />
      <path d="M9.4 13.1V9.4h3.7" />
      <path d="M13.4 13.4 9.4 9.4" />
    {:else if name === "undo"}
      <path d="M2.8 5.5h6.9a3.6 3.6 0 0 1 0 7.2H6.2" />
      <path d="M5.4 2.9 2.8 5.5l2.6 2.6" />
    {:else if name === "redo"}
      <path d="M13.2 5.5H6.3a3.6 3.6 0 0 0 0 7.2h3.5" />
      <path d="M10.6 2.9l2.6 2.6-2.6 2.6" />
    {:else if name === "trash"}
      <path d="M4.9 7.5v3.9a2.3 2.3 0 0 0 2.3 2.3h1.6a2.3 2.3 0 0 0 2.3-2.3V7.5" />
      <g class={trash.lid}>
        <path d="M3.5 5.6h9" />
        <path d="M6.8 5.6V4.5a1.2 1.2 0 0 1 1.2-1.2 1.2 1.2 0 0 1 1.2 1.2v1.1" />
      </g>
    {/if}
  </svg>
{/if}
