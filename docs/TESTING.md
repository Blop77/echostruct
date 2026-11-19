# Testing EchoStruct

This page separates what has been checked from what still needs a person to check it.

## Done (Nov 16, 2026)

| Check | How | Result |
|---|---|---|
| Unit tests | `npm test` (Vitest): 27 tests covering navigation, spoken descriptions, paths, overviews, sound mapping, input parsing, and practice answers and hints | All pass |
| Type check | `tsc --noEmit` | No errors |
| Automated accessibility | axe-core 4.x, WCAG 2.0/2.1/2.2 A and AA plus best-practice rules, run in light, dark, high-contrast and system themes with Practice mode open | 0 violations. "Needs review": colour contrast of the numbers inside SVG nodes (dark text on white or yellow), checked by hand and passing |
| Keyboard-only flow | Explore with arrows/Home/S/P/O, switch with 1/2/3 and M, and answer practice questions by following only the spoken hints | Works for all three structures; insert questions update the tree |
| Phone width (375 px) | Browser emulation, dark mode | No horizontal page scroll; wide trees scroll inside the explorer and the current node scrolls into view; move buttons work |
| Offline build | `npm run build`, then served `dist/index.html` and listed network requests | One ~62 KB file; zero extra network requests |
| VoiceOver on macOS | Recorded end-to-end run on the live site ([2 min demo video](https://youtu.be/WgD1Ki2rn9k)), using only keyboard and VoiceOver output | Explore, path (P), overview (O), a practice **Insert 5** question answered by following hints, and the sorted-input shape tour (T) all worked. Every announcement in VoiceOver's caption panel matched the expected text. See the results table below |

## Not yet done (needs a person)

- **Other screen readers.** VoiceOver on macOS has been tested (see below). NVDA, JAWS, VoiceOver on iPhone and TalkBack have not.
- **Blind or low-vision learners.** No user testing yet. Don't claim learning gains.
- **The sounds by ear.** The audio code runs without errors, but whether the pitch and stereo mapping is easy to learn is untested.

## Manual screen-reader script (about 10 minutes)

Use headphones.

**macOS + VoiceOver (Safari or Chrome):** Cmd+F5 turns VoiceOver on. If arrow keys move the VoiceOver cursor instead of the app, make sure Quick Nav is off (press Left+Right arrows together).

**Windows + NVDA (Firefox or Chrome):** NVDA should switch to focus mode automatically when you Tab into the explorer. If not, press NVDA+Space.

1. Load the page. Press Tab: you hear "Skip to the explorer". Press Enter.
2. Tab to the explorer. Expected: "Binary search tree explorer, data structure explorer…", then the instructions, then "You are at 8. Root. Depth 0. Left child 3, right child 10."
3. Press ←, →. Expected: "3. Left child of 8…", then "6. Right child of 3. Depth 2. Left child 4, right child 7." Each move also plays a tone.
4. Press ↑ three times. Expected: "This is the root…" and a thud on the third press.
5. Press P, then O. Expected: the path from the root, then a level-by-level overview.
6. Press M. Expected: a practice question is read. Press H for hints and follow them; press Enter at the end. Expected: "Correct…" with the reasoning.
7. Press 2 (stack), then ↓ and Home. Press 1 (list), then → and End.
8. Press ?. The guide dialog opens with focus inside it. Escape closes it and returns focus.
9. In browse mode, read the "Text outline" section. The current node is marked "(you are here)".
10. Fill in "Build your own" with `1, 2, 3, 4, 5, 6` and press Build. Expected: "…this tree is really a chain…". Focus the explorer and press T to hear the descending tones.

Record what you hear and anything confusing. Put honest results in the Devpost "challenges" or "what we learned" section.

**iPhone + VoiceOver:** open the page, swipe to the move buttons (Parent, Left child…), double-tap to move, and confirm each announcement is spoken.

## Recording the evidence (for judges)

A short recording is the strongest proof that this works without sight.

macOS's built-in screen recorder (Cmd+Shift+5 or QuickTime) does **not** capture the computer's own sound. Either:

- **Simple:** use speakers rather than headphones, and record with the microphone on, so it picks up VoiceOver and the tones. The left/right ear cues are lost, but everything else comes through.
- **Clean audio:** record with OBS Studio (free). On macOS 13 or later, its "macOS Screen Capture" source records system audio directly.

Steps:

1. Open https://blop77.github.io/echostruct/ in Safari and press Cmd+Shift+R to load the latest version. Turn on Do Not Disturb.
2. Turn on VoiceOver with Cmd+F5. If arrow keys move the VoiceOver cursor instead of the app, press Left+Right arrows together to turn Quick Nav off.
3. Press Cmd+Shift+5, choose **Record Entire Screen**, set **Options → Microphone** to the built-in microphone, then click **Record**.
4. Tab to the explorer, press M for Practice, and complete one **Insert** question using only what you hear (H for hints). Then press T to play the tree's shape.
5. Stop the recording with Cmd+Ctrl+Esc. The video is saved to the Desktop.
6. Upload it to YouTube (Unlisted works), check the auto-generated captions, and paste the link into Devpost's "Video demo link".

Leave the screen visible in the recording so judges can follow along. To test truly without sight, do a separate run with VoiceOver's Screen Curtain on (Ctrl+Option+Fn+Shift+_ toggles it) and note the result in the table.

Fill in the table below, even if something went wrong. Honest results score better than claims.

| Date | Screen reader + browser | Task | Completed by ear? | What was confusing or broken |
|---|---|---|---|---|
| Nov 16, 2026 | VoiceOver on macOS (browser: _fill in_) | Explore tree (arrows, P, O), practice "Insert 5", load "Sorted input" and play T | Yes, with VoiceOver; screen visible in the recording | VoiceOver's own built-in hint ("Press Control-Option-Command-Slash… To interact with items in this group…") played after entering the explorer and added several seconds of speech. It comes from VoiceOver, not the app, and can be turned off in VoiceOver Utility → Verbosity → Hints. No app announcements were missing or read twice. |
| | VoiceOver + Screen Curtain (no sight) | Insert a value (practice) | | |
| | VoiceOver on iPhone | Move buttons on a list | | |
