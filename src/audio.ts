// Sound mapping with the Web Audio API. No audio files; everything is synthesised,
// so it works offline and adds nothing to the download size.

import type { Tone } from "./model";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;
let enabled = true;

export function setSound(on: boolean, vol: number) {
  enabled = on;
  volume = vol;
  if (master) master.gain.value = volume;
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return { ctx, out: master! };
  } catch {
    return null;
  }
}

const freq = (semitone: number) => 440 * 2 ** (semitone / 12);

function blip(
  opts: { f: number; pan?: number; type?: OscillatorType; dur?: number; gain?: number; at?: number; slideTo?: number },
) {
  const a = audio();
  if (!a) return;
  const { ctx: c, out } = a;
  const t0 = c.currentTime + (opts.at ?? 0);
  const dur = opts.dur ?? 0.16;
  const osc = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(opts.f, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  p.pan.value = opts.pan ?? 0;
  const peak = opts.gain ?? 0.35;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(p).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** The sound for arriving at a position. */
export function playTone(t: Tone, at = 0) {
  const f = freq(t.semitone);
  switch (t.variant) {
    case "slot":
      // Hollow, airy: a soft square wave sliding down, meaning "nothing here yet".
      blip({ f, pan: t.pan, type: "square", dur: 0.22, gain: 0.08, at, slideTo: f * 0.7 });
      return;
    case "empty":
      blip({ f: 147, type: "sine", dur: 0.3, gain: 0.2, at });
      return;
    case "leaf":
      blip({ f, pan: t.pan, type: "sine", dur: 0.2, gain: 0.4, at });
      break;
    default:
      blip({ f, pan: t.pan, type: "triangle", dur: 0.18, gain: 0.4, at });
  }
  // Child / next cues: quick high ticks in the ear on that side.
  if (t.cueLeft) blip({ f: 1760, pan: -1, type: "sine", dur: 0.05, gain: 0.18, at: at + 0.1 });
  if (t.cueRight) blip({ f: 1760, pan: 1, type: "sine", dur: 0.05, gain: 0.18, at: at + (t.cueLeft ? 0.16 : 0.1) });
}

/** A dull thud: you tried to move somewhere that does not exist. */
export function playBump() {
  blip({ f: 98, type: "square", dur: 0.12, gain: 0.12 });
}

export function playCorrect() {
  blip({ f: freq(3), type: "sine", dur: 0.14, gain: 0.35 });
  blip({ f: freq(10), type: "sine", dur: 0.22, gain: 0.35, at: 0.12 });
}

export function playWrong() {
  blip({ f: freq(-2), type: "triangle", dur: 0.16, gain: 0.3 });
  blip({ f: freq(-6), type: "triangle", dur: 0.26, gain: 0.3, at: 0.14 });
}

let tourTimer: number | undefined;
/** Plays positions one after another. Returns a function that stops the tour. */
export function playTour(tones: Tone[], onStep?: (i: number) => void, gapMs = 260): () => void {
  stopTour();
  let i = 0;
  const step = () => {
    if (i >= tones.length) return stopTour();
    playTone(tones[i]);
    onStep?.(i);
    i++;
    tourTimer = window.setTimeout(step, gapMs);
  };
  step();
  return stopTour;
}
export function stopTour() {
  if (tourTimer !== undefined) window.clearTimeout(tourTimer);
  tourTimer = undefined;
}
