// Rain made with ffmpeg: a pink-noise rain bed over a brown-noise body, drips from a seeded scatter, a plink on each
// story beat (the drop landing), and one far-off rumble. Full level from frame 0 (the hook is heard at once), easing as
// the rain stops, faded out at the end.
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

const BUILDERS = { rain: rainArgv, toon: toonArgv, city: cityArgv };

// The ffmpeg argv for a scene's SOUND: its `kind` picks the builder ("rain" when absent, as rain_outside has no kind).
export const soundArgv = (path, dur, sound = {}) => BUILDERS[sound.kind || "rain"](path, dur, sound);
