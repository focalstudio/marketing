"""Stay awhile: 18 s, synthesised wind + chimes. Prompt and intent: stay_awhile.md.

Beats: 0-3 hook, 1-10 one 25:00 timer runs while a deer, a fox and a duck wander in from the edges, one after another, and
sit down near the rabbit, 10.4-13.6 payoff, 14.5-18 end card. Appart storyboard. Positions are 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=6.0, chimes=[(4.6, 523), (7.0, 659), (9.4, 784), (10.4, 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            timer=dict(x=540, y=700, size=120, run=(1.0, 10.0), from_=25 * 60, fade=(0.3, 0.9)),
            hero=dict(kind="rabbit", x=540, y=1560, scale=1.1, bob=0.02, shadow=(360, 58, 70)),
            cast=dict(
                deer=dict(kind="deer", x0=-300, x1=170, y=1480, enter=2.0, dur=2.6, scale=1.1, shadow=(360, 58, 70)),
                fox=dict(kind="fox", x0=1380, x1=900, y=1560, enter=4.4, dur=2.4, scale=0.95, flip=True,
                         shadow=(330, 56, 70)),
                duck=dict(kind="duck", x0=-250, x1=330, y=1740, enter=6.8, dur=2.4, scale=0.65, shadow=(220, 44, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Stay awhile.", y=330, size=132, pop=(0.2, 0.8)),
                ]),
                dict(show=(10.4, 14.2), fade_in=(10.4, 11.0), fade_out=(13.9, 14.2), lines=[
                    dict(s="They'll", y=300, size=112, rise=(10.4, 11.0), dy=24),
                    dict(s="come to you.", y=430, size=112, rise=(10.6, 11.2), dy=24),
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


VARIANTS = {  # "meadow" is the base cast, so the posted `stay-awhile-appart` is the same unit
    "meadow": {},
    "pond": dict(meadow=dict(hero=dict(kind="otter"), cast=dict(deer=dict(kind="goose"), fox=dict(kind="frog")))),
    "woodland": dict(meadow=dict(hero=dict(kind="hedgehog"), cast=dict(fox=dict(kind="lynx"), duck=dict(kind="mouse")))),
}
