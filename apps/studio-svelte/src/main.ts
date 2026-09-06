import { mount } from "svelte";
import App from "./App.svelte";
import "./reset.css";

mount(App, {
  target: document.getElementById("app")!,
});
