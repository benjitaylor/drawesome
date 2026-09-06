<script>
  import { Draw, createDrawing } from "draw-svelte";
  let props = $state(JSON.parse(new URLSearchParams(location.search).get("props") || "{}"));
  let draw = $state();
  const controller = createDrawing();
  $effect(() => {
    window.fixture = {
      draw,
      controller,
      setProps: (next) => { props = { ...props, ...next }; },
    };
  });
</script>
<Draw bind:this={draw} {...props} onChange={(strokes) => { window.changes = strokes; }} />
