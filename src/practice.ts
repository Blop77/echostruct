// Practice questions. Each one is answered by navigating to a position and pressing Enter,
// so practice uses exactly the same skills as exploring.

import { BST, LinkedList, Stack, ordinal, type Side, type Structure } from "./model";

export interface Answer {
  correct: boolean;
  feedback: string;
}

export interface Question {
  type: string;
  prompt: string;
  /** Show empty child slots in the tree (needed for insert questions). */
  slots: boolean;
  /** Where the learner starts. Defaults to the structure's start (root, head or top). */
  start?: string;
  /** Fewest arrow presses from the start position, used to give "you took N moves" feedback. */
  bestMoves?: number;
  check(id: string): Answer;
  hint(currentId: string): string;
}

type Rand = () => number;
const pick = <T>(xs: T[], rand: Rand): T => xs[Math.floor(rand() * xs.length)];

function unusedValue(taken: Set<number>, lo: number, hi: number, rand: Rand): number {
  for (let i = 0; i < 200; i++) {
    const v = lo + Math.floor(rand() * (hi - lo + 1));
    if (!taken.has(v)) return v;
  }
  let v = hi + 1;
  while (taken.has(v)) v++;
  return v;
}

// ---------------------------------------------------------------- Tree

const cmp = (v: number, at: number) => (v < at ? "less than" : "greater than");
const arrow = (d: Side) => (d === "left" ? "Left arrow" : "Right arrow");

/** One sentence of reasoning per comparison: "7 is less than 8, so go left." */
export function explainPath(t: BST, v: number): string {
  return t
    .pathFor(v)
    .map((s) => (s.dir === "found" ? `${v} equals ${s.at}: found.` : `${v} is ${cmp(v, s.at)} ${s.at}, so go ${s.dir}.`))
    .join(" ");
}

/** Hint for searching/inserting v when the learner is at currentId. */
function treeHint(t: BST, v: number, currentId: string, goal: "insert" | "find"): string {
  const { node, slot } = t.parse(currentId);
  const onPath = new Set(t.pathFor(v).map((s) => s.at));
  if (slot) {
    if (goal === "insert" && currentId === t.insertionSlotId(v)) return `You are in the right place. Press Enter to insert ${v} here.`;
    return `This empty slot is not where ${v} belongs. Press Home to go back to the root and compare again.`;
  }
  if (!node) return "Press Home to go to the root.";
  if (node.value === v) return `You found ${v}. Press Enter.`;
  if (!onPath.has(node.value)) return `${v} cannot be under ${node.value}. Press Home to start again from the root, then compare at each node.`;
  const dir: Side = v < node.value ? "left" : "right";
  const child = node[dir];
  const target = child ? `to ${child.value}` : goal === "insert" ? "to the empty slot" : "";
  return `${v} is ${cmp(v, node.value)} ${node.value}, so go ${dir}${target ? " " + target : ""}. Press ${arrow(dir)}.`;
}

/** Explains where a wrong answer went off course: the deepest node shared by both paths. */
function divergence(t: BST, v: number, chosenParent: number | null): string {
  if (chosenParent === null) return "";
  const correct = t.pathFor(v);
  const chosen = new Set<number>();
  for (let n = t.get(chosenParent) ?? null; n; n = n.parent) chosen.add(n.value);
  let split: { at: number; dir: Side | "found" } | undefined;
  for (const s of correct) {
    if (!chosen.has(s.at)) break;
    split = s;
  }
  if (!split || split.dir === "found") return "";
  return `At ${split.at}, ${v} is ${cmp(v, split.at)} ${split.at}, so it belongs in the ${split.dir} subtree.`;
}

