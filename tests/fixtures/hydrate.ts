import { hydrate } from "svelte";
import Fixture from "./SSRFixture.svelte";
import "draw-svelte/styles.css";
import "./style.css";
hydrate(Fixture, { target: document.getElementById("app")! });
