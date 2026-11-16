import { BST, LinkedList, Stack, create, parseValues, type Dir, type Kind, type Structure } from "./model";
import { makeQuestion, type Question } from "./practice";
import { playBump, playCorrect, playTone, playTour, playWrong, setSound, stopTour } from "./audio";
import { renderDiagram, renderOutline } from "./render";

// ---------------------------------------------------------------- Elements

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const explorer = $("explorer");
const diagram = document.getElementById("diagram") as unknown as SVGSVGElement;
const instructions = $("explorer-instructions");
const statusText = $("status-text");
const liveA = $("live-a");
const liveB = $("live-b");
const livePolite = $("live-polite");
const practicePanel = $("practice-panel");
const questionEl = $("question");
const feedbackEl = $("feedback");
const scoreEl = $("score");
const outline = $("outline");
const lesson = $("lesson");
const help = $<HTMLDialogElement>("help");
const opValue = $<HTMLInputElement>("op-value");
const opButtons = $("op-buttons");
const opError = $("op-error");
const buildValues = $<HTMLTextAreaElement>("build-values");
const buildError = $("build-error");
const preset = $<HTMLSelectElement>("preset");

// ---------------------------------------------------------------- Content

const PRESETS: Record<Kind, { name: string; values: number[] }[]> = {
  tree: [
    { name: "Textbook tree (9 values)", values: [8, 3, 10, 1, 6, 14, 4, 7, 13] },
    { name: "Perfectly balanced (7 values)", values: [4, 2, 6, 1, 3, 5, 7] },
    { name: "Sorted input: a chain (6 values)", values: [1, 2, 3, 4, 5, 6] },
    { name: "Small (3 values)", values: [5, 3, 8] },
  ],
  list: [
    { name: "Five nodes", values: [3, 12, 7, 9, 1] },
    { name: "Ten nodes", values: [4, 8, 15, 16, 23, 42, 7, 11, 2, 30] },
    { name: "A single node", values: [42] },
  ],
  stack: [
    { name: "Four values", values: [2, 5, 4, 9] },
    { name: "Six values", values: [10, 20, 30, 40, 50, 60] },
    { name: "A single value", values: [7] },
  ],
};

const LESSONS: Record<Kind, string> = {
  list: `
    <p>A <strong>linked list</strong> is a chain of nodes. Each node holds a value and a pointer called <em>next</em> to the node after it.</p>
    <p>The first node is the <strong>head</strong>. The last node is the <strong>tail</strong>; its next pointer is <em>null</em>, meaning nothing.</p>
    <p>There is no jumping straight to the fifth node: a program starts at the head and follows next pointers one at a time. Press <kbd>P</kbd> to hear how many steps that took.</p>
    <p class="small">EchoStruct lets you step backwards with the Left arrow for convenience. In a singly linked list, a program can only follow next.</p>`,
  stack: `
    <p>A <strong>stack</strong> is a pile. You can only add to the top (<em>push</em>) or remove from the top (<em>pop</em>).</p>
    <p>That makes it <strong>last in, first out</strong>: the value pushed most recently is the first one popped.</p>
    <p>You use stacks every day: undo history, the browser back button, and the call stack that tracks which function is running in a program.</p>`,
  tree: `
    <p>A <strong>binary search tree</strong> stores values so they can be found quickly. Each node has at most two children, a left and a right.</p>
    <p><strong>The rule:</strong> everything in a node's left subtree is smaller than it, and everything in its right subtree is larger.</p>
    <p>To find or insert a value, start at the root and compare. Smaller: go left. Larger: go right. Each comparison skips a whole subtree.</p>
    <p><strong>Try this:</strong> load the example <q>Sorted input</q> and press <kbd>T</kbd>. Every tone steps lower: the tree has become a chain, and searching it is as slow as a list.</p>`,
};

const INSTRUCTIONS: Record<Kind, string> = {
  list: "Left and Right arrows move along the list. Home for the head, End for the tail. Space repeats. Question mark lists every key.",
  stack: "Up and Down arrows move through the stack. Home for the top, End for the bottom. Space repeats. Question mark lists every key.",
  tree: "Up arrow for the parent, Left and Right arrows for the children, S for the sibling, Home for the root. Space repeats. Question mark lists every key.",
};

