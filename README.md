# EchoStruct

**Data structures you can hear and navigate.**

Blind and low-vision computer science students are often handed data-structure diagrams that a screen reader announces as just "graphic". EchoStruct turns linked lists, stacks and binary search trees into structures you can explore with the keyboard, hear as sound, and practise on.

**[▶ Try EchoStruct](https://blop77.github.io/echostruct/)** · works in any modern browser, and offline from a single downloaded file.

Built for [AccessED Hacks 2026](https://accessed-hacks.devpost.com/) (door: **Interact**, with **Connect** for offline use).

## The barrier, before and after

**Learner:** a blind student in an introductory data-structures course who uses a screen reader.

**Task:** answer *"Where would 5 be inserted in this binary search tree?"*

| | What happens |
|---|---|
| **Before** | The tree is an image with alt text "graphic", or at best one long sentence. The student cannot follow a path from the root, so they rely on a sighted helper or skip the question. |
| **After** | The student presses Tab into EchoStruct and hears *"8. Root. Depth 0. Left child 3, right child 10."* They press ← (*"3. Left child of 8…"*), →, ←, → until they reach *"Empty right slot under 4"* and press Enter: *"Correct. 5 is less than 8, so go left. 5 is greater than 3, so go right. 5 is less than 6, so go left. 5 is greater than 4, so go right. 5 is now inserted as the right child of 4."* |

## What it does

- **Explore** a linked list, stack or binary search tree with arrow keys. Every move announces the value first, then its role and neighbours.
- **Sound mapping** (Web Audio, no files):
  - Pitch shows position: tree depth, stack height, or place in the list.
  - Left/right stereo shows sorted position in a tree.
  - Ticks in the left or right ear show which children exist.
  - A thud means "nothing there".
- **Listen to the shape (T):** plays every node in order, so a lopsided tree sounds different from a balanced one.
- **Practice:** questions answered by navigating to a position and pressing Enter:
  - Tree: insert, find, minimum and maximum.
  - Stack: what pop returns, push/pop sequences.
  - Linked list: n-th node, predecessor, which pointer changes on delete.

  Hints compare at your current node ("7 is greater than 6, so go right"). Wrong answers explain where the path went wrong.
- **Change the structure:** append/insert/delete, push/pop/peek, BST insert and find with spoken reasoning. Build your own from typed values, or load examples, including a "sorted input" tree that degenerates into a chain.
- **Text outline** of the whole structure for browse mode and braille displays.
- **Move buttons** for touch screen readers (VoiceOver on iOS, TalkBack) and switch users, who can't send arrow keys.
- **Settings:**
  - Sound on/off and volume.
  - Brief or full announcements.
  - An optional built-in voice for learners who don't use a screen reader.
  - Text size.
  - Light, dark or high-contrast colours.
- **Works offline:** the build is one 59 KB HTML file (20 KB gzipped) that makes no network requests. Share it by USB, chat or email.

## Keys

| Key | Action |
|---|---|
| ← → | List: previous/next. Tree: left/right child |
| ↑ ↓ | Stack: towards top/bottom. Tree: ↑ parent |
| S | Tree: sibling |
| Home / End | Head/tail, top/bottom, root |
| Space or R | Repeat current position |
| P | Path from the start to here |
| O | Overview of the whole structure |
| T | Listen to the shape |
| Enter | Practice: answer here |
| H / N | Practice: hint / next question |
| 1 2 3 | Linked list / stack / tree |
| M | Explore ↔ Practice |
| ? | Keyboard and sound guide |

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for structures, descriptions and practice logic
npm run build      # dist/index.html: a single self-contained file
```

To use it offline, open `dist/index.html` directly in a browser. Nothing else is needed.

## How it works

- `src/model.ts`: linked list, stack and BST, plus navigation, spoken descriptions, paths, overviews, and the position-to-sound mapping. Pure functions, unit-tested.
- `src/practice.ts`: question generators, answer checking, hints and explanations.
- `src/audio.ts`: Web Audio synthesis for tones, cues and earcons.
- `src/render.ts`: SVG diagram for sighted classmates and teachers (hidden from screen readers) and the semantic text outline.
- `src/main.ts`: keyboard handling, live-region announcements, settings and UI.

Screen-reader approach: the explorer is a focusable `role="application"` region, so arrow and letter keys reach the app instead of the screen reader's browse mode. Announcements go to two alternating `aria-live="assertive"` regions, so repeated text is still spoken. The diagram is `aria-hidden`; the text outline is the semantic alternative.

## Testing

What has actually been checked is listed in [docs/TESTING.md](docs/TESTING.md), along with a manual screen-reader test script.

## Limitations

- Covers linked lists, stacks and binary search trees only. No graphs, heaps, or BST deletion yet.
- Not yet tested with blind students. See docs/TESTING.md for what has been tested.
- Stereo cues need headphones or stereo speakers. Pitch cues work on mono.
- Practice progress is not saved between visits. Settings are saved in the browser.
- The left arrow steps backwards through a linked list for convenience. The lesson text explains that a singly linked list can only follow `next`.

## Credits

- Built with [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vite.dev/) and bundled into one file with [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile). Tested with [Vitest](https://vitest.dev/) and [axe-core](https://github.com/dequelabs/axe-core). All are dev-time tools; none ships in the page.
- Sounds are synthesised with the Web Audio API. The optional voice uses the browser's Speech Synthesis API.
- All example data is made up. No student data is used.
- Development was assisted by Claude (Anthropic), an AI coding assistant.
- Created during AccessED Hacks (Oct 17 – Nov 20, 2026). No pre-existing code.

## License

MIT
