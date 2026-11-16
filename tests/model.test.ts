import { describe, expect, it } from "vitest";
import { BST, LinkedList, Stack, parseValues } from "../src/model";
import { explainPath, makeQuestion } from "../src/practice";

const textbook = () => new BST([8, 3, 10, 1, 6, 14, 4, 7, 13]);

/** Deterministic "random" numbers for repeatable questions. */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe("BST", () => {
  it("keeps the search-tree order and ignores duplicates", () => {
    const t = new BST([8, 3, 10, 3, 1]);
    expect(t.values()).toEqual([1, 3, 8, 10]);
    expect(t.insert(8)).toBeNull();
  });

  it("navigates parent, children, sibling and root", () => {
    const t = textbook();
    expect(t.move("n:8", "left", false).id).toBe("n:3");
    expect(t.move("n:3", "right", false).id).toBe("n:6");
    expect(t.move("n:6", "up", false).id).toBe("n:3");
    expect(t.move("n:3", "sibling", false).id).toBe("n:10");
    expect(t.move("n:7", "home", false).id).toBe("n:8");
  });

  it("explains blocked moves instead of moving", () => {
    const t = textbook();
    expect(t.move("n:8", "up", false)).toEqual({ id: null, reason: "8 is the root. Nothing is above it." });
    expect(t.move("n:10", "left", false).reason).toBe("10 has no left child.");
  });

  it("only enters empty slots when slots are on", () => {
    const t = textbook();
    expect(t.move("n:10", "left", true).id).toBe("s:10:left");
    expect(t.move("s:10:left", "up", true).id).toBe("n:10");
    expect(t.move("s:10:left", "sibling", true).id).toBe("n:14");
  });

  it("describes nodes with value first, then role and children", () => {
    const t = textbook();
    expect(t.describe("n:6", false)).toBe("6. Right child of 3. Depth 2. Left child 4, right child 7.");
    expect(t.describe("n:4", false)).toBe("4. Leaf. Left child of 6. Depth 3. No children.");
    expect(t.describe("n:8", true)).toBe("8, root");
    expect(t.describe("s:10:left", false)).toBe("Empty left slot under 10.");
  });

  it("gives the path from the root", () => {
    expect(textbook().pathTo("n:7")).toBe("Path from the root: 8, left to 3, right to 6, right to 7.");
  });

  it("finds the insertion slot and explains each comparison", () => {
    const t = textbook();
    expect(t.insertionSlotId(5)).toBe("s:4:right");
    expect(t.insertionSlotId(6)).toBeNull();
    expect(explainPath(t, 5)).toBe(
      "5 is less than 8, so go left. 5 is greater than 3, so go right. 5 is less than 6, so go left. 5 is greater than 4, so go right.",
    );
  });

  it("notices a degenerate (chain) tree", () => {
    const chain = new BST([1, 2, 3, 4, 5, 6]);
    expect(chain.height()).toBe(5);
    expect(chain.minHeight()).toBe(2);
    expect(chain.overview()).toContain("really a chain");
  });

  it("maps depth to pitch, sorted position to pan, and children to ticks", () => {
    const t = textbook();
    const root = t.tone("n:8");
    const deep = t.tone("n:4");
    expect(root.semitone).toBeGreaterThan(t.tone("n:3").semitone);
    expect(t.tone("n:3").semitone).toBeGreaterThan(deep.semitone);
    expect(t.tone("n:1").pan).toBe(-1);
    expect(t.tone("n:14").pan).toBe(1);
    expect(root).toMatchObject({ cueLeft: true, cueRight: true, variant: "node" });
    expect(t.tone("n:10")).toMatchObject({ cueLeft: false, cueRight: true });
    expect(deep.variant).toBe("leaf");
  });
});