const TOUR_ORDER: Record<Kind, string> = {
  list: "from head to tail",
  stack: "from top to bottom",
  tree: "in sorted order, from left to right. Listen to the pitch: it shows how deep each node is",
};

// ---------------------------------------------------------------- State

const structures: Record<Kind, Structure> = {
  list: new LinkedList(PRESETS.list[0].values),
  stack: new Stack(PRESETS.stack[0].values),
  tree: new BST(PRESETS.tree[0].values),
};
const cursor: Record<Kind, string> = {
  list: structures.list.startId(),
  stack: structures.stack.startId(),
  tree: structures.tree.startId(),
};
let kind: Kind = "tree";
let mode: "explore" | "practice" = "explore";
let question: Question | null = null;
let answered = false;
let moves = 0;
let wrongThisQuestion = 0;
let lastType: string | undefined;
const score = { answered: 0, firstTry: 0, hints: 0, number: 0 };
let touring = false;
/** Every pending audio timer, so switching tasks can silence everything at once. */
let tourTimers: number[] = [];
let soundCheckTimers: number[] = [];

interface Settings {
  sound: boolean;
  volume: number;
  brief: boolean;
  voice: boolean;
  rate: number;
  text: string;
  theme: string;
}
const DEFAULTS: Settings = { sound: true, volume: 0.6, brief: false, voice: false, rate: 1.1, text: "1", theme: "system" };
let settings: Settings = { ...DEFAULTS };
try {
  settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem("echostruct.settings") ?? "{}") };
} catch {
  /* storage unavailable: use defaults */
}

const current = () => structures[kind];
const slotsOn = () => mode === "practice" && !!question?.slots && !answered;

// ---------------------------------------------------------------- Speech

let flip = false;
/** polite: wait for the screen reader to finish what it is saying (used on focus). */
function announce(text: string, polite = false) {
  if (polite) {
    livePolite.textContent = "";
    window.setTimeout(() => (livePolite.textContent = text), 50);
  } else {
    livePolite.textContent = "";
    const [on, off] = flip ? [liveA, liveB] : [liveB, liveA];
    off.textContent = "";
    on.textContent = text;
    flip = !flip;
  }
  statusText.textContent = text;
  const voice = settings.voice ? localVoice() : null;
  if (voice) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = settings.rate;
    speechSynthesis.speak(u);
  }
}

/**
 * An on-device voice, or null. Some browsers also offer cloud voices that send the text to a
 * server; EchoStruct never uses those, so it stays private and works offline.
 */
function localVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const local = speechSynthesis.getVoices().filter((v) => v.localService);
  const en = local.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return en.find((v) => v.default) ?? en[0] ?? local.find((v) => v.default) ?? local[0] ?? null;
}

// ---------------------------------------------------------------- Rendering

function render() {
  const s = current();
  if (!s.has(cursor[kind]) || (!slotsOn() && cursor[kind].startsWith("s:") && s.size())) {
    // Position vanished (e.g. after a pop) or slots were hidden: fall back to a sensible spot.
    const parent = cursor[kind].startsWith("s:") ? cursor[kind].split(":")[1] : null;
    cursor[kind] = parent && s.has(`n:${parent}`) ? `n:${parent}` : s.startId();
  }
  renderDiagram(diagram, s, cursor[kind], slotsOn());
  renderOutline(outline, s, cursor[kind]);
  // Keep the current node visible when the diagram is wider than the screen.
  const cur = diagram.querySelector(".current");
  if (cur && explorer.scrollWidth > explorer.clientWidth) {
    const box = (cur as SVGGraphicsElement).getBoundingClientRect();
    const view = explorer.getBoundingClientRect();
    if (box.left < view.left || box.right > view.right) explorer.scrollLeft += box.left - view.left - view.width / 2 + box.width / 2;
  }
  explorer.setAttribute("aria-label", `${s.label} explorer${mode === "practice" ? ", practice mode" : ""}`);
  instructions.textContent = INSTRUCTIONS[kind] + (mode === "practice" ? " Enter answers, H gives a hint, N skips to the next question." : "");
}

