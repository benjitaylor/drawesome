<script>
  import { Draw } from "draw-svelte";
  const initialStrokes = [
    { id: "ink", pen: "pen", color: "#123456", size: 8, opacity: 1, points: [[20, 20, .5], [80, 80, .5]] },
    { id: "erase", pen: "pen", color: "#000", size: 12, opacity: 1, erase: true, points: [[40, 20, .5], [40, 80, .5]] },
  ];
</script>
{#each ["light", "dark"] as theme}
  <div style="height: 360px">
    <Draw {theme} {initialStrokes} board={{ w: 640, h: 360 }} />
  </div>
{/each}
