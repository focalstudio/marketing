"""Short break: 18 s, synthesised wind + chimes. Prompt and intent: short_break.md.

Beats: 0-3 hook, 1-9 a 5:00 break timer runs down while an otter glides in, a frog hops over and a hedgehog pops up to
share it, 10.2-13.6 payoff, 14.5-18 end card. Appart storyboard. Positions are 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=5.0, chimes=[(4.0, 523), (6.4, 659), (8.2, 784), (10.2, 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            timer=dict(x=540, y=700, size=120, run=(1.0, 9.0), from_=5 * 60, fade=(0.3, 0.9)),
            cast=dict(
                otter=dict(kind="otter", motion="slide", enter=1.8, dur=2.4, x0=-300, x1=330, y=1640, scale=1.0, bob=0.02,
                           shadow=(340, 56, 70)),
                frog=dict(kind="frog", motion="hop", enter=4.4, dur=2.2, x0=1350, x1=800, y=1560, hops=3, apex=120,
                          scale=0.8, flip=True, shadow=(260, 46, 70)),
                hedgehog=dict(kind="hedgehog", motion="pop", enter=7.6, x=600, y=1760, scale=0.65, bob=0.02,
                              shadow=(220, 40, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Break time.", y=330, size=140, pop=(0.2, 0.8)),
                ]),
                dict(show=(10.2, 14.2), fade_in=(10.2, 10.8), fade_out=(13.9, 14.2), lines=[
                    dict(s="Rest is part", y=300, size=108, rise=(10.2, 10.8), dy=24),
                    dict(s="of the work.", y=430, size=108, rise=(10.4, 11.0), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="otter", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}