function treeQuestion(t: BST, rand: Rand, avoid?: string): Question | null {
  const values = t.values();
  const types = values.length >= 2 ? ["insert", "find", "min", "max"] : values.length ? ["insert", "find"] : ["insert"];
  const options = types.filter((ty) => ty !== avoid);
  const type = pick(options.length ? options : types, rand);
  const lo = values.length ? Math.max(0, Math.min(...values) - 5) : 1;
  const hi = values.length ? Math.max(...values) + 5 : 30;

  if (type === "insert") {
    const v = unusedValue(new Set(values), lo, hi, rand);
    const target = t.insertionSlotId(v)!;
    return {
      type,
      prompt: `Insert ${v}. Starting at the root, compare and move left or right until you reach an empty slot, then answer there.`,
      slots: true,
      bestMoves: t.pathFor(v).length,
      check(id) {
        const { node, slot } = t.parse(id);
        if (node) return { correct: false, feedback: `${node.value} is a node, not an empty slot. Keep comparing until you reach an empty slot. Press H for a hint.` };
        if (id === target) {
          const reasoning = explainPath(t, v);
          const where = t.insert(v)!;
          const place = where.parent === null ? "as the root" : `as the ${where.side} child of ${where.parent}`;
          return { correct: true, feedback: `Correct. ${reasoning} ${v} is now inserted ${place}.` };
        }
        const why = divergence(t, v, slot?.parent?.value ?? null);
        return { correct: false, feedback: `Not quite. ${why} Press H for a hint, or Home to start again from the root.`.replace(/\s+/g, " ") };
      },
      hint: (cur) => treeHint(t, v, cur, "insert"),
    };
  }

  if (type === "find") {
    const candidates = values.filter((x) => x !== t.root?.value);
    const v = pick(candidates.length ? candidates : values, rand);
    return {
      type,
      prompt: `Find ${v}. Use the search rule: smaller values are to the left, larger values to the right. Answer when you are on it.`,
      slots: false,
      bestMoves: t.pathFor(v).length - 1,
      check(id) {
        const { node } = t.parse(id);
        if (node?.value === v) return { correct: true, feedback: `Correct, that is ${v}. ${explainPath(t, v)}` };
        const why = node ? divergence(t, v, node.value) : "";
        return { correct: false, feedback: `That is ${node ? node.value : "not a node"}, not ${v}. ${why} Press H for a hint.`.replace(/\s+/g, " ") };
      },
      hint: (cur) => treeHint(t, v, cur, "find"),
    };
  }

  const smallest = type === "min";
  const target = smallest ? Math.min(...values) : Math.max(...values);
  const dir: Side = smallest ? "left" : "right";
  const word = smallest ? "smallest" : "largest";
  return {
    type,
    prompt: `Find the ${word} value in the tree without checking every node. Answer when you are on it.`,
    slots: false,
    bestMoves: t.depth(t.get(target)!),
    check(id) {
      const { node } = t.parse(id);
      if (node?.value === target)
        return { correct: true, feedback: `Correct, ${target} is the ${word}. In a binary search tree you find it by going ${dir} until there is no ${dir} child.` };
      return { correct: false, feedback: `${node ? node.value : "That"} is not the ${word}. Press H for a hint.` };
    },
    hint(cur) {
      const { node } = t.parse(cur);
      if (!node) return "Press Home to go to the root.";
      const next = node[dir];
      return next
        ? `${smallest ? "Smaller" : "Larger"} values are always to the ${dir}. ${node.value} has a ${dir} child, so press ${arrow(dir)}.`
        : node.value === target
          ? `${node.value} has no ${dir} child, so nothing is ${smallest ? "smaller" : "larger"}. Press Enter.`
          : `Press Home to start at the root, then keep going ${dir}.`;
    },
  };
}

// ---------------------------------------------------------------- Stack

function stackQuestion(s: Stack, rand: Rand, avoid?: string): Question | null {
  const n = s.size();
  if (!n) return null;
  const types = n >= 3 ? ["peek", "pop", "pushpop"] : ["peek"];
  const options = types.filter((ty) => ty !== avoid);
  const type = pick(options.length ? options : types, rand);
  const topHint = "The top is the value pushed most recently. Press Home to jump to the top.";

  let prompt: string;
  let answerIndex: number;
  let explain: string;
  if (type === "peek") {
    prompt = "You are at the bottom of the stack. Which value would pop() return right now? Move to it and answer.";
    answerIndex = n - 1;
    explain = "pop() always returns the top, the value pushed most recently.";
  } else if (type === "pop") {
    // Keep the answer above the bottom, where the learner starts.
    const k = 1 + Math.floor(rand() * Math.min(n - 2, 3));
    answerIndex = n - 1 - k;
    prompt = `Imagine you call pop() ${k === 1 ? "once" : `${k} times`}. Which value would then be on top? Move to it and answer.`;
    explain = `Popping ${k === 1 ? "once" : `${k} times`} removes ${s.items.slice(answerIndex + 1).reverse().join(", ")}, leaving ${s.items[answerIndex]} on top.`;
  } else {
    const v = unusedValue(new Set(s.items), 1, 99, rand);
    const k = 2 + Math.floor(rand() * Math.min(n - 2, 2));
    // push v, then pop k: first pop removes v, the remaining k-1 pops remove original values.
    answerIndex = n - k;
    prompt = `Imagine you push ${v}, then call pop() ${k} times. Which of the values here would then be on top? Move to it and answer.`;
    explain = `The first pop removes ${v}, the one you just pushed. ${k - 1 === 1 ? "The next pop removes" : `The next ${k - 1} pops remove`} ${s.items
      .slice(answerIndex + 1)
      .reverse()
      .join(", ")}, leaving ${s.items[answerIndex]} on top.`;
  }

  return {
    type,
    prompt,
    slots: false,
    // Start at the bottom so the learner has to know where the top is.
    start: LinkedList.id(0),
    bestMoves: answerIndex,
    check(id) {
      const i = LinkedList.index(id);
      if (i === answerIndex) return { correct: true, feedback: `Correct, ${s.items[i]}. ${explain}` };
      return { correct: false, feedback: `Not ${i >= 0 ? s.items[i] : "that"}. Last in, first out: work down from the top. Press H for a hint.` };
    },
    hint(cur) {
      const i = LinkedList.index(cur);
      if (type === "peek") return i === n - 1 ? "You are on the top. Press Enter." : topHint;
      const steps = n - 1 - answerIndex;
      const fromTop = n - 1 - i;
      if (i === answerIndex) return "You are there. Press Enter.";
      return `Start at the top and count down one value for each value that gets removed. The answer is ${steps === 1 ? "1 step" : `${steps} steps`} below the top; you are ${fromTop === 0 ? "on the top" : `${fromTop} below the top`}.`;
    },
  };
}