function renderOps() {
  const ops: Record<Kind, { label: string; needsValue: boolean; run: (v: number) => string }[]> = {
    list: [
      {
        label: "Append",
        needsValue: true,
        run: (v) => {
          const l = structures.list as LinkedList;
          const i = l.append(v);
          cursor.list = LinkedList.id(i);
          return `Appended ${v} as the new tail. ${l.describe(cursor.list, false)}`;
        },
      },
      {
        label: "Insert after current",
        needsValue: true,
        run: (v) => {
          const l = structures.list as LinkedList;
          if (!l.size()) return run("Append", v);
          const i = l.insertAfter(LinkedList.index(cursor.list), v);
          cursor.list = LinkedList.id(i);
          return `Inserted ${v} after ${l.items[i - 1]}. ${l.describe(cursor.list, false)}`;
        },
      },
      {
        label: "Delete current",
        needsValue: false,
        run: () => {
          const l = structures.list as LinkedList;
          if (!l.size()) return "The list is already empty.";
          const i = LinkedList.index(cursor.list);
          const v = l.removeAt(i);
          const before = i > 0 ? l.items[i - 1] : null;
          const after = i < l.size() ? String(l.items[i]) : "null";
          cursor.list = l.size() ? LinkedList.id(Math.max(0, i - 1)) : "empty";
          return before === null
            ? `Deleted ${v}. The head now points to ${after}.`
            : `Deleted ${v}. ${before}'s next pointer now skips to ${after}.`;
        },
      },
    ],
    stack: [
      {
        label: "Push",
        needsValue: true,
        run: (v) => {
          const s = structures.stack as Stack;
          s.push(v);
          cursor.stack = s.startId();
          return `Pushed ${v}. It is now on top. ${s.size()} values.`;
        },
      },
      {
        label: "Pop",
        needsValue: false,
        run: () => {
          const s = structures.stack as Stack;
          const v = s.pop();
          cursor.stack = s.startId();
          if (v === undefined) return "The stack is empty, so there is nothing to pop.";
          return s.size() ? `Popped ${v}. The top is now ${s.items[s.topIndex()]}.` : `Popped ${v}. The stack is now empty.`;
        },
      },
      {
        label: "Peek",
        needsValue: false,
        run: () => {
          const s = structures.stack as Stack;
          return s.size() ? `The top is ${s.items[s.topIndex()]}. Peek looks without removing it.` : "The stack is empty.";
        },
      },
    ],
    tree: [
      {
        label: "Insert",
        needsValue: true,
        run: (v) => {
          const t = structures.tree as BST;
          if (t.get(v)) return `${v} is already in the tree. A binary search tree keeps each value once.`;
          const reasoning = t.pathFor(v).map((s) => `${v} is ${v < s.at ? "less" : "greater"} than ${s.at}, go ${s.dir}.`).join(" ");
          const where = t.insert(v)!;
          cursor.tree = BST.nodeId(v);
          return `${reasoning} Inserted ${v} ${where.parent === null ? "as the root" : `as the ${where.side} child of ${where.parent}`}.`;
        },
      },
      {
        label: "Find",
        needsValue: true,
        run: (v) => {
          const t = structures.tree as BST;
          const steps = t.pathFor(v);
          const reasoning = steps
            .map((s) => (s.dir === "found" ? `${v} equals ${s.at}.` : `${v} is ${v < s.at ? "less" : "greater"} than ${s.at}, go ${s.dir}.`))
            .join(" ");
          if (!t.get(v)) return `${reasoning} The ${steps.length ? "next spot is empty" : "tree is empty"}, so ${v} is not in the tree. That took ${steps.length} comparisons.`;
          cursor.tree = BST.nodeId(v);
          return `${reasoning} Found ${v} after ${steps.length} comparison${steps.length === 1 ? "" : "s"}, out of ${t.size()} values. You are now on it.`;
        },
      },
    ],
  };

  const run = (label: string, v: number): string => ops[kind].find((o) => o.label === label)!.run(v);

  opButtons.replaceChildren();
  for (const op of ops[kind]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = op.label;
    b.addEventListener("click", () => {
      opError.textContent = "";
      let v = NaN;
      if (op.needsValue) {
        const parsed = parseValues(opValue.value);
        if (parsed.error || parsed.values.length !== 1) {
          opError.textContent = parsed.error ?? "Enter a single whole number.";
          opValue.setAttribute("aria-invalid", "true");
          opValue.focus();
          return;
        }
        opValue.removeAttribute("aria-invalid");
        v = parsed.values[0];
      }
      const msg = op.run(v);
      afterChange(msg);
    });
    opButtons.appendChild(b);
  }
}

