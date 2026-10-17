"""Export generated RGBA sticker sources to web assets. Requires Pillow.

Reads the saved generation provenance. Source PNGs are left intact.
No image content is painted or reconstructed: only alpha-aware trim, padding,
resampling and WebP encoding. Run again after adding or replacing sources.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
entries = json.loads((ROOT / 'packages/web/src/decks/stormpunk/art-provenance.json').read_text())['entries']
out = ROOT / 'packages/web/public/decks/stormpunk/stickers'
qa = ROOT / 'output/playwright'
qa.mkdir(parents=True, exist_ok=True)
sheet = Image.new('RGB', (4 * 240, 8 * 280), '#e9e5da')
draw = ImageDraw.Draw(sheet)
factions = ['vyhen', 'pohyb', 'podrost', 'boure']
ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']
report = []
for entry in entries:
    src = Path(entry['source'])
    destination = out / entry['faction'] / (entry['rank'].lower() + '.webp')
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not src.exists():
        if destination.exists():
            continue
        raise FileNotFoundError(src)
    im = Image.open(src).convert('RGBA')
    alpha = im.getchannel('A')
    assert alpha.getextrema()[0] == 0, f'{src}: missing transparent background'
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    assert bbox, f'{src}: empty image'
    # Preserve the die-cut border and add transparent safety padding for transforms.
    im = ImageOps.expand(im.crop(bbox), border=20, fill=(0, 0, 0, 0))
    im.thumbnail((768, 768), Image.Resampling.LANCZOS)
    temporary = destination.with_suffix('.webp.tmp')
    im.save(temporary, 'WEBP', quality=88, method=6, exact=True)
    temporary.replace(destination)
    hist = im.getchannel('A').histogram()
    report.append({'asset': str(destination.relative_to(ROOT)), 'width': im.width, 'height': im.height, 'bytes': destination.stat().st_size, 'transparent_fraction': round(hist[0] / (im.width * im.height), 3)})
    thumb = im.copy()
    thumb.thumbnail((185, 214), Image.Resampling.LANCZOS)
    col, row = factions.index(entry['faction']), ranks.index(entry['rank'])
    x, y = col * 240, row * 280
    draw.rounded_rectangle((x + 12, y + 8, x + 228, y + 269), radius=10, fill='#fffdf7')
    sheet.paste(thumb, (x + (240 - thumb.width) // 2, y + 22 + (214 - thumb.height) // 2), thumb)
    draw.text((x + 24, y + 246), f"{entry['faction']} / {entry['rank']}", fill='#202831')
sheet.save(qa / 'stormpunk-contact-sheet.jpg', quality=90)
(qa / 'stormpunk-asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(f"Exported {len(report)} transparent WebP stickers; {sum(e['bytes'] for e in report):,} bytes total.")