// ---------------------------------------------------------------- Linked list

function listQuestion(l: LinkedList, rand: Rand, avoid?: string): Question | null {
  const n = l.size();
  if (!n) return null;
  const types = n >= 3 ? ["nth", "before", "delete"] : n >= 2 ? ["nth", "before"] : ["nth"];
  const options = types.filter((ty) => ty !== avoid);
  const type = pick(options.length ? options : types, rand);

  let prompt: string;
  let answer: number;
  let explain: string;
  if (type === "nth") {
    const k = n > 1 ? 2 + Math.floor(rand() * (n - 1)) : 1;
    answer = k - 1;
    prompt = `Go to the ${ordinal(k)} node, counting the head as the first. Answer when you are on it.`;
    explain = `A linked list has no index lookup, so reaching the ${ordinal(k)} node means following ${k - 1} next pointer${k - 1 === 1 ? "" : "s"} from the head.`;
  } else if (type === "before") {
    // Avoid the head (where the learner starts) when the list is long enough.
    answer = n >= 3 ? 1 + Math.floor(rand() * (n - 2)) : 0;
    prompt = `Which node's next pointer points to ${l.items[answer + 1]}? Move to it and answer.`;
    explain = `${l.items[answer]} comes right before ${l.items[answer + 1]}, so its next pointer leads there.`;
  } else {
    const del = 2 + Math.floor(rand() * (n - 2));
    answer = del - 1;
    const after = del + 1 < n ? String(l.items[del + 1]) : "null";
    prompt = `If you delete ${l.items[del]}, which node's next pointer has to change? Move to it and answer.`;
    explain = `${l.items[answer]} currently points to ${l.items[del]}. After the delete it must skip over it and point to ${after}.`;
  }

  return {
    type,
    prompt,
    slots: false,
    bestMoves: answer,
    check(id) {
      const i = LinkedList.index(id);
      if (i === answer) return { correct: true, feedback: `Correct, ${l.items[i]}. ${explain}` };
      return { correct: false, feedback: `Not ${i >= 0 ? l.items[i] : "that"}. Press H for a hint.` };
    },
    hint(cur) {
      const i = LinkedList.index(cur);
      if (i === answer) return "You are there. Press Enter.";
      const dist = answer - i;
      const where = `Move ${dist > 0 ? "right" : "left"} ${Math.abs(dist)} ${Math.abs(dist) === 1 ? "node" : "nodes"}.`;
      if (type === "nth") return `You are on node ${i + 1}. ${where}`;
      if (type === "before") return `Find ${l.items[answer + 1]} first, then step back one node to the left. ${where}`;
      return `The node to change is the one just before the deleted node, because its next pointer leads to it. ${where}`;
    },
  };
}

export function makeQuestion(s: Structure, rand: Rand = Math.random, avoid?: string): Question | null {
  if (s instanceof BST) return treeQuestion(s, rand, avoid);
  if (s instanceof Stack) return stackQuestion(s, rand, avoid);
  if (s instanceof LinkedList) return listQuestion(s, rand, avoid);
  return null;
}
