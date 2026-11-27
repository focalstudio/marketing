"""See you tomorrow: 18 s, synthesised wind + chimes. Prompt and intent: see_you_tomorrow.md.

Beats: 0-3.4 hook over a meadow with four animals, 0.5-9 the light goes from day to dusk to night and the stars come out,
4.4-10 the animals wander off home one by one, the rabbit last, 10.4-13.8 payoff, 14.5-18 end card.
Appart storyboard. Positions are 1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=5.0, chimes=[(5.6, 523), (7.0, 587), (8.4, 659), (10.6, 784), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            sky=dict(dusk=(0.5, 5.0), night=(5.0, 9.0), horizon=1000, stars=dict(n=40, fade=(6.0, 9.5), y=(60, 900))),
            camera=dict(zoom=0.08, push=(2.0, 12.0), pull=(END, END + 0.01), focus=(540, 1500)),
            cast=dict(
                deer=dict(kind="deer", x=170, y=1470, scale=0.95, motion="slide", enter=4.4, dur=3.4, x0=170, x1=-300,
                          shadow=(300, 52, 70)),
                hedgehog=dict(kind="hedgehog", x=900, y=1500, scale=0.7, flip=True, motion="slide", enter=5.6, dur=3.2,
                              x0=900, x1=1380, shadow=(220, 40, 70)),
                fox=dict(kind="fox", x=820, y=1680, scale=0.95, flip=True, motion="slide", enter=6.8, dur=3.2,
                         x0=820, x1=1380, shadow=(330, 56, 70)),
                rabbit=dict(kind="rabbit", x=330, y=1720, scale=1.1, motion="hop", enter=8.0, dur=2.4, x0=330, x1=-300,
                            hops=4, apex=110, shadow=(340, 56, 70)),
            ),
            text=[
                dict(show=(0, 3.6), fade_out=(3.1, 3.5), lines=[
                    dict(s="Done for", y=330, size=140, pop=(0.2, 0.8)),
                    dict(s="today?", y=490, size=140, pop=(1.0, 1.6)),
                ]),
                dict(show=(10.4, 14.2), fade_in=(10.4, 11.0), fade_out=(13.9, 14.2), lines=[
                    dict(s="They'll be here", y=300, size=108, rise=(10.4, 11.0), dy=24),
                    dict(s="tomorrow.", y=430, size=108, rise=(10.6, 11.2), dy=24),
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
