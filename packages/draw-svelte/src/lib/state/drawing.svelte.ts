import type { Stroke } from "../engine/types.js";

/** Stroke list plus undo/redo, exposed as the same small transaction API. */
export class DrawingController {
  strokes = $state.raw<Stroke[]>([]);
  #past = $state.raw<Stroke[][]>([]);
  #future = $state.raw<Stroke[][]>([]);
  #snapshot: Stroke[] | null = null;

  constructor(initial: Stroke[] = []) {
    this.strokes = initial;
  }

  get canUndo() {
    return this.#past.length > 0;
  }

  get canRedo() {
    return this.#future.length > 0;
  }

  commit = (next: Stroke[]) => {
    this.#past = [...this.#past, this.strokes];
    this.#future = [];
    this.strokes = next;
  };

  begin = () => {
    this.#snapshot = this.strokes;
  };

  update = (next: Stroke[] | ((previous: Stroke[]) => Stroke[])) => {
    this.strokes =
      typeof next === "function"
        ? (next as (previous: Stroke[]) => Stroke[])(this.strokes)
        : next;
  };

  end = () => {
    const before = this.#snapshot;
    this.#snapshot = null;
    if (!before || before === this.strokes) return;
    this.#past = [...this.#past, before];
    this.#future = [];
  };

  undo = () => {
    if (!this.#past.length) return;
    const previous = this.#past[this.#past.length - 1];
    this.#past = this.#past.slice(0, -1);
    this.#future = [this.strokes, ...this.#future];
    this.strokes = previous;
  };

  redo = () => {
    if (!this.#future.length) return;
    const next = this.#future[0];
    this.#future = this.#future.slice(1);
    this.#past = [...this.#past, this.strokes];
    this.strokes = next;
  };

  clear = () => {
    if (this.strokes.length) this.commit([]);
  };

  reset = (next: Stroke[]) => {
    this.strokes = next;
    this.#past = [];
    this.#future = [];
  };
}

/** Create a drawing controller for composing DrawSurface and Toolbar yourself. */
export function createDrawing(initial: Stroke[] = []) {
  return new DrawingController(initial);
}