describe("LinkedList", () => {
  const l = () => new LinkedList([3, 12, 7, 9, 1]);
  it("describes head, middle and tail", () => {
    expect(l().describe("i:0", false)).toBe("3. Head, node 1 of 5. Next is 12.");
    expect(l().describe("i:2", false)).toBe("7. node 3 of 5. Next is 9.");
    expect(l().describe("i:4", false)).toBe("1. Tail, node 5 of 5. Next is null.");
  });
  it("blocks moving past the tail with a reason", () => {
    expect(l().move("i:4", "right").reason).toBe("1 is the tail. Its next pointer is null.");
    expect(l().move("i:0", "up").reason).toContain("single line");
  });
  it("counts steps along next pointers", () => {
    expect(l().pathTo("i:3")).toBe("From the head: 3, 12, 7, 9. That is 3 steps along next pointers.");
  });
});

describe("Stack", () => {
  const s = () => new Stack([2, 5, 4, 9]);
  it("starts on the top and describes neighbours", () => {
    expect(s().startId()).toBe("i:3");
    expect(s().describe("i:3", false)).toBe("9. Top of the stack, 1 of 4. Below: 4.");
    expect(s().describe("i:1", false)).toBe("5. Third from the top, 3 of 4. Above: 4. Below: 2.");
  });
  it("explains what must be popped to reach a value", () => {
    expect(s().pathTo("i:1")).toBe("To reach 5, you would pop 2 values first: 9, 4.");
  });
});

describe("parseValues", () => {
  it("accepts commas and spaces", () => expect(parseValues("8, 3 10;1").values).toEqual([8, 3, 10, 1]));
  it("rejects non-numbers with a helpful message", () =>
    expect(parseValues("8, x").error).toBe('"x" is not a whole number between -999 and 999.'));
  it("rejects empty input", () => expect(parseValues("  ").error).toBeTruthy());
});

describe("practice", () => {
  it("tree insert: accepts the right slot, inserts, and coaches a wrong one", () => {
    const t = textbook();
    const q = makeQuestion(t, seq(0, 0.6))!; // type "insert", value from range
    expect(q.type).toBe("insert");
    const v = Number(/Insert (-?\d+)/.exec(q.prompt)![1]);
    const target = t.insertionSlotId(v)!;
    const wrongSlot = target === "s:14:right" ? "s:1:left" : "s:14:right";
    const wrong = q.check(wrongSlot);
    expect(wrong.correct).toBe(false);
    expect(wrong.feedback).toMatch(/belongs in the (left|right) subtree/);
    expect(q.check("n:8").feedback).toContain("not an empty slot");
    const right = q.check(target);
    expect(right.correct).toBe(true);
    expect(t.get(v)).toBeDefined();
  });

  it("tree hints compare at the current node", () => {
    const t = textbook();
    const q = makeQuestion(t, seq(0.3, 0.4))!; // type "find"
    expect(q.type).toBe("find");
    const v = Number(/Find (-?\d+)/.exec(q.prompt)![1]);
    const h = q.hint("n:8");
    if (v === 8) expect(h).toContain("Press Enter");
    else expect(h).toContain(`${v} is ${v < 8 ? "less" : "greater"} than 8, so go ${v < 8 ? "left" : "right"}`);
  });

  it("stack pop question expects the right value", () => {
    const s = new Stack([2, 5, 4, 9]);
    const q = makeQuestion(s, seq(0.4, 0))!; // type "pop", k = 1
    expect(q.type).toBe("pop");
    expect(q.check("i:2").correct).toBe(true); // 4 is on top after popping 9
    expect(q.check("i:3").correct).toBe(false);
  });

  it("list delete question expects the node before the deleted one", () => {
    const l = new LinkedList([3, 12, 7, 9, 1]);
    const q = makeQuestion(l, seq(0.9, 0.3))!; // type "delete", deletes index 1 + floor(0.3 * 4) = 2 (value 7)
    expect(q.type).toBe("delete");
    expect(q.prompt).toContain("delete 7");
    expect(q.check("i:1").correct).toBe(true);
    expect(q.check("i:1").feedback).toContain("point to 9");
  });

  it("returns no question for an empty stack or list", () => {
    expect(makeQuestion(new Stack([]))).toBeNull();
    expect(makeQuestion(new LinkedList([]))).toBeNull();
  });
});