function afterChange(msg: string) {
  stopAudio();
  if (mode === "practice") {
    newQuestion(false);
    msg += ` The structure changed, so here is a new question. ${question?.prompt ?? ""}`;
  }
  render();
  playTone(current().tone(cursor[kind]));
  announce(msg);
}

function renderPresets() {
  preset.replaceChildren();
  const first = document.createElement("option");
  first.value = "";
  first.textContent = "Choose an example";
  preset.appendChild(first);
  PRESETS[kind].forEach((p, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = p.name;
    preset.appendChild(o);
  });
}

function renderScore() {
  scoreEl.textContent = score.answered
    ? `Answered ${score.answered}. First try: ${score.firstTry}. Hints used: ${score.hints}.`
    : "No questions answered yet.";
}

// ---------------------------------------------------------------- Navigation

function goTo(id: string) {
  cursor[kind] = id;
  render();
  playTone(current().tone(id));
  announce(current().describe(id, settings.brief));
}

function move(dir: Dir) {
  const r = current().move(cursor[kind], dir, slotsOn());
  if (r.id) {
    if (mode === "practice" && !answered) moves++;
    goTo(r.id);
  } else {
    playBump();
    announce(r.reason ?? "Nothing there.");
  }
}

const MOVE_BUTTONS: Record<Kind, [string, Dir][]> = {
  list: [["Previous", "left"], ["Next", "right"], ["Head", "home"], ["Tail", "end"]],
  stack: [["Up, towards the top", "up"], ["Down, towards the bottom", "down"], ["Top", "home"], ["Bottom", "end"]],
  tree: [["Parent", "up"], ["Left child", "left"], ["Right child", "right"], ["Sibling", "sibling"], ["Root", "home"]],
};

/** On-screen equivalents of the keys, so touch screen readers (VoiceOver on iOS, TalkBack) and switch users can explore too. */
function renderMoveButtons() {
  const box = $("move-buttons");
  box.replaceChildren();
  const add = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", fn);
    box.appendChild(b);
  };
  for (const [label, dir] of MOVE_BUTTONS[kind]) add(label, () => move(dir));
  add("Where am I?", () => {
    announce(`${current().describe(cursor[kind], false)} ${current().pathTo(cursor[kind])}`);
    playTone(current().tone(cursor[kind]));
  });
  if (mode === "practice") add("Answer here", answer);
}

function setKind(k: Kind, speak = true) {
  stopAudio();
  kind = k;
  (document.querySelector(`input[name=kind][value=${k}]`) as HTMLInputElement).checked = true;
  lesson.innerHTML = LESSONS[k];
  renderOps();
  renderMoveButtons();
  renderPresets();
  if (mode === "practice") newQuestion(false);
  render();
  if (speak) {
    const s = current();
    const intro = `${s.label}. ${s.describe(cursor[k], settings.brief)}`;
    announce(mode === "practice" && question ? `${intro} Question: ${question.prompt}` : intro);
    playTone(s.tone(cursor[k]));
  }
}

function setMode(m: "explore" | "practice", speak = true) {
  stopAudio();
  mode = m;
  (document.querySelector(`input[name=mode][value=${m}]`) as HTMLInputElement).checked = true;
  practicePanel.hidden = m !== "practice";
  renderMoveButtons();
  if (m === "practice") newQuestion(speak);
  else {
    question = null;
    render();
    if (speak) announce(`Explore mode. ${current().describe(cursor[kind], settings.brief)}`);
  }
}

