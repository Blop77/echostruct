// Data structures, navigation and spoken descriptions.
// Everything here is pure (no DOM, no audio) so it can be unit-tested.

export type Kind = "list" | "stack" | "tree";
export type Dir = "up" | "down" | "left" | "right" | "home" | "end" | "sibling";

/** How a position sounds. The model owns the mapping so it is testable and documented in one place. */
export interface Tone {
  /** Semitones relative to A4 (440 Hz). */
  semitone: number;
  /** Stereo position, -1 (left) to 1 (right). */
  pan: number;
  /** A short tick in the left ear: there is something to the left (tree: left child). */
  cueLeft: boolean;
  /** A short tick in the right ear: there is something to the right (tree: right child, list: next). */
  cueRight: boolean;
  /** node: inner node, leaf: nothing below/after it, slot: empty place, empty: empty structure. */
  variant: "node" | "leaf" | "slot" | "empty";
}

export interface MoveResult {
  id: string | null;
  /** Why the move was not possible (spoken instead of moving). */
  reason?: string;
}

export interface Structure {
  readonly kind: Kind;
  readonly label: string;
  size(): number;
  values(): number[];
  startId(): string;
  has(id: string): boolean;
  move(id: string, dir: Dir, slots: boolean): MoveResult;
  describe(id: string, brief: boolean): string;
  pathTo(id: string): string;
  overview(): string;
  tone(id: string): Tone;
  /** Ids in the order the "listen to the shape" tour plays them. */
  tour(): string[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// ---------------------------------------------------------------- Linked list

export class LinkedList implements Structure {
  readonly kind = "list" as const;
  readonly label = "Linked list";
  items: number[];

  constructor(values: number[] = []) {
    this.items = [...values];
  }

  static id(i: number) {
    return `i:${i}`;
  }
  static index(id: string): number {
    return id.startsWith("i:") ? Number(id.slice(2)) : -1;
  }

  size() {
    return this.items.length;
  }
  values() {
    return [...this.items];
  }
  startId() {
    return this.items.length ? LinkedList.id(0) : "empty";
  }
  has(id: string) {
    const i = LinkedList.index(id);
    return (id === "empty" && !this.items.length) || (i >= 0 && i < this.items.length);
  }

  move(id: string, dir: Dir): MoveResult {
    const n = this.items.length;
    if (!n) return { id: null, reason: "The list is empty. Append a value to create the head." };
    const i = LinkedList.index(id);
    switch (dir) {
      case "right":
        return i + 1 < n
          ? { id: LinkedList.id(i + 1) }
          : { id: null, reason: `${this.items[i]} is the tail. Its next pointer is null.` };
      case "left":
        return i > 0
          ? { id: LinkedList.id(i - 1) }
          : { id: null, reason: `${this.items[i]} is the head. Nothing comes before it.` };
      case "home":
        return { id: LinkedList.id(0) };
      case "end":
        return { id: LinkedList.id(n - 1) };
      default:
        return { id: null, reason: "A linked list is a single line. Use Left and Right arrows." };
    }
  }

  describe(id: string, brief: boolean): string {
    const n = this.items.length;
    if (!n) return "Empty list. The head pointer is null.";
    const i = LinkedList.index(id);
    const v = this.items[i];
    const next = i + 1 < n ? String(this.items[i + 1]) : "null";
    if (brief) return `${v}, ${i + 1} of ${n}`;
    const role = n === 1 ? "Head and tail, " : i === 0 ? "Head, " : i === n - 1 ? "Tail, " : "";
    return `${v}. ${role}node ${i + 1} of ${n}. Next is ${next}.`;
  }

  pathTo(id: string): string {
    if (!this.items.length) return "The list is empty.";
    const i = LinkedList.index(id);
    const visited = this.items.slice(0, i + 1).join(", ");
    return i === 0
      ? `${this.items[0]} is the head. You reach it directly.`
      : `From the head: ${visited}. That is ${plural(i, "step")} along next pointers.`;
  }

  overview(): string {
    if (!this.items.length) return "Linked list, empty.";
    return `Linked list with ${plural(this.items.length, "node")}, head to tail: ${this.items.join(", ")}, then null.`;
  }

  tone(id: string): Tone {
    const n = this.items.length;
    if (!n) return { semitone: -12, pan: 0, cueLeft: false, cueRight: false, variant: "empty" };
    const i = LinkedList.index(id);
    return {
      // Rising whole tones from head to tail, capped so long lists stay audible.
      semitone: clamp(-5 + i * 2, -5, 19),
      pan: n > 1 ? (i / (n - 1)) * 1.6 - 0.8 : 0,
      cueLeft: false,
      cueRight: i + 1 < n,
      variant: i + 1 < n ? "node" : "leaf",
    };
  }

  tour() {
    return this.items.map((_, i) => LinkedList.id(i));
  }

  append(v: number) {
    this.items.push(v);
    return this.items.length - 1;
  }
  insertAfter(i: number, v: number) {
    this.items.splice(i + 1, 0, v);
    return i + 1;
  }
  removeAt(i: number) {
    return this.items.splice(i, 1)[0];
  }
}

// ---------------------------------------------------------------- Stack

export class Stack implements Structure {
  readonly kind = "stack" as const;
  readonly label = "Stack";
  /** Bottom first; the last element is the top. */
  items: number[];

  constructor(values: number[] = []) {
    this.items = [...values];
  }

  size() {
    return this.items.length;
  }
  values() {
    return [...this.items];
  }
  topIndex() {
    return this.items.length - 1;
  }
  startId() {
    return this.items.length ? LinkedList.id(this.topIndex()) : "empty";
  }
  has(id: string) {
    const i = LinkedList.index(id);
    return (id === "empty" && !this.items.length) || (i >= 0 && i < this.items.length);
  }

  move(id: string, dir: Dir): MoveResult {
    const n = this.items.length;
    if (!n) return { id: null, reason: "The stack is empty. Push a value first." };
    const i = LinkedList.index(id);
    switch (dir) {
      case "up":
        return i + 1 < n
          ? { id: LinkedList.id(i + 1) }
          : { id: null, reason: `${this.items[i]} is the top of the stack. Nothing is above it.` };
      case "down":
        return i > 0
          ? { id: LinkedList.id(i - 1) }
          : { id: null, reason: `${this.items[i]} is the bottom of the stack.` };
      case "home":
        return { id: LinkedList.id(n - 1) };
      case "end":
        return { id: LinkedList.id(0) };
      default:
        return { id: null, reason: "A stack is a vertical pile. Use Up and Down arrows." };
    }
  }

  describe(id: string, brief: boolean): string {
    const n = this.items.length;
    if (!n) return "Empty stack.";
    const i = LinkedList.index(id);
    const v = this.items[i];
    const fromTop = n - i; // 1 = top
    if (brief) return `${v}, ${fromTop} of ${n} from top`;
    const where =
      n === 1
        ? "Top and bottom of the stack, the only value"
        : fromTop === 1
          ? `Top of the stack, 1 of ${n}`
          : i === 0
            ? `Bottom of the stack, ${n} of ${n} from the top`
            : `${cap(ordinal(fromTop))} from the top, ${fromTop} of ${n}`;
    const parts = [`${v}. ${where}.`];
    if (i + 1 < n) parts.push(`Above: ${this.items[i + 1]}.`);
    if (i > 0) parts.push(`Below: ${this.items[i - 1]}.`);
    return parts.join(" ");
  }

  pathTo(id: string): string {
    if (!this.items.length) return "The stack is empty.";
    const i = LinkedList.index(id);
    const above = this.items.slice(i + 1).reverse();
    return above.length
      ? `To reach ${this.items[i]}, you would pop ${plural(above.length, "value")} first: ${above.join(", ")}.`
      : `${this.items[i]} is on top. Pop would return it right away.`;
  }

  overview(): string {
    if (!this.items.length) return "Stack, empty.";
    return `Stack with ${plural(this.items.length, "value")}, top to bottom: ${[...this.items].reverse().join(", ")}.`;
  }

  tone(id: string): Tone {
    const n = this.items.length;
    if (!n) return { semitone: -12, pan: 0, cueLeft: false, cueRight: false, variant: "empty" };
    const fromTop = n - 1 - LinkedList.index(id); // 0 = top
    return {
      // Top is highest; each step down drops a minor third.
      semitone: clamp(7 - fromTop * 3, -20, 7),
      pan: 0,
      cueLeft: false,
      cueRight: false,
      variant: fromTop === 0 ? "node" : "leaf",
    };
  }

  tour() {
    return this.items.map((_, i) => LinkedList.id(i)).reverse();
  }

  push(v: number) {
    this.items.push(v);
  }
  pop(): number | undefined {
    return this.items.pop();
  }
}

// ---------------------------------------------------------------- Binary search tree

export type Side = "left" | "right";
export interface TNode {
  value: number;
  left: TNode | null;
  right: TNode | null;
  parent: TNode | null;
}

export class BST implements Structure {
  readonly kind = "tree" as const;
  readonly label = "Binary search tree";
  root: TNode | null = null;
  private byValue = new Map<number, TNode>();

  constructor(values: number[] = []) {
    for (const v of values) this.insert(v);
  }

  static nodeId(v: number) {
    return `n:${v}`;
  }
  static slotId(parent: number | null, side: Side | null) {
    return parent === null ? "s:root" : `s:${parent}:${side}`;
  }
  /** Parse an id into either a node or a slot. */
  parse(id: string): { node?: TNode; slot?: { parent: TNode | null; side: Side | null } } {
    if (id.startsWith("n:")) {
      const node = this.byValue.get(Number(id.slice(2)));
      return node ? { node } : {};
    }
    if (id === "s:root") return this.root ? {} : { slot: { parent: null, side: null } };
    if (id.startsWith("s:")) {
      const [, p, side] = id.split(":");
      const parent = this.byValue.get(Number(p));
      if (!parent || (side !== "left" && side !== "right") || parent[side]) return {};
      return { slot: { parent, side } };
    }
    return {};
  }

  get(v: number) {
    return this.byValue.get(v);
  }
  size() {
    return this.byValue.size;
  }
  values() {
    return this.inorder().map((n) => n.value);
  }
  startId() {
    return this.root ? BST.nodeId(this.root.value) : "s:root";
  }
  has(id: string) {
    const p = this.parse(id);
    return !!(p.node || p.slot);
  }

  /** Inserts v. Returns where it went, or null for a duplicate. */
  insert(v: number): { parent: number | null; side: Side | null } | null {
    if (this.byValue.has(v)) return null;
    const node: TNode = { value: v, left: null, right: null, parent: null };
    this.byValue.set(v, node);
    if (!this.root) {
      this.root = node;
      return { parent: null, side: null };
    }
    let cur = this.root;
    for (;;) {
      const side: Side = v < cur.value ? "left" : "right";
      const next = cur[side];
      if (!next) {
        cur[side] = node;
        node.parent = cur;
        return { parent: cur.value, side };
      }
      cur = next;
    }
  }

  depth(n: TNode) {
    let d = 0;
    for (let p = n.parent; p; p = p.parent) d++;
    return d;
  }
  height(): number {
    const h = (n: TNode | null): number => (n ? 1 + Math.max(h(n.left), h(n.right)) : -1);
    return h(this.root);
  }
  /** Smallest possible height for this many values. */
  minHeight() {
    const n = this.size();
    return n ? Math.ceil(Math.log2(n + 1)) - 1 : -1;
  }
  inorder(): TNode[] {
    const out: TNode[] = [];
    const walk = (n: TNode | null) => {
      if (!n) return;
      walk(n.left);
      out.push(n);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }
  levels(): TNode[][] {
    const out: TNode[][] = [];
    let level = this.root ? [this.root] : [];
    while (level.length) {
      out.push(level);
      level = level.flatMap((n) => [n.left, n.right].filter((c): c is TNode => !!c));
    }
    return out;
  }
  sideOf(n: TNode): Side | null {
    if (!n.parent) return null;
    return n.parent.left === n ? "left" : "right";
  }

  /** Comparison steps a search/insert for v makes, ending at v's node or the empty slot where it belongs. */
  pathFor(v: number): { at: number; dir: Side | "found" }[] {
    const steps: { at: number; dir: Side | "found" }[] = [];
    let cur = this.root;
    while (cur) {
      if (v === cur.value) {
        steps.push({ at: cur.value, dir: "found" });
        return steps;
      }
      const dir: Side = v < cur.value ? "left" : "right";
      steps.push({ at: cur.value, dir });
      cur = cur[dir];
    }
    return steps;
  }
  /** Id of the empty slot where v would be inserted, or null if v is already present. */
  insertionSlotId(v: number): string | null {
    if (this.byValue.has(v)) return null;
    const steps = this.pathFor(v);
    const last = steps[steps.length - 1];
    return last ? BST.slotId(last.at, last.dir as Side) : "s:root";
  }

  move(id: string, dir: Dir, slots: boolean): MoveResult {
    const { node, slot } = this.parse(id);
    if (!this.root) return { id: null, reason: "The tree is empty. Insert a value to create the root." };
    if (dir === "home") return { id: BST.nodeId(this.root.value) };
    if (slot) {
      const p = slot.parent!;
      if (dir === "up") return { id: BST.nodeId(p.value) };
      if (dir === "sibling") {
        const other: Side = slot.side === "left" ? "right" : "left";
        const o = p[other];
        if (o) return { id: BST.nodeId(o.value) };
        return { id: BST.slotId(p.value, other) };
      }
      return { id: null, reason: `This slot is empty. Press Up to go back to ${p.value}.` };
    }
    if (!node) return { id: BST.nodeId(this.root.value) };
    const v = node.value;
    switch (dir) {
      case "up":
        return node.parent
          ? { id: BST.nodeId(node.parent.value) }
          : { id: null, reason: `${v} is the root. Nothing is above it.` };
      case "left":
      case "right": {
        const child = node[dir];
        if (child) return { id: BST.nodeId(child.value) };
        if (slots) return { id: BST.slotId(v, dir) };
        return { id: null, reason: `${v} has no ${dir} child.` };
      }
      case "sibling": {
        const p = node.parent;
        if (!p) return { id: null, reason: `${v} is the root, so it has no sibling.` };
        const other: Side = p.left === node ? "right" : "left";
        const o = p[other];
        if (o) return { id: BST.nodeId(o.value) };
        if (slots) return { id: BST.slotId(p.value, other) };
        return { id: null, reason: `${v} has no sibling. ${p.value} has only one child.` };
      }
      case "down":
        return { id: null, reason: "Use Left arrow for the left child, or Right arrow for the right child." };
      case "end":
        return { id: null, reason: "Home jumps to the root. Trees have no single end." };
    }
  }

  private childrenText(n: TNode) {
    if (n.left && n.right) return `Left child ${n.left.value}, right child ${n.right.value}.`;
    if (n.left) return `Left child ${n.left.value}. No right child.`;
    if (n.right) return `No left child. Right child ${n.right.value}.`;
    return "No children.";
  }

  describe(id: string, brief: boolean): string {
    const { node, slot } = this.parse(id);
    if (slot) {
      if (!slot.parent) return "Empty tree. This is where the root will go.";
      return `Empty ${slot.side} slot under ${slot.parent.value}.`;
    }
    if (!node) return "Empty tree.";
    const d = this.depth(node);
    const leaf = !node.left && !node.right;
    const side = this.sideOf(node);
    const role = node.parent ? `${cap(side!)} child of ${node.parent.value}` : "Root";
    if (brief) return `${node.value}, ${node.parent ? `${side} of ${node.parent.value}` : "root"}${leaf ? ", leaf" : ""}`;
    return `${node.value}. ${leaf ? "Leaf. " : ""}${role}. Depth ${d}. ${this.childrenText(node)}`;
  }

  pathTo(id: string): string {
    const { node, slot } = this.parse(id);
    const target = node ?? slot?.parent;
    if (!target) return "The tree is empty.";
    const chain: TNode[] = [];
    for (let n: TNode | null = target; n; n = n.parent) chain.unshift(n);
    const parts = [String(chain[0].value)];
    for (let i = 1; i < chain.length; i++) parts.push(`${this.sideOf(chain[i])} to ${chain[i].value}`);
    if (slot) parts.push(`then the empty ${slot.side} slot`);
    return chain.length === 1 && !slot
      ? `${target.value} is the root.`
      : `Path from the root: ${parts.join(", ")}.`;
  }

  shapeNote(): string {
    const n = this.size();
    const h = this.height();
    const best = this.minHeight();
    if (n < 3) return "";
    if (h === n - 1) return `Every node has at most one child, so this tree is really a chain: height ${h} for ${n} values. A balanced tree could have height ${best}.`;
    if (h === best) return `It is as short as possible for ${n} values, so searches are fast.`;
    return `A perfectly balanced tree with ${n} values would have height ${best}.`;
  }

  overview(): string {
    if (!this.root) return "Binary search tree, empty.";
    const levels = this.levels()
      .map((lvl, i) => `Level ${i}: ${lvl.map((n) => n.value).join(", ")}.`)
      .join(" ");
    return `Binary search tree with ${plural(this.size(), "value")}, height ${this.height()}. ${levels} ${this.shapeNote()}`.trim();
  }

  tone(id: string): Tone {
    const { node, slot } = this.parse(id);
    const order = this.inorder();
    const n = order.length;
    const panOf = (t: TNode) => (n > 1 ? (order.indexOf(t) / (n - 1)) * 2 - 1 : 0);
    // Root is highest; each level down drops a perfect fourth (5 semitones).
    const pitch = (depth: number) => clamp(7 - depth * 5, -29, 7);
    if (slot) {
      if (!slot.parent) return { semitone: pitch(0), pan: 0, cueLeft: false, cueRight: false, variant: "empty" };
      const shift = slot.side === "left" ? -0.25 : 0.25;
      return {
        semitone: pitch(this.depth(slot.parent) + 1),
        pan: clamp(panOf(slot.parent) + shift, -1, 1),
        cueLeft: false,
        cueRight: false,
        variant: "slot",
      };
    }
    if (!node) return { semitone: pitch(0), pan: 0, cueLeft: false, cueRight: false, variant: "empty" };
    return {
      semitone: pitch(this.depth(node)),
      pan: panOf(node),
      cueLeft: !!node.left,
      cueRight: !!node.right,
      variant: node.left || node.right ? "node" : "leaf",
    };
  }

  tour() {
    return this.inorder().map((n) => BST.nodeId(n.value));
  }
}

// ---------------------------------------------------------------- Parsing input

export const MAX_VALUES = 31;

/** Parses "8, 3, 10" into numbers. Returns an error message for bad input. */
export function parseValues(text: string): { values: number[]; error?: string } {
  const parts = text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return { values: [], error: "Enter at least one whole number, separated by commas or spaces." };
  const bad = parts.find((p) => !/^-?\d{1,3}$/.test(p));
  if (bad) return { values: [], error: `"${bad}" is not a whole number between -999 and 999.` };
  if (parts.length > MAX_VALUES) return { values: [], error: `Use at most ${MAX_VALUES} values so the structure stays easy to explore.` };
  return { values: parts.map(Number) };
}

export function create(kind: Kind, values: number[]): Structure {
  if (kind === "list") return new LinkedList(values);
  if (kind === "stack") return new Stack(values);
  return new BST(values);
}
