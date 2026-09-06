import { mount } from "svelte";
import Fixture from "./Fixture.svelte";
import "draw-svelte/styles.css";
import "./style.css";
mount(Fixture, { target: document.getElementById("app")! });
