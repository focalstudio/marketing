// Rain made with ffmpeg: a pink-noise rain bed over a brown-noise body, drips from a seeded scatter, a plink on each
// story beat (the drop landing), and one far-off rumble. Full level from frame 0 (the hook is heard at once), easing as
// the rain stops, faded out at the end.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rng } from "./ink.mjs";

export function rainArgv(path, dur, { beats = [], rumble = 6, easeFrom = dur - 6, seed = 7, drips = 22 } = {}) {
  const r = rng(seed), s = k => `:seed=${(seed * 31 + k) % 2 ** 31}`;
  const hits = [...beats.map(t => [t, 1]), ...Array.from({ length: drips }, () => [0.4 + r() * (dur - 2), 0.25 + r() * 0.3])];
  const argv = ["ffmpeg", "-v", "error", "-y",
    "-f", "lavfi", "-i", `anoisesrc=d=${dur}:c=pink:r=48000:a=0.6${s(0)}`,
    "-f", "lavfi", "-i", `anoisesrc=d=${dur}:c=brown:r=48000:a=0.8${s(1)}`];
  for (let i = 0; i < hits.length; i++) argv.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=0.5");
  const bed = `if(lt(t,${easeFrom}),1,max(0.35,1-0.65*(t-${easeFrom})/${dur - easeFrom}))`;
  const fg = [
    `[0]highpass=f=500,lowpass=f=7000,volume='0.55*${bed}':eval=frame[rain]`,
    `[1]lowpass=f=260,volume='0.25+0.9*exp(-pow((t-${rumble})/1.6,2))':eval=frame[body]`,
  ];
  hits.forEach(([at, gain], i) => {
    const hz = 900 + r() * 1400, ms = Math.round(at * 1000);
    fg.push(`[${i + 2}]aeval='${gain}*sin(2*PI*(${hz}+${hz}*1.5*exp(-t*40))*t)*exp(-t*28)':c=mono,adelay=${ms}|${ms}[d${i}]`);
  });
  fg.push(`[rain][body]${hits.map((_, i) => `[d${i}]`).join("")}amix=inputs=${hits.length + 2}:duration=first:normalize=0,` +
    `atrim=0:${dur},loudnorm=I=-18:TP=-2:LRA=9,aresample=48000,afade=t=out:st=${dur - 1.5}:d=1.5[out]`);
  return [...argv, "-filter_complex", fg.join(";"), "-map", "[out]", "-ac", "2", path];
}

// Sounds as code: every voice is an ffmpeg aeval expression of t (seconds since it starts), delayed into place.
function voices(events, base) {
  const args = [], filters = [], labels = [];
  events.forEach(({ at, dur = 0.6, expr, gain = 1 }, i) => {
    const ms = Math.round(at * 1000);
    args.push("-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`);
    filters.push(`[${base + i}]aeval='${gain}*(${expr})':c=mono,adelay=${ms}|${ms}[v${i}]`);
    labels.push(`[v${i}]`);
  });
  return { args, filters, labels };
}

const note = (hz, decay = 5) => `(sin(2*PI*${hz}*t)+0.3*sin(2*PI*${hz * 2}*t)*exp(-t*4))*exp(-t*${decay})`;
const boing = (lo, hi) => `sin(2*PI*(${lo}+${hi}*exp(-t*14))*t)*exp(-t*7)`;

// The focus_rabbit sound: a bouncy two-bar marimba loop with a bass, clock ticks while the session runs, a boing on each hop,
// a buzz for the phone, a thunk when it goes face down, a tap at the start and a chime at the end. Full level from frame 0.
export function toonArgv(path, dur, { buzz = [], hops = [], thunk, start, done, hog, sparkle, tickFrom, tickTo } = {}) {
  const arp = [523.25, 659.25, 783.99, 659.25, 1046.5, 783.99, 659.25, 783.99, 440, 523.25, 659.25, 523.25, 880, 659.25, 523.25, 659.25];
  const pick = arp.reduceRight((rest, hz, i) => (i === arp.length - 1 ? `${hz}` : `if(lt(ld(0),${i + 1}),${hz},${rest})`), "");
  const music = `st(0,floor(mod(t,4)/0.25));st(1,mod(t,0.25));st(2,${pick});st(3,if(lt(mod(t,4),2),130.81,110));` +
    `0.5*((sin(2*PI*ld(2)*t)+0.3*sin(2*PI*4*ld(2)*t)*exp(-ld(1)*12))*exp(-ld(1)*9)+0.9*sin(2*PI*ld(3)*t)*exp(-mod(t,0.5)*7))`;
  const tick = `0.3*sin(2*PI*2600*t)*exp(-mod(t,0.25)*200)*between(t,${tickFrom},${tickTo})`;
  const ev = [
    ...buzz.map(at => ({ at, dur: 0.55, gain: 0.5, expr: "sin(2*PI*170*t)*(0.55+0.45*sin(2*PI*28*t))*min(1,t*60)*min(1,(0.55-t)*40)" })),
    ...hops.map(at => ({ at: at + 0.15, dur: 0.5, gain: 0.55, expr: boing(220, 380) })),
    { at: thunk, dur: 0.4, gain: 1, expr: "sin(2*PI*85*t)*exp(-t*22)+0.4*(random(0)-0.5)*exp(-t*70)" },
    { at: start, dur: 0.8, gain: 0.7, expr: `${note(880, 9)}` },
    { at: done, dur: 1.4, gain: 0.7, expr: note(1046.5) },
    { at: done + 0.14, dur: 1.4, gain: 0.7, expr: note(1568) },
    ...[2093, 2637, 3136].map((hz, i) => ({ at: sparkle + i * 0.08, dur: 0.5, gain: 0.35, expr: note(hz, 12) })),
    { at: hog, dur: 0.5, gain: 0.5, expr: boing(300, 520) },
  ];
  const v = voices(ev, 2);
  const fg = [
    `[0]aeval='${music}':c=mono[music]`,
    `[1]aeval='${tick}':c=mono[tick]`,
    ...v.filters,
    `[music][tick]${v.labels.join("")}amix=inputs=${v.labels.length + 2}:duration=first:normalize=0,atrim=0:${dur},` +
      `loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,afade=t=out:st=${dur - 1.2}:d=1.2[out]`,
  ];
  return ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`, "-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`,
    ...v.args, "-filter_complex", fg.join(";"), "-map", "[out]", "-ac", "2", path];
}