// ---------------------------------------------------------------- Practice

function newQuestion(speak = true) {
  stopAudio();
  question = makeQuestion(current(), Math.random, lastType);
  answered = false;
  moves = 0;
  wrongThisQuestion = 0;
  feedbackEl.textContent = "";
  if (!question) {
    questionEl.textContent = `This ${current().label.toLowerCase()} is empty. Add some values to get questions.`;
    render();
    if (speak) announce(questionEl.textContent);
    return;
  }
  lastType = question.type;
  // Skipped questions don't count, so the number tracks real progress.
  score.number = score.answered + 1;
  questionEl.textContent = `Question ${score.number}: ${question.prompt}`;
  cursor[kind] = question.start ?? current().startId();
  render();
  renderScore();
  if (speak) {
    playTone(current().tone(cursor[kind]));
    announce(`${questionEl.textContent} You are at ${current().describe(cursor[kind], true)}.`);
  }
}

function answer() {
  if (mode !== "practice") return announce("Enter answers questions in Practice mode. Press M to switch to Practice.");
  if (!question) return announce(questionEl.textContent ?? "");
  if (answered) return announce("You have answered this one. Press N for the next question.");
  const r = question.check(cursor[kind]);
  let msg = r.feedback;
  if (r.correct) {
    answered = true;
    score.answered++;
    if (!wrongThisQuestion) score.firstTry++;
    if (question.bestMoves !== undefined && moves > question.bestMoves)
      msg += ` You used ${moves} moves; the shortest route is ${question.bestMoves}.`;
    msg += " Press N for the next question.";
    if (question.type === "insert") {
      // The value was inserted by check(); land on it.
      const v = /Insert (-?\d+)/.exec(question.prompt)?.[1];
      if (v) cursor.tree = BST.nodeId(Number(v));
    }
    render();
    playCorrect();
  } else {
    wrongThisQuestion++;
    playWrong();
  }
  feedbackEl.textContent = msg;
  renderScore();
  announce(msg);
}

function hint() {
  if (mode !== "practice" || !question) return announce("Hints are for Practice mode. Press M to switch.");
  if (answered) return announce("You have answered this one. Press N for the next question.");
  score.hints++;
  renderScore();
  const h = question.hint(cursor[kind]);
  feedbackEl.textContent = `Hint: ${h}`;
  announce(h);
}

// ---------------------------------------------------------------- Tour

/** Silences the shape tour and the sound check, including anything scheduled but not yet played. */
function stopAudio(): boolean {
  const wasTouring = touring;
  stopTour();
  for (const t of [...tourTimers, ...soundCheckTimers]) window.clearTimeout(t);
  tourTimers = [];
  soundCheckTimers = [];
  touring = false;
  if (wasTouring) render();
  return wasTouring;
}

function tour() {
  if (stopAudio()) return announce("Stopped.");
  const s = current();
  const ids = s.tour();
  if (!ids.length) return announce("Nothing to play: the structure is empty.");
  touring = true;
  announce(`Playing ${ids.length} nodes ${TOUR_ORDER[kind]}.`);
  const tones = ids.map((id) => s.tone(id));
  // Give the screen reader a moment to start speaking before the tones begin.
  tourTimers.push(
    window.setTimeout(() => {
      if (!touring) return;
      playTour(tones, (i) => {
        renderDiagram(diagram, s, ids[i], false);
        if (i === ids.length - 1)
          tourTimers.push(
            window.setTimeout(() => {
              touring = false;
              render();
            }, 300),
          );
      });
    }, 900),
  );
}

// ---------------------------------------------------------------- Keyboard

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Home: "home",
  End: "end",
  s: "sibling",
  S: "sibling",
};

