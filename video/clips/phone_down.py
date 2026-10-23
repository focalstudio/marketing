"""Phone down: 18 s, synthesised wind + chimes. Prompt and intent: phone_down.md.

Beats: 0-3 hook, 1.6-4.4 two animals peek from the grass, 3-9 two more creep closer, the phone buzzes at 6.2-7.6 and
all four freeze, 9.2-13 payoff, 14-18 end card. Appart storyboard; VARIANTS swap the cast. 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
BUZZ = (6.2, 7.6)
FREEZE = [BUZZ]  # the actors' motion clocks stop while the phone buzzes
END = 14.0

BOARD = dict(
    dur=DUR,
    audio=dict(gust=6.9, chimes=[(3.0, 523), (4.0, 587), (8.5, 659), (8.9, 784), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            camera=dict(zoom=0.12, push=(2.0, 8.0), pull=(9.0, 10.5), focus=(540, 1500)),
            phone=dict(x=540, y=1610, w=340, h=680, buzz=[BUZZ], enter=0.0),
            cast=dict(
                a=dict(kind="deer", motion="peek", enter=1.6, dur=1.4, x=150, y=1440, scale=1.0, freeze=FREEZE, shadow=(300, 52, 70)),
                d=dict(kind="hedgehog", motion="peek", enter=2.4, dur=1.2, x=940, y=1470, scale=0.7, freeze=FREEZE, shadow=(220, 40, 70)),
                b=dict(kind="fox", motion="slide", enter=3.4, dur=4.0, x0=1350, x1=800, y=1660, scale=1.0, flip=True, freeze=FREEZE,
                       shadow=(330, 56, 70)),
                c=dict(kind="rabbit", motion="slide", enter=3.0, dur=4.0, x0=-300, x1=300, y=1700, scale=1.05, freeze=FREEZE,
                       shadow=(340, 56, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Phone down.", y=330, size=140, pop=(0.2, 0.8)),
                    dict(s="Wait.", y=490, size=140, pop=(1.3, 1.9)),
                ]),
                dict(show=(9.2, 13.2), fade_in=(9.2, 9.8), fade_out=(12.9, 13.2), lines=[
                    dict(s="They only come out", y=300, size=92, rise=(9.2, 9.8), dy=24),
                    dict(s="when you put it down.", y=430, size=92, rise=(9.4, 10.0), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="deer", x=540, y=1800, scale=1.05),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}

VARIANTS = {  # the first is the base cast; each is its own post
    "meadow": {},
    "pond": dict(meadow=dict(cast=dict(a=dict(kind="otter"), d=dict(kind="mouse"), b=dict(kind="duck"), c=dict(kind="frog"))),
                 end=dict(mascot=dict(kind="otter"))),
    "woodland": dict(meadow=dict(cast=dict(d=dict(kind="mouse"), b=dict(kind="wolf"), c=dict(kind="squirrel")))),
}
