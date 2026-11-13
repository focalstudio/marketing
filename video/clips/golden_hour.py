"""Golden hour: 20 s, synthesised wind + chimes. Prompt and intent: golden_hour.md.

Beats: 0-3.2 hook, 1-11 a 25:00 timer runs while the day turns to dusk, a goat walks in, a chicken hops over, a sheep pops
up and a goose glides in to settle for the evening, 12-16 payoff, 16.6-20 end card. Appart storyboard. Positions are
1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 20.0
END = 16.6

BOARD = dict(
    dur=DUR,
    audio=dict(gust=3.0, chimes=[(3.4, 523), (5.6, 587), (7.6, 659), (9.4, 784), (12.0, 988), (END + 0.45, 659),
                                 (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            sky=dict(dusk=(2.0, 11.5), horizon=1000),
            timer=dict(x=540, y=700, size=120, run=(1.0, 11.0), from_=25 * 60, fade=(0.3, 0.9)),
            cast=dict(
                goat=dict(kind="goat", motion="slide", enter=2.6, dur=2.6, x0=-300, x1=300, y=1620, scale=1.0, bob=0.02,
                          shadow=(320, 54, 70)),
                chicken=dict(kind="chicken", motion="hop", enter=4.8, dur=2.2, x0=1350, x1=830, y=1560, hops=3, apex=110,
                             scale=0.75, flip=True, shadow=(240, 42, 70)),
                sheep=dict(kind="sheep", motion="pop", enter=7.0, x=620, y=1760, scale=0.6, bob=0.02,
                           shadow=(240, 42, 70)),
                goose=dict(kind="goose", motion="slide", enter=8.6, dur=2.0, x0=-300, x1=110, y=1740, scale=0.7, bob=0.02,
                           shadow=(240, 42, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="One session.", y=330, size=128, pop=(0.2, 0.8)),
                    dict(s="One evening.", y=490, size=128, pop=(1.0, 1.6)),
                ]),
                dict(show=(12.0, 16.2), fade_in=(12.0, 12.6), fade_out=(15.9, 16.2), lines=[
                    dict(s="Let the day", y=300, size=112, rise=(12.0, 12.6), dy=24),
                    dict(s="wind down.", y=430, size=112, rise=(12.2, 12.8), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="goat", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}
