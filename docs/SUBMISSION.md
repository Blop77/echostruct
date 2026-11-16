# Devpost submission draft

Draft for the AccessED Hacks project page. Edit freely. Fill in the bracketed parts, and remove claims you can't stand behind.

**Name:** EchoStruct: Data Structures You Can Hear and Navigate

**Elevator pitch:** Blind CS students get diagrams their screen readers call "graphic." EchoStruct turns linked lists, stacks and trees into keyboard-navigable, sound-mapped structures they can explore and practice.

---

## Inspiration

Data structures are taught through pictures: boxes and arrows for linked lists, a pile for a stack, a branching drawing for a tree. For a student using a screen reader, that picture is often announced as "graphic", or summarised in one sentence that can't be explored. The structure, which is the whole point of the lesson, gets lost. We wanted a blind student to be able to walk a tree the way a sighted student traces it with a finger.

## The barrier, before and after

**Learner:** a blind student in an introductory data-structures course who uses a screen reader.
**Task:** "Where would 5 be inserted in this binary search tree?"

- **Before:** the tree is an image with alt text "graphic". The student can't trace a path from the root, so they depend on a sighted helper or skip the question.
- **After:** in EchoStruct they hear "8. Root. Depth 0. Left child 3, right child 10." They press the arrow keys to compare and descend until they hear "Empty right slot under 4", then press Enter: "Correct. 5 is less than 8, so go left. 5 is greater than 3, so go right. 5 is less than 6, so go left. 5 is greater than 4, so go right."

## What it does

- **Explore** a linked list, stack or binary search tree with the arrow keys. Each move announces the value first, then its role and neighbours.
- **Hear the structure:**
  - Pitch is position (tree depth, stack height, place in the list).
  - Stereo is left-to-right order.
  - Short ticks in the left or right ear tell you which children a node has.
- **Listen to the shape:** play the whole tree in sorted order. A balanced tree and a degenerate "chain" tree sound clearly different.
- **Practise** the questions exams ask, answered by navigating:
  - Tree: insert, find, minimum and maximum.
  - Stack: what pop returns, push/pop sequences.
  - Linked list: n-th node, predecessor, which pointer changes on delete.

  Hints reason at your current node. Wrong answers explain where the path went wrong.
- **Edit and build** your own structures. Every operation is explained in words.
- **Alternatives:**
  - A text outline for browse mode and braille.
  - On-screen move buttons for phone screen readers and switch users.
  - An optional built-in voice.
  - Brief or full announcements.
  - Large text and a high-contrast theme.
- **Works offline:** the whole app is one 59 KB HTML file with no network requests, so it can be shared over USB or chat.

## How we built it

TypeScript and Vite, with no runtime libraries.

- The structures, spoken descriptions and sound mapping live in a pure model module with unit tests.
- Sound is synthesised live with the Web Audio API.
- The explorer is a focusable `role="application"` region, so arrow and letter keys reach the app instead of the screen reader's browse mode.
- Announcements use alternating `aria-live` regions, so repeated text is still read.
- The visual diagram is hidden from screen readers; a semantic text outline replaces it.
- `vite-plugin-singlefile` bundles everything into one file.

## Challenges

- **Keys vs. screen readers:** screen readers use the arrow keys themselves. We used the application-region pattern and added on-screen buttons for touch screen readers that can't send arrow keys.
- **Sound that carries meaning:** we limited it to three ideas the learner can hold in their head (pitch = depth, ear = side, ticks = children) and wrote a sound guide and sound check.
- **Practice that teaches:** practice questions are answered by moving, not by multiple choice, so practice builds the same skill as exploring.
- **Testing with a real screen reader:** we recorded a full run with VoiceOver on macOS. Every announcement matched what we designed. VoiceOver also reads its own long built-in hint when you enter the explorer ("To interact with items in this group…"), which adds several seconds of speech. A web page can't switch that hint off, but users can turn hints off in VoiceOver Utility, and our testing notes now say so.

## Accomplishments

- Zero violations in an automated WCAG 2.2 AA check (axe-core) across all four colour themes.
- 27 unit tests covering the structures, descriptions and practice logic.
- Completed a full task with VoiceOver on macOS, recorded in the demo video: exploring the tree, hearing the path and overview, answering "Insert 5" by following the hints, and hearing a sorted-input tree as a chain of falling tones.

## What we learned

_Draft: rewrite in your own words before pasting._ Designing for a screen reader is mostly about order and brevity. Every announcement starts with the value, because that's what you need on every move, and the rest stays short. Testing with VoiceOver showed that the screen reader adds its own speech too, so the app's messages have to leave room for it. Sound only helped once each cue had one clear meaning: pitch for depth, ears for side, ticks for children.

## What's next

- Test with blind CS students and their instructors, and change the sound mapping based on what they find.
- More structures: queues, heaps, graphs, and hash tables.
- Step-through algorithm traces, for example "hear" an in-order traversal or a BST deletion.
- Let instructors share a structure from an assignment as a link or file.

## Limitations (be upfront)

- Tested by us with VoiceOver on macOS only. Not yet tested with blind students, NVDA, JAWS or phone screen readers.
- Linked lists, stacks and binary search trees only. No BST deletion.
- Stereo cues need headphones or stereo speakers.
- Practice progress isn't saved between visits.

## Credits and disclosures

- Built during AccessED Hacks, Nov 2026. No pre-existing code.
- Dev tools: TypeScript, Vite, vite-plugin-singlefile, Vitest, axe-core. No third-party code runs in the page.
- All example data is synthetic.
- AI assistance: Claude (Anthropic) helped write the code and documentation. **My role:** _fill in, keeping only what is true_: the idea and choice of learner and barrier; design decisions (for example which structures, practice by navigating, the sound mapping); directing and reviewing the build; testing with VoiceOver and recording the demo.

## Built with

typescript, vite, web-audio-api, web-speech-api, aria, html, css

## Checklist before submitting

- [ ] Add the demo link: https://blop77.github.io/echostruct/
- [ ] Add the source link: https://github.com/Blop77/echostruct
- [x] Screenshots: thumbnail and 7 gallery images (docs/media).
- [x] Demo video uploaded: https://youtu.be/XsFOKecf-OM (check the captions are corrected)
- [ ] Add every team member.
- [ ] Submit before **Nov 20, 5:00 PM ET**.
