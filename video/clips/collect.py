"""Collect them all: 18 s, synthesised wind + chimes. Prompt and intent: collect.md.

Beats: 0-3 hook, 1.2-11 a 25:00 timer runs down three times and an animal pops in at each zero, 11.8-14.2 payoff,
14.5-18 end card. Appart storyboard (cast PNGs by name); VARIANTS swap the three animals. Positions are 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
RUNS = [(1.2, 3.4), (5.0, 7.2), (8.8, 11.0)]  # the timer's three runs; an animal pops 0.1 s after each ends
POPS = [3.5, 7.3, 11.1]
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=7.3, chimes=[(POPS[0], 659), (POPS[1], 784), (POPS[2], 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            timer=dict(x=540, y=700, size=120, runs=RUNS, from_=25 * 60, fade=(0.3, 0.9)),
            cast=dict(
                a=dict(kind="rabbit", motion="pop", enter=POPS[0], x=310, y=1490, scale=1.1, shadow=(360, 58, 70)),
                b=dict(kind="fox", motion="pop", enter=POPS[1], x=790, y=1570, scale=1.0, flip=True, shadow=(330, 56, 70)),
                c=dict(kind="hedgehog", motion="pop", enter=POPS[2], x=540, y=1735, scale=0.7, shadow=(220, 44, 70)),
            ),
            text=[
                dict(show=(0, 3.2), fade_out=(2.7, 3.1), lines=[
                    dict(s="Every 25 minutes", y=330, size=116, pop=(0.2, 0.8)),
                    dict(s="of focus...", y=480, size=116, pop=(0.7, 1.3)),
                ]),
                dict(show=(11.8, 14.3), fade_in=(11.8, 12.3), fade_out=(14.0, 14.3), lines=[
                    dict(s="someone new", y=300, size=116, rise=(11.8, 12.4), dy=24),
                    dict(s="moves in.", y=440, size=116, rise=(12.0, 12.6), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="rabbit", x=540, y=1800, scale=1.15),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}


def cast(a, b, c):
    return dict(meadow=dict(cast=dict(a=dict(kind=a), b=dict(kind=b), c=dict(kind=c))))


VARIANTS = {  # the first is the base cast; each is its own post
    "meadow": {},
    "woodland": cast("squirrel", "owl", "mouse"),
    "pond": cast("duck", "otter", "frog"),
}
