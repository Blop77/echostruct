// Visual diagram (for sighted classmates, teachers and low-vision learners) and a
// semantic text outline (for screen-reader browse mode and braille displays).

import { BST, LinkedList, Stack, type Structure, type TNode } from "./model";

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

function nodeShape(
  g: SVGGElement,
  x: number,
  y: number,
  label: string,
  id: string,
  current: string,
  shape: "circle" | "rect",
  extraClass = "",
  r = 22,
) {
  const grp = el("g", { class: `node ${extraClass}${id === current ? " current" : ""}`, "data-id": id }, g);
  if (id === current) {
    if (shape === "circle") el("circle", { cx: x, cy: y, r: r + 9, class: "halo" }, grp);
    else el("rect", { x: x - 40, y: y - 28, width: 80, height: 56, rx: 12, class: "halo" }, grp);
  }
  if (shape === "circle") el("circle", { cx: x, cy: y, r }, grp);
  else el("rect", { x: x - 32, y: y - 20, width: 64, height: 40, rx: 6 }, grp);
  const t = el("text", { x, y: y + 1, "text-anchor": "middle", "dominant-baseline": "middle" }, grp);
  t.textContent = label;
  return grp;
}

export function renderDiagram(svg: SVGSVGElement, s: Structure, current: string, slots: boolean) {
  svg.replaceChildren();
  const g = el("g", {}, svg);
  let w = 400;
  let h = 160;

  if (s instanceof BST) {
    const order = s.inorder();
    const step = 64;
    const levelH = 76;
    const pos = new Map<TNode, { x: number; y: number }>();
    order.forEach((n, i) => pos.set(n, { x: 50 + i * step, y: 44 + s.depth(n) * levelH }));
    w = Math.max(400, 100 + Math.max(0, order.length - 1) * step);
    h = 88 + Math.max(0, s.height()) * levelH + (slots ? levelH : 0);
    // Edges first so nodes sit on top.
    for (const n of order) {
      const p = pos.get(n)!;
      for (const c of [n.left, n.right]) {
        if (!c) continue;
        const q = pos.get(c)!;
        el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "edge" }, g);
      }
    }
    if (slots) {
      for (const n of order) {
        const p = pos.get(n)!;
        for (const side of ["left", "right"] as const) {
          if (n[side]) continue;
          const sx = p.x + (side === "left" ? -step / 3 : step / 3);
          const sy = p.y + levelH * 0.62;
          el("line", { x1: p.x, y1: p.y, x2: sx, y2: sy, class: "edge slot-edge" }, g);
          nodeShape(g, sx, sy, "", BST.slotId(n.value, side), current, "circle", "slot", 11);
        }
      }
    }
    if (!order.length) nodeShape(g, w / 2, 60, "empty", "s:root", current, "circle", "slot");
    for (const n of order) {
      const p = pos.get(n)!;
      nodeShape(g, p.x, p.y, String(n.value), BST.nodeId(n.value), current, "circle");
    }
  } else if (s instanceof LinkedList) {
    const step = 110;
    const y = 70;
    const n = s.items.length;
    w = Math.max(400, 90 + n * step + 40);
    h = 150;
    s.items.forEach((v, i) => {
      const x = 56 + i * step;
      el("line", { x1: x + 32, y1: y, x2: x + step - 40, y2: y, class: "edge", "marker-end": "url(#arrow)" }, g);
      nodeShape(g, x, y, String(v), LinkedList.id(i), current, "rect");
      if (i === 0) {
        const t = el("text", { x, y: y - 40, "text-anchor": "middle", class: "tag" }, g);
        t.textContent = "head";
      }
    });
    const nx = 56 + n * step - 10;
    const nt = el("text", { x: nx, y: y + 1, "text-anchor": "middle", "dominant-baseline": "middle", class: "tag" }, g);
    nt.textContent = n ? "null" : "head → null";
    if (!n) nodeShape(g, 56, y, "", "empty", current, "rect", "slot");
  } else if (s instanceof Stack) {
    const n = s.items.length;
    const step = 52;
    w = 400;
    h = Math.max(160, 60 + n * step);
    const x = w / 2;
    for (let i = n - 1; i >= 0; i--) {
      const y = 40 + (n - 1 - i) * step;
      nodeShape(g, x, y, String(s.items[i]), LinkedList.id(i), current, "rect");
      if (i === n - 1) {
        const t = el("text", { x: x - 62, y: y + 1, "text-anchor": "end", "dominant-baseline": "middle", class: "tag" }, g);
        t.textContent = "top →";
      }
    }
    if (!n) {
      const t = el("text", { x, y: 70, "text-anchor": "middle", class: "tag" }, g);
      t.textContent = "empty stack";
    }
  }

  const defs = el("defs", {}, svg);
  const marker = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto-start-reverse" }, defs);
  el("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "arrowhead" }, marker);

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.style.aspectRatio = `${w} / ${h}`;
  svg.style.maxWidth = `${Math.max(w, 400)}px`;
}

// ---------------------------------------------------------------- Text outline

function li(text: string, id: string, current: string) {
  const item = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text;
  if (id === current) {
    item.setAttribute("aria-current", "true");
    span.textContent = `${text} (you are here)`;
  }
  item.appendChild(span);
  return item;
}

export function renderOutline(root: HTMLElement, s: Structure, current: string) {
  root.replaceChildren();
  if (!s.size()) {
    const p = document.createElement("p");
    p.textContent = s.overview();
    root.appendChild(p);
    return;
  }
  if (s instanceof BST) {
    const build = (n: TNode, label: string): HTMLLIElement => {
      const item = li(`${label}${n.value}`, BST.nodeId(n.value), current);
      if (n.left || n.right) {
        const ul = document.createElement("ul");
        ul.appendChild(n.left ? build(n.left, "Left: ") : li("Left: empty", "", current));
        ul.appendChild(n.right ? build(n.right, "Right: ") : li("Right: empty", "", current));
        item.appendChild(ul);
      }
      return item;
    };
    const ul = document.createElement("ul");
    ul.appendChild(build(s.root!, "Root: "));
    root.appendChild(ul);
  } else if (s instanceof LinkedList) {
    const ol = document.createElement("ol");
    s.items.forEach((v, i) => {
      const role = i === 0 ? " (head)" : i === s.items.length - 1 ? " (tail, next is null)" : "";
      ol.appendChild(li(`${v}${role}`, LinkedList.id(i), current));
    });
    root.appendChild(ol);
  } else if (s instanceof Stack) {
    const ol = document.createElement("ol");
    for (let i = s.items.length - 1; i >= 0; i--) {
      const role = i === s.items.length - 1 ? " (top)" : i === 0 ? " (bottom)" : "";
      ol.appendChild(li(`${s.items[i]}${role}`, LinkedList.id(i), current));
    }
    root.appendChild(ol);
  }
}
