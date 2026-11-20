"""Last minute: 18 s, synthesised wind + chimes. Prompt and intent: last_minute.md.

Beats: 0-3 hook, 1-9 a 1:00 timer runs down while a goose waddles in, a deer peeks over the ridge and a sheep pops up
beside them, a gust of leaves at the zero, 10.2-13.6 payoff, 14.5-18 end card. Appart storyboard.
Positions are 1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=9.0, chimes=[(3.4, 523), (6.0, 659), (8.2, 784), (9.2, 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            timer=dict(x=540, y=700, size=120, run=(1.0, 9.0), from_=60, fade=(0.3, 0.9)),
            leaves=dict(n=9, start=9.0, stagger=0.17, dur=2.6),
            cast=dict(
                goose=dict(kind="goose", motion="slide", enter=1.6, dur=2.6, x0=-300, x1=300, y=1650, scale=0.9, bob=0.02,
                           shadow=(300, 50, 70)),
                deer=dict(kind="deer", motion="peek", enter=4.6, dur=2.2, x=820, y=1560, scale=1.1, bob=0.02,
                          shadow=(340, 56, 70)),
                sheep=dict(kind="sheep", motion="pop", enter=7.2, x=560, y=1760, scale=0.65, bob=0.02,
                           shadow=(240, 42, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="One minute", y=330, size=132, pop=(0.2, 0.8)),
                    dict(s="left.", y=490, size=132, pop=(1.1, 1.7)),
                ]),
                dict(show=(10.2, 14.2), fade_in=(10.2, 10.8), fade_out=(13.9, 14.2), lines=[
                    dict(s="Stay for", y=300, size=108, rise=(10.2, 10.8), dy=24),
                    dict(s="the last bit.", y=430, size=108, rise=(10.4, 11.0), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="deer", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}
