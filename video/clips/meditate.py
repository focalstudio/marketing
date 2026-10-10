"""Meditating rabbit: 16 s, synthesised wind + chimes. Prompt and intent: meditate.md.

Beats: 0-3 hook text, 3-9 rabbit meditates (wind gust at ~6 s), 9-13 fox, deer and hedgehog walk in and sit,
13-16 end card. Positions are in 1080x1920 output pixels unless a style override says otherwise.
Style- and app-agnostic: no style is imported and "{app}" stands for the app's name (core.load fills it in). OVERRIDES holds per-style tuning (data only) keyed by style name.
"""

DUR = 16.0
SETTLE = {"fox": 10.6, "deer": 11.4, "hedgehog": 11.9}  # = enter + dur of each walker; each gets a chime
ICON_LANDS = (13.45, 13.65)

BOARD = dict(
    dur=DUR,
    audio=dict(gust=6, chimes=[(SETTLE["fox"], 659), (SETTLE["deer"], 784), (SETTLE["hedgehog"], 880),
                               (ICON_LANDS[0], 659), (ICON_LANDS[1], 988)]),  # (seconds, Hz)
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            camera=dict(zoom=0.18, push=(2.5, 6.5), pull=(9, 10.8), focus=(540, 1150)),
            wind=dict(base=0.12, amp=0.88, peak=6.1, width=0.9),
            leaves=dict(n=9, start=5.0, stagger=0.17, dur=2.6),
            hero=dict(kind="rabbit", pose="meditate", seat="rock", x=540, y=1420, scale=1.0, eyes=(11.6, 11.8), eyes_shut=13),
            cast=dict(  # draw order; `behind` actors are drawn before the hero
                deer=dict(kind="deer", behind=True, enter=9.4, dur=2.0, x0=1400, x1=880, y=1500, scale=0.8, flip=True,
                          gait=10, blink=0.9, shadow=(300, 60, 26)),
                fox=dict(kind="fox", enter=9.0, dur=1.6, x0=-300, x1=215, y=1560, scale=0.85, flip=False,
                         gait=12, blink=0.0, wag=5, shadow=(340, 60, 28)),
                hedgehog=dict(kind="hedgehog", enter=9.8, dur=2.1, x0=1400, x1=730, y=1700, scale=1.0, flip=True,
                              gait=12, blink=1.9, bob=0.5, shadow=(260, 50, 24)),
            ),
            text=[
                dict(show=(0, 3.2), fade_out=(2.7, 3.1), lines=[
                    dict(s="Stop scrolling.", y=330, size=132, pop=(0.2, 0.8), pop_fade=(0.2, 0.4)),
                    dict(s="Breathe.", y=490, size=132, pop=(1.3, 1.9), pop_fade=(1.3, 1.5)),
                ]),
                dict(show=(9.3, 13.0), fade_in=(9.3, 9.9), fade_out=(12.7, 13.0), lines=[
                    dict(s="...and make", y=300, size=112, rise=(9.3, 9.9), dy=24),
                    dict(s="a new friend.", y=430, size=112, rise=(9.5, 10.1), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=13.0, kind="end", enter=dict(until=13.4, hold=12.99),
            mascot=dict(kind="rabbit", x=540, y=1800, scale=0.62, clock=20, wind=0.1, shadow=(340, 70, 25)),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {
    "lowpoly": dict(
        meadow=dict(
            hero=dict(scale=0.86),
            cast=dict(deer=dict(x1=900, gait=9, shadow=(300, 54, 26)), fox=dict(x1=170, shadow=(340, 58, 28)),
                      hedgehog=dict(gait=10, shadow=(260, 46, 22))),
        ),
        end=dict(mascot=dict(scale=0.56, shadow=(300, 54, 22))),
    ),
    "pixel": dict(  # 135x240 logical pixels; poses step at 10 fps
        meadow=dict(
            camera=dict(zoom=0.25, push=(3.0, 6.5), focus=(68, 152)),
            leaves=dict(window=(4.9, 7.6)),
            hero=dict(x=68, y=183, eyes=(11.7, 11.7), eyes_shut=13.2, glow=(11.7, 12.1)),
            cast=dict(deer=dict(x0=160, x1=110, y=188, blink=5, shadow=10), fox=dict(x0=-20, x1=28, y=197, blink=0, shadow=11),
                      hedgehog=dict(x0=150, x1=92, y=212, blink=11, shadow=8)),
            sparks=[(SETTLE["fox"], 30, 176, 10), (SETTLE["deer"], 108, 160, 10), (SETTLE["hedgehog"], 92, 201, 9),
                    (11.7, 68, 132, 7)],
            text=[
                dict(show=(0, 3.2), fade_out=(2.7, 3.1), lines=[
                    dict(s="STOP", y=30, scale=2, fill="white", type=(0.2, 0.035)),
                    dict(s="SCROLLING.", y=48, scale=2, fill="white", type=(0.3, 0.03)),
                    dict(s="BREATHE.", y=74, scale=2, fill="cream", type=(1.3, 0.035)),
                ]),
                dict(show=(9.3, 13.0), fade_in=(9.3, 9.7), fade_out=(12.7, 13.0), lines=[
                    dict(s="...AND MAKE", y=30, scale=2, fill="cream", rise=(9.3, 9.8), dy=4),
                    dict(s="A NEW FRIEND.", y=48, scale=2, fill="white", rise=(9.5, 10.0), dy=4),
                ]),
            ],
        ),
        end=dict(
            enter=dict(hold=None),
            mascot=dict(x=68, y=216),
            icon=dict(size=56, y=84, bob=1.2),
            sparks=[(ICON_LANDS[0], 68, 82, 14)],  # spark times are clip time
            text=[dict(lines=[
                dict(s="{APP}", y=134, scale=(2, 3), fill="white", type=(0.9, 0.025)),
                dict(s="FREE ON iOS.", y=158, scale=2, fill="sage", type=(1.3, 0.02)),
            ])],
        ),
    ),
}