// The last25 sound: a synthesised city (traffic rumble, hiss, a few horns, a far siren) at full level from frame 0, ducking
// and a riser into the impact, where the street cuts out at once; then a quiet "focus" bed (a soft pad, room tone and clock ticks)
// until the 25 minutes are done, a chime, and a chime on the closing card. No loudnorm: it would level out the drop at the
// impact, so the gains are set by hand and an alimiter guards the peaks.
export function cityArgv(path, dur, { impact, lapse, ticks = [], horns = [], siren = [0, 0], done, close, seed = 11 } = {}) {
  const s = k => `:seed=${(seed * 31 + k) % 2 ** 31}`, noise = (c, k) => ["-f", "lavfi", "-i", `anoisesrc=d=${dur}:c=${c}:r=48000:a=0.8${s(k)}`];
  const silent = ["-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`];
  const env = `if(lt(t,3.2),1,if(lt(t,${impact}),1-0.3*(t-3.2)/${impact - 3.2},max(0,1-(t-${impact})/0.12)))`;
  const focus = `clip((t-${impact})/2,0,1)*(1-clip((t-${done})/1.5,0,1))`;
  const ev = [
    { at: impact, dur: 1.4, gain: 1, expr: "sin(2*PI*60*t)*exp(-t*5)+0.5*(random(0)-0.5)*exp(-t*30)" },
    ...horns.map(at => ({ at, dur: 0.5, gain: 0.14, expr: "(sin(2*PI*410*t)+sin(2*PI*520*t))*min(1,t*40)*min(1,(0.5-t)*20)" })),
    ...ticks.map(at => ({ at, dur: 0.12, gain: 0.3, expr: "sin(2*PI*2000*t)*exp(-t*120)" })),
    { at: done, dur: 1.6, gain: 0.5, expr: note(1046.5) },
    { at: done + 0.14, dur: 1.6, gain: 0.5, expr: note(1568) },
    { at: close, dur: 1.6, gain: 0.4, expr: note(880, 4) },
  ];
  const v = voices(ev, 7);
  const fg = [
    `[0]lowpass=f=300,volume='0.9*(1+0.25*sin(2*PI*0.2*t))*${env}':eval=frame[rumble]`,
    `[1]highpass=f=800,lowpass=f=3000,volume='0.16*${env}':eval=frame[hiss]`,
    `[2]highpass=f=2000,volume='0.3*pow(clip((t-${impact - 1})/1,0,1),2)*between(t,${impact - 1},${impact})':eval=frame[riser]`,
    `[3]lowpass=f=400,volume='0.35*${focus}':eval=frame[room]`,
    `[4]aeval='(sin(2*PI*110*t)+0.8*sin(2*PI*164.81*t)+0.6*sin(2*PI*220*t)+0.4*sin(2*PI*277.18*t))*0.11*(0.8+0.2*sin(2*PI*0.25*t))*${focus}':c=mono[pad]`,
    `[5]aeval='0.1*sin(2*PI*850*t-250/0.7*cos(2*PI*0.7*t))*between(t,${siren[0]},${siren[1]})*min(1,(t-${siren[0]})*2)*min(1,(${siren[1]}-t)*2)*${env}':c=mono[siren]`,
    `[6]aeval='0.25*sin(2*PI*2600*t)*exp(-mod(t,0.25)*200)*between(t,${lapse.from},${lapse.to})':c=mono[tick]`,
    ...v.filters,
    `[rumble][hiss][riser][room][pad][siren][tick]${v.labels.join("")}amix=inputs=${v.labels.length + 7}:duration=first:normalize=0,` +
      `atrim=0:${dur},alimiter=limit=0.9,aresample=48000,afade=t=out:st=${dur - 1.5}:d=1.5[out]`,
  ];
  return ["ffmpeg", "-v", "error", "-y", ...noise("brown", 0), ...noise("pink", 1), ...noise("white", 2), ...noise("brown", 3), ...silent, ...silent, ...silent,
    ...v.args, "-filter_complex", fg.join(";"), "-map", "[out]", "-ac", "2", path];
}

// The studio_intro sound: a soft piano arpeggio over a low pad at 70 bpm (C, G, Am, F), a chime as the end card arrives. With a
// `voice` WAV (started `voiceAt` s in) the music ducks under it; without one it is music only, so drafts render before the voice exists.
export function introArgv(path, dur, { voice, voiceAt = 0, close, throw: toss, bpm = 70 } = {}) {
  const beat = 60 / bpm, chords = [[130.81, 261.63, 329.63, 392], [98, 246.94, 293.66, 392], [110, 261.63, 329.63, 440], [87.31, 261.63, 349.23, 440]];
  const ev = [];
  for (let i = 0; i * beat < dur - 2; i++) {
    const c = chords[Math.floor(i / 4) % 4], hz = [c[1], c[2], c[3], c[2]][i % 4];
    ev.push({ at: i * beat, dur: 2.6, gain: i % 4 ? 0.2 : 0.26, expr: note(hz, 2.2) });
    if (i % 4 === 0) ev.push({ at: i * beat, dur: 3.4, gain: 0.3, expr: note(c[0], 1.1) });
  }
  if (toss != null) ev.push({ at: toss, dur: 0.6, gain: 0.25, expr: "sin(2*PI*(500+1200*exp(-t*6))*t)*exp(-t*4)" });  // the whoosh of the throw
  ev.push({ at: close, dur: 1.8, gain: 0.35, expr: note(880, 3.5) }, { at: close + 0.14, dur: 1.8, gain: 0.3, expr: note(1318.5, 3.5) });
  const v = voices(ev, 1), vi = v.labels.length + 1;
  const pad = `aeval='(sin(2*PI*65.41*t)+0.7*sin(2*PI*130.81*t)+0.5*sin(2*PI*196*t)+0.3*sin(2*PI*329.63*t))*0.08*(0.85+0.15*sin(2*PI*0.12*t))*min(1,t/2)':c=mono[pad]`;
  const music = `[pad]${v.labels.join("")}amix=inputs=${v.labels.length + 1}:duration=first:normalize=0`;
  const tail = `atrim=0:${dur},loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,afade=t=out:st=${dur - 1.5}:d=1.5[out]`;
  const fg = [pad.replace("aeval", "[0]aeval"), ...v.filters];
  if (voice) {
    const ms = Math.round(voiceAt * 1000);
    fg.push(`${music},volume=0.8[mus]`,
      `[${vi}]aformat=channel_layouts=mono,aresample=48000,adelay=${ms}|${ms},apad=whole_dur=${dur},asplit=2[vk][vm]`,
      `[mus][vk]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=500[duck]`,
      `[duck][vm]amix=inputs=2:duration=first:normalize=0,${tail}`);
  } else fg.push(`${music},${tail}`);
  return ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`, ...v.args, ...(voice ? ["-i", voice] : []),
    "-filter_complex", fg.join(";"), "-map", "[out]", "-ac", "2", path];
}

// A lofi bed for the friendly videos: a swung 74 bpm beat (soft kick on 1 and 3, snare on 2 and 4, shuffled hats), a warm electric piano
// over Fmaj7, Em7, Dm7, Cmaj7 (restruck on beat 3) and a sine bass, tape wobble, a low-passed top and vinyl crackle. The story's own sounds
// sit on top: a buzz for each phone, a thunk when it goes face down, a boing per hop, a sparkle, a chime as the end card arrives.
// Full level from frame 0. No loudnorm (it left the full mix near-silent): a fixed gain and an alimiter set the level.
export function lofiArgv(path, dur, { bpm = 74, buzz = [], thunk, hops = [], sparkle, done } = {}) {
  const beat = 60 / bpm, bar = 4 * beat, swing = 0.62 * beat;
  const chords = [[174.61, 220, 261.63, 329.63], [164.81, 196, 246.94, 293.66], [146.83, 174.61, 220, 261.63], [130.81, 164.81, 196, 246.94]];
  const roots = [87.31, 82.41, 73.42, 65.41];
  const pick = hz => `if(eq(ld(0),0),${hz[0]},if(eq(ld(0),1),${hz[1]},if(eq(ld(0),2),${hz[2]},${hz[3]})))`;
  const keys = [0, 1, 2, 3].map(j => { const f = pick(chords.map(c => c[j])); return `(sin(2*PI*${f}*t)+0.3*sin(2*PI*2*${f}*t)*exp(-ld(1)*5))`; }).join("+");
  const piano = `st(0,mod(floor(t/${bar}),4));st(1,mod(t,${bar / 2}));st(2,if(lt(mod(t,${bar}),${bar / 2}),1,0.6));st(3,mod(t,${2 * beat}));` +
    `0.075*ld(2)*exp(-ld(1)*1.8)*min(1,ld(1)*70)*(${keys})+0.4*sin(2*PI*${pick(roots)}*t)*exp(-ld(3)*3)*min(1,ld(3)*50)`;
  const drums = `st(0,mod(t,${2 * beat}));st(1,mod(t-${beat},${2 * beat}));st(2,mod(t,${beat}));st(3,mod(t+${beat - swing},${beat}));` +
    `0.8*sin(2*PI*(52+60*exp(-ld(0)*25))*ld(0))*exp(-ld(0)*12)+gte(t,${beat})*((random(0)-0.5)*0.5*exp(-ld(1)*18)+0.25*sin(2*PI*190*ld(1))*exp(-ld(1)*25))+` +
    `(random(1)-0.5)*(0.22*exp(-ld(2)*70)+0.14*exp(-ld(3)*70))`;
  const crackle = `if(gt(random(2),0.9992),(random(3)-0.5)*0.35,0)+0.006*(random(4)-0.5)`;
  const ev = [
    ...buzz.map(at => ({ at, dur: 0.55, gain: 0.4, expr: "sin(2*PI*170*t)*(0.55+0.45*sin(2*PI*28*t))*min(1,t*60)*min(1,(0.55-t)*40)" })),
    { at: thunk, dur: 0.4, gain: 0.8, expr: "sin(2*PI*85*t)*exp(-t*22)+0.4*(random(0)-0.5)*exp(-t*70)" },
    ...hops.map(at => ({ at: at + 0.15, dur: 0.5, gain: 0.35, expr: boing(220, 380) })),
    ...[2093, 2637, 3136].map((hz, i) => ({ at: sparkle + i * 0.08, dur: 0.5, gain: 0.3, expr: note(hz, 12) })),
    { at: done, dur: 1.4, gain: 0.6, expr: note(1046.5) },
    { at: done + 0.14, dur: 1.4, gain: 0.6, expr: note(1568) },
  ];
  const v = voices(ev, 3);
  const fg = [
    `[0]aeval='${piano}':c=mono,vibrato=f=0.7:d=0.05[pn]`,
    `[1]aeval='${drums}':c=mono[dr]`,
    `[2]aeval='${crackle}':c=mono,highpass=f=1200[cr]`,
    ...v.filters,
    `[pn][dr]amix=inputs=2:duration=first:normalize=0,lowpass=f=4200[bed]`,
    `[bed][cr]${v.labels.join("")}amix=inputs=${v.labels.length + 2}:duration=first:normalize=0,atrim=0:${dur},` +
      `volume=1.15,alimiter=limit=0.84,aresample=48000,afade=t=out:st=${dur - 1.2}:d=1.2[out]`,
  ];
  return ["ffmpeg", "-v", "error", "-y", ...[0, 1, 2].flatMap(() => ["-f", "lavfi", "-i", `anullsrc=r=48000:cl=mono:d=${dur}`]),
    ...v.args, "-filter_complex", fg.join(";"), "-map", "[out]", "-ac", "2", path];
}

// A scene's `voice` is a repo path; it counts only once the WAV is there.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const introSound = (path, dur, s) => introArgv(path, dur, { ...s, voice: s.voice && existsSync(resolve(ROOT, s.voice)) ? resolve(ROOT, s.voice) : undefined });

const BUILDERS = { rain: rainArgv, toon: toonArgv, city: cityArgv, intro: introSound, lofi: lofiArgv };

// The ffmpeg argv for a scene's SOUND: its `kind` picks the builder ("rain" when absent, as rain_outside has no kind).
export const soundArgv = (path, dur, sound = {}) => BUILDERS[sound.kind || "rain"](path, dur, sound);
