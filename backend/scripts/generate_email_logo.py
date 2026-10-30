"""Regenerate assets/email_logo.gif, the animated SmartEnergy mark used in emails.

Needs Pillow, which the running app does not: pip install pillow
Run from backend/: python scripts/generate_email_logo.py

The first frame is a complete logo because some mail clients show only that frame.
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUTPUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'email_logo.gif')

SIZE = 128  # Twice the displayed size, so it stays sharp on high-density screens.
SCALE = 4
FRAMES = 30
FRAME_MS = 80
HEADER_COLOR = (6, 24, 29)  # Matches the email header, because GIF has no soft transparency.
TILE_TOP = (18, 201, 143)
TILE_BOTTOM = (4, 120, 87)
GLOW_COLOR = (0, 245, 155)
ICON_COLOR = (255, 255, 255)
SPARK_COLOR = (130, 255, 210)

TILE_MARGIN = 20
ICON_UNITS = 24
BOLT = [(13.3, 5.4), (8.2, 13.1), (11.7, 13.1), (10.75, 18.6), (15.8, 10.9), (12.3, 10.9)]
RING_RADIUS = 8.25
RING_START = -60
RING_SWEEP = 300
RING_WIDTH = 2


def tile_mask(canvas):
    mask = Image.new('L', (canvas, canvas), 0)
    margin = TILE_MARGIN * SCALE
    ImageDraw.Draw(mask).rounded_rectangle(
        (margin, margin, canvas - margin, canvas - margin), radius=19 * SCALE, fill=255,
    )
    return mask


def gradient(canvas):
    image = Image.new('RGB', (canvas, canvas))
    pixels = image.load()
    span = 2 * (canvas - 1)
    for y in range(canvas):
        for x in range(canvas):
            t = (x + y) / span
            pixels[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TILE_TOP, TILE_BOTTOM))
    return image


def icon_layer(canvas, spark_position, bolt_boost):
    """Draw the ring and bolt, plus the spark travelling around the ring."""
    layer = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    tile = canvas - 2 * TILE_MARGIN * SCALE
    unit = tile * 0.72 / ICON_UNITS
    origin = (canvas - unit * ICON_UNITS) / 2

    def point(x, y):
        return origin + x * unit, origin + y * unit

    def on_ring(degrees):
        radians = math.radians(degrees)
        return point(12 + RING_RADIUS * math.cos(radians), 12 + RING_RADIUS * math.sin(radians))

    def dot(degrees, width, color):
        x, y = on_ring(degrees)
        radius = width * unit / 2
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)

    left, top = point(12 - RING_RADIUS, 12 - RING_RADIUS)
    right, bottom = point(12 + RING_RADIUS, 12 + RING_RADIUS)
    # Thick arcs look uneven in Pillow, so the ring is built from overlapping dots.
    for step in range(RING_SWEEP * 2 + 1):
        dot(RING_START + step / 2, RING_WIDTH, ICON_COLOR + (255,))

    if spark_position is not None:
        # Opaque colours fading into the ring: a transparent dot would cut a hole in it.
        for trail in range(58, -1, -2):
            angle = spark_position - trail
            if angle >= RING_START:
                fade = 1 - trail / 60
                color = tuple(round(a + (b - a) * fade) for a, b in zip(ICON_COLOR, SPARK_COLOR))
                dot(angle, RING_WIDTH * (1 + 0.3 * fade), color + (255,))

    outline = [point(*p) for p in BOLT]
    # Slightly thicker bolt on the pulse, matching the mark's hover brightening.
    draw.polygon(outline, fill=ICON_COLOR + (255,))
    draw.line(outline + outline[:2], fill=ICON_COLOR + (255,), width=max(1, round((0.6 + bolt_boost * 0.35) * unit)), joint='curve')
    return layer


def build_frame(index, base_tile, mask, canvas):
    progress = index / FRAMES
    # Frame 0 is the resting logo; the pulse rises and falls across the loop.
    pulse = (1 - math.cos(2 * math.pi * progress)) / 2
    spark = RING_START + RING_SWEEP * (progress / 0.72) if 0 < progress < 0.72 else None

    frame = Image.new('RGB', (canvas, canvas), HEADER_COLOR)
    glow = Image.new('RGB', (canvas, canvas), GLOW_COLOR)
    glow_mask = mask.filter(ImageFilter.GaussianBlur((5 + 7 * pulse) * SCALE))
    glow_mask = glow_mask.point(lambda value: round(value * (0.22 + 0.5 * pulse)))
    frame.paste(glow, (0, 0), glow_mask)
    frame.paste(base_tile, (0, 0), mask)

    icon = icon_layer(canvas, spark, pulse)
    alpha = ImageChops.multiply(icon.getchannel('A'), mask)
    frame.paste(icon.convert('RGB'), (0, 0), alpha)
    return frame.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    canvas = SIZE * SCALE
    mask = tile_mask(canvas)
    base_tile = gradient(canvas)
    frames = [build_frame(i, base_tile, mask, canvas) for i in range(FRAMES)]
    palette_source = Image.new('RGB', (SIZE * FRAMES, SIZE))
    for i, frame in enumerate(frames):
        palette_source.paste(frame, (i * SIZE, 0))
    palette = palette_source.quantize(colors=96, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    indexed[0].save(
        OUTPUT, save_all=True, append_images=indexed[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1,
    )
    print(f'{OUTPUT}: {os.path.getsize(OUTPUT) / 1024:.0f} KB, {FRAMES} frames')


if __name__ == '__main__':
    main()
