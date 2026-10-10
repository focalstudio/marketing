"""Soundtrack synthesised with ffmpeg: brown-noise wind, a pink-noise gust and sine chimes from the storyboard.

ffmpeg's noise sources are randomly seeded, so the WAV differs run to run; the filter graph (audio_argv) is what is fixed.
"""
import subprocess


def audio_argv(path, dur, chimes, gust):
    """chimes: [(seconds, Hz)]; gust: seconds where the wind swells. -> ffmpeg argv writing a stereo WAV to path."""
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anoisesrc=d={dur}:c=brown:r=44100:a=0.7",
           "-f", "lavfi", "-i", f"anoisesrc=d={dur}:c=pink:r=44100:a=0.4"]
    for _ in chimes:
        cmd += ["-f", "lavfi", "-i", "sine=f=440:d=1.6:r=44100"]
    fg = [f"[0]lowpass=f=450,volume='0.5+0.7*exp(-pow((t-{gust})/1.4,2))':eval=frame[w]",
          f"[1]bandpass=f=1200:width_type=h:w=900,volume='0.02+0.28*exp(-pow((t-{gust})/0.9,2))':eval=frame[g]"]
    for i, (at, hz) in enumerate(chimes):
        ms = int(at * 1000)
        fg.append(f"[{i + 2}]aeval='0.5*sin(2*PI*{hz}*t)+0.15*sin(2*PI*{hz * 2}*t)':c=mono,afade=t=in:d=0.01,"
                  f"afade=t=out:st=0.02:d=1.5:curve=exp,volume=0.5,adelay={ms}|{ms}[c{i}]")
    n = len(chimes) + 2
    fg.append("[w][g]" + "".join(f"[c{i}]" for i in range(len(chimes))) +
              f"amix=inputs={n}:duration=longest:normalize=0,atrim=0:{dur},loudnorm=I=-20:TP=-2:LRA=7,aresample=44100,"
              f"afade=t=in:d=0.4,afade=t=out:st={dur - 0.5}:d=0.5[out]")
    return cmd + ["-filter_complex", ";".join(fg), "-map", "[out]", "-ac", "2", path]


def make_audio(path, dur, chimes, gust):
    subprocess.run(audio_argv(path, dur, chimes, gust), check=True)