explorer.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key !== "t" && e.key !== "T" && e.key !== "Tab") stopAudio();
  const dir = KEY_DIRS[e.key];
  let handled = true;
  if (dir) move(dir);
  else
    switch (e.key) {
      case " ":
      case "r":
      case "R":
        announce(current().describe(cursor[kind], false));
        playTone(current().tone(cursor[kind]));
        break;
      case "p":
      case "P":
        announce(current().pathTo(cursor[kind]));
        break;
      case "o":
      case "O":
        announce(current().overview());
        break;
      case "t":
      case "T":
        tour();
        break;
      case "Enter":
        answer();
        break;
      case "h":
      case "H":
        hint();
        break;
      case "n":
      case "N":
        if (mode === "practice") newQuestion();
        else announce("N gives a new question in Practice mode. Press M to switch.");
        break;
      case "m":
      case "M":
        setMode(mode === "explore" ? "practice" : "explore");
        break;
      case "1":
        setKind("list");
        break;
      case "2":
        setKind("stack");
        break;
      case "3":
        setKind("tree");
        break;
      case "?":
      case "F1":
        help.showModal();
        break;
      default:
        handled = false;
    }
  if (handled) e.preventDefault();
});

let focusTimer: number | undefined;
explorer.addEventListener("focus", () => {
  // Let the screen reader read the explorer's name and instructions first.
  window.clearTimeout(focusTimer);
  focusTimer = window.setTimeout(() => {
    if (document.activeElement !== explorer) return;
    const where = `You are at ${current().describe(cursor[kind], settings.brief)}`;
    announce(mode === "practice" && question && !answered ? `${questionEl.textContent} ${where}` : where, true);
  }, 300);
});
explorer.addEventListener("keydown", () => window.clearTimeout(focusTimer), { capture: true });

// Mouse support for sighted helpers: click a node to move there.
diagram.addEventListener("click", (e) => {
  const g = (e.target as Element).closest("[data-id]");
  explorer.focus({ preventScroll: true });
  window.clearTimeout(focusTimer);
  if (g) goTo(g.getAttribute("data-id")!);
});

// ---------------------------------------------------------------- Controls

document.querySelectorAll<HTMLInputElement>("input[name=kind]").forEach((r) =>
  r.addEventListener("change", () => r.checked && setKind(r.value as Kind)),
);
document.querySelectorAll<HTMLInputElement>("input[name=mode]").forEach((r) =>
  r.addEventListener("change", () => r.checked && setMode(r.value as "explore" | "practice")),
);
$("hint-btn").addEventListener("click", hint);
$("next-btn").addEventListener("click", () => newQuestion());
$("tour-btn").addEventListener("click", tour);
$("overview-btn").addEventListener("click", () => announce(current().overview()));
$("help-btn").addEventListener("click", () => help.showModal());
$("op-form").addEventListener("submit", (e) => e.preventDefault());

function build(values: number[], label: string) {
  stopAudio();
  structures[kind] = create(kind, values);
  cursor[kind] = structures[kind].startId();
  const s = current();
  const dupes = values.length - s.size();
  const note = dupes > 0 ? ` ${dupes} duplicate value${dupes === 1 ? " was" : "s were"} skipped, because a binary search tree keeps each value once.` : "";
  if (mode === "practice") newQuestion(false);
  render();
  announce(`${label}.${note} ${s.overview()} Focus the explorer to start.`);
}

$("build-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const parsed = parseValues(buildValues.value);
  if (parsed.error) {
    buildError.textContent = parsed.error;
    buildValues.setAttribute("aria-invalid", "true");
    buildValues.focus();
    return;
  }
  buildError.textContent = "";
  buildValues.removeAttribute("aria-invalid");
  build(parsed.values, `Built a ${current().label.toLowerCase()}`);
});

preset.addEventListener("change", () => {
  if (preset.value === "") return;
  const p = PRESETS[kind][Number(preset.value)];
  buildValues.value = p.values.join(", ");
  build(p.values, `Loaded ${p.name}`);
});

$("try-tree").addEventListener("click", () => {
  setMode("explore", false);
  setKind("tree", false);
  structures.tree = new BST(PRESETS.tree[0].values);
  cursor.tree = structures.tree.startId();
  render();
  explorer.scrollIntoView({ block: "center" });
  explorer.focus({ preventScroll: true });
});

// ---------------------------------------------------------------- Settings

