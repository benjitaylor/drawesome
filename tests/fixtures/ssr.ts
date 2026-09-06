import { render } from "svelte/server";
import Fixture from "./SSRFixture.svelte";
export function html() { return render(Fixture).body; }
