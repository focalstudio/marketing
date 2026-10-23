"""Night owls: 17 s, synthesised wind + chimes. Prompt and intent: night_owls.md.

Beats: 0-3.6 hook over a dusk meadow, 0.5-8 the sky goes from dusk to night and the stars come out, 8.5-9.9 an owl lands,
10.5-13.1 a bat flits across, 10-13.6 payoff, 14-17 end card. Appart storyboard. Positions are 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 17.0
END = 14.0

BOARD = dict(
    dur=DUR,
    audio=dict(gust=9.5, chimes=[(9.9, 659), (13.1, 784), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            sky=dict(dusk=(0.5, 4.0), night=(4.0, 8.0), horizon=1000, stars=dict(n=44, fade=(4.5, 8.0), y=(60, 900))),
            camera=dict(zoom=0.1, push=(3.0, 13.5), pull=(END, END + 0.01), focus=(540, 1400)),
            hero=dict(kind="rabbit", x=540, y=1440, scale=1.25, shadow=(380, 60, 70)),
            cast=dict(
                owl=dict(kind="owl", motion="slide", enter=8.5, dur=1.4, x0=1250, x1=850, y0=650, y1=1380, y=1380, scale=0.95,
                         shadow=(300, 50, 70)),
                bat=dict(kind="bat", motion="hop", enter=10.5, dur=2.6, x0=-250, x1=1350, y=900, hops=5, apex=140, scale=0.6,
                         shadow=False),
            ),
            text=[
                dict(show=(0, 3.8), fade_out=(3.3, 3.7), lines=[
                    dict(s="Late night", y=330, size=132, pop=(0.2, 0.8)),
                    dict(s="study session?", y=490, size=132, pop=(1.0, 1.6)),
                ]),
                dict(show=(10.0, 13.7), fade_in=(10.0, 10.6), fade_out=(13.4, 13.7), lines=[
                    dict(s="You've got", y=300, size=112, rise=(10.0, 10.6), dy=24),
                    dict(s="company.", y=430, size=112, rise=(10.2, 10.8), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="rabbit", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}


VARIANTS = {  # "meadow" is the base cast, so the posted `night-owls-appart` is the same unit
    "meadow": {},
    "fox": dict(meadow=dict(hero=dict(kind="fox")), end=dict(mascot=dict(kind="fox"))),
    "deer": dict(meadow=dict(hero=dict(kind="deer", scale=1.05)), end=dict(mascot=dict(kind="deer"))),
}