function applySettings() {
  setSound(settings.sound, settings.volume);
  document.documentElement.style.setProperty("--scale", settings.text);
  if (settings.theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = settings.theme;
  try {
    localStorage.setItem("echostruct.settings", JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const setSoundEl = $<HTMLInputElement>("set-sound");
const setVolume = $<HTMLInputElement>("set-volume");
const setBrief = $<HTMLInputElement>("set-brief");
const setVoice = $<HTMLInputElement>("set-voice");
const setRate = $<HTMLInputElement>("set-rate");
const setText = $<HTMLSelectElement>("set-text");
const setTheme = $<HTMLSelectElement>("set-theme");
setSoundEl.checked = settings.sound;
setVolume.value = String(settings.volume);
setBrief.checked = settings.brief;
setVoice.checked = settings.voice;
setRate.value = String(settings.rate);
setText.value = settings.text;
setTheme.value = settings.theme;
setVolume.setAttribute("aria-valuetext", `${Math.round(settings.volume * 100)} percent`);
setRate.setAttribute("aria-valuetext", `${settings.rate} times`);
function updateVoiceAvailability() {
  const help = $("voice-help");
  if (!("speechSynthesis" in window)) {
    setVoice.disabled = true;
    help.textContent = "This browser has no built-in voice. Use your screen reader.";
    return;
  }
  // The voice list loads asynchronously; only decide once it has arrived.
  if (!speechSynthesis.getVoices().length) return;
  if (!localVoice()) {
    setVoice.checked = false;
    setVoice.disabled = true;
    settings.voice = false;
    help.textContent =
      "This browser only offers online voices, which would send what you hear to a server, so the built-in voice is turned off. Use your screen reader.";
  }
}
updateVoiceAvailability();
if ("speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", updateVoiceAvailability);

$("settings").addEventListener("input", () => {
  settings = {
    sound: setSoundEl.checked,
    volume: Number(setVolume.value),
    brief: setBrief.checked,
    voice: setVoice.checked,
    rate: Number(setRate.value),
    text: setText.value,
    theme: setTheme.value,
  };
  setVolume.setAttribute("aria-valuetext", `${Math.round(settings.volume * 100)} percent`);
  setRate.setAttribute("aria-valuetext", `${settings.rate} times`);
  applySettings();
});

$("sound-check").addEventListener("click", () => {
  // Restart instead of overlapping if pressed again; also stops a running tour.
  stopAudio();
  const t = new BST([8, 3, 10, 1, 6, 14, 4, 7, 13]);
  const steps: [string, () => void][] = [
    ["Root, depth 0: the highest pitch. Ticks in both ears: it has two children.", () => playTone(t.tone("n:8"))],
    ["Depth 1, on the left: one step lower.", () => playTone(t.tone("n:3"))],
    ["Depth 2.", () => playTone(t.tone("n:6"))],
    ["Depth 3, a leaf: no ticks.", () => playTone(t.tone("n:4"))],
    ["A node far to the right: you hear it in your right ear.", () => playTone(t.tone("n:14"))],
    ["An empty slot.", () => playTone(t.tone("s:13:left"))],
    ["Nothing in that direction.", playBump],
    ["Correct answer.", playCorrect],
    ["Try again.", playWrong],
  ];
  if (!settings.sound) return announce("Sound mapping is off. Turn it on to hear the sound check.");
  steps.forEach(([text, play], i) =>
    soundCheckTimers.push(
      window.setTimeout(() => {
        announce(text);
        soundCheckTimers.push(window.setTimeout(play, 500));
      }, i * 3200),
    ),
  );
});

// ---------------------------------------------------------------- "Before" diagram

function beforeImage() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  renderDiagram(svg, new BST(PRESETS.tree[0].values), "", false);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent =
    "circle{fill:#fff;stroke:#334;stroke-width:2}.edge{stroke:#334;stroke-width:2}text{font:600 18px sans-serif;fill:#112}";
  svg.prepend(style);
  ($("before-img") as HTMLImageElement).src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
}

// ---------------------------------------------------------------- Start

applySettings();
beforeImage();
setKind("tree", false);
setMode("explore", false);
renderScore();
