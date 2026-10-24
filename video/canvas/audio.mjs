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
