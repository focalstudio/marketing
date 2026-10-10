"""Stop scrolling: 16 s, silent. Prompt and intent: stop_scrolling.md.

Beats: 0-2.9 hook text, 2.9-9.2 the rabbit hops across the landscape and back, 9.2-13 dusk falls while a 25-minute
focus ring fills and the friends pop in, 13-16 end card. Positions are in 1080x1920 output pixels.
Times inside a scene are scene-local (seconds since the scene's start).
"""

DUR = 16.0

BOARD = dict(
    dur=DUR,
    audio=None,
    scenes=[
        dict(
            name="hook", start=0.0, kind="title",
            sun=dict(x=820, y=330, r=110, fade=(0.0, 0.6)),
            text=[dict(lines=[
                dict(s="Stop\nscrolling.", y=760, size=190, pop=(0.15, 0.85)),
                dict(s="Breathe. Watch this.", y=1290, size=64, fill="sage", weight="Semibold", plain=True, fade=(1.1, 1.8)),
            ])],
        ),
        dict(
            name="hops", start=2.9, kind="world",
            camera=dict(drift=0.05, over=DUR),
            hero=dict(kind="rabbit", pose="hop", ground=1680, hops=3, apex=170, shadow=230, shadow_in=(0.0, 0.5),
                      legs=[dict(span=(0.0, 3.1), x=(230, 850)), dict(span=(3.2, 6.3), x=(850, 230))]),
            cast={},
        ),
        dict(
            name="focus", start=9.2, kind="world",
            camera=dict(drift=0.05, over=DUR),
            dusk=(0.0, 1.2),
            sun=dict(x=820, y=330, r=110, sink=1250, sink_span=(0.0, 1.4)),
            timer=dict(x=540, y=1080, r=320, minutes=25, fade=(0.3, 0.9), fill=(0.6, 2.4), label_y=560),
            hero=dict(kind="rabbit", pose="sit", x=540, y=1335, scale=1.25, bob=(6, 2.4), shadow=(300, 90)),
            cast=dict(
                fox=dict(kind="fox", motion="pop", enter=2.0, x=190, y=1720),
                deer=dict(kind="deer", motion="pop", enter=2.4, x=880, y=1710),
                hedgehog=dict(kind="hedgehog", motion="pop", enter=2.8, x=540, y=1850),
            ),
            text=[dict(lines=[
                dict(s="25 minutes of focus\nearns you a friend.", y=150, size=74, fill="paper", fade=(1.2, 1.9)),
            ])],
        ),
        dict(
            name="end", start=13.0, kind="end",
            sun=dict(x=190, y=250, r=90, clock=12),
            icon=dict(size=300, y=840, pop=(0.2, 0.9), bob=8),
            text=[dict(lines=[
                dict(s="WildFocus", y=1100, size=120, fade=(0.8, 1.4)),
                dict(s="Free on iOS.", y=1260, size=78, fill="sage", weight="Semibold", plain=True, fade=(1.2, 1.8)),
                dict(s="Phone down. Rabbit up.", y=1560, size=50, weight="Medium", plain=True, peak=190, fade=(1.8, 2.4)),
            ])],
        ),
    ],
)

OVERRIDES = {}
