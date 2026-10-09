# Generates the Knight Keys drum kit SVG: a studio kit seen from the front,
# wood shells, chrome hardware and brass cymbals. Every playable part is a
# <g class="kp" data-piece="..."> (the ids in PIECES, js/drumkit.js) so the app
# can light it up and play it. index.html holds the result (inside #kitStage,
# without the xmlns attribute); the Drum kit panel copies it at startup.
#   python3 tools/make-drum-kit.py > kit.svg
import math

W, H = 800, 500
out = []
def add(s): out.append(s)
def f(x): return f'{x:.1f}'.rstrip('0').rstrip('.')

defs = '''<defs>
  <radialGradient id="kgWall" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#3b2c26"/><stop offset="0.6" stop-color="#1b1412"/><stop offset="1" stop-color="#0b0807"/></radialGradient>
  <radialGradient id="kgRug" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#6e1d16"/><stop offset="0.75" stop-color="#43110c"/><stop offset="1" stop-color="#1a0705"/></radialGradient>
  <linearGradient id="kgWood" x1="0" x2="1">
    <stop offset="0" stop-color="#240804"/><stop offset="0.18" stop-color="#6b1d0d"/><stop offset="0.38" stop-color="#b94a22"/>
    <stop offset="0.46" stop-color="#e07a45"/><stop offset="0.55" stop-color="#a63c18"/><stop offset="0.82" stop-color="#5a170a"/><stop offset="1" stop-color="#1c0603"/>
  </linearGradient>
  <linearGradient id="kgMetal" x1="0" x2="1">
    <stop offset="0" stop-color="#3c4048"/><stop offset="0.3" stop-color="#b9bec7"/><stop offset="0.45" stop-color="#ffffff"/>
    <stop offset="0.6" stop-color="#9aa0aa"/><stop offset="1" stop-color="#2e3138"/>
  </linearGradient>
  <linearGradient id="kgChrome" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#9da3ad"/><stop offset="0.55" stop-color="#e9edf2"/><stop offset="1" stop-color="#4b5059"/>
  </linearGradient>
  <radialGradient id="kgHead" cx="42%" cy="35%" r="75%"><stop offset="0" stop-color="#fbf8f1"/><stop offset="0.7" stop-color="#e4ddcf"/><stop offset="1" stop-color="#b3aa98"/></radialGradient>
  <radialGradient id="kgKickHead" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#2d2f35"/><stop offset="0.8" stop-color="#17181c"/><stop offset="1" stop-color="#0a0a0c"/></radialGradient>
  <radialGradient id="kgCym" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f7dc8a"/><stop offset="0.12" stop-color="#c8962f"/><stop offset="0.2" stop-color="#e9c46a"/>
    <stop offset="0.6" stop-color="#c9952f"/><stop offset="0.9" stop-color="#a0711c"/><stop offset="1" stop-color="#6b4810"/></radialGradient>
  <linearGradient id="kgShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="kgSoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>'''
add(defs)
# Studio: wall, floor, rug with a border.
add(f'<rect width="{W}" height="{H}" fill="url(#kgWall)"/>')
add(f'<rect y="330" width="{W}" height="{H-330}" fill="#120d0b"/>')
add('<ellipse cx="400" cy="425" rx="390" ry="78" fill="url(#kgRug)"/>')
add('<ellipse cx="400" cy="425" rx="360" ry="66" fill="none" stroke="#d4a24c" stroke-opacity="0.35" stroke-width="3"/>')
add('<ellipse cx="400" cy="425" rx="345" ry="60" fill="none" stroke="#d4a24c" stroke-opacity="0.18" stroke-width="1.5" stroke-dasharray="6 6"/>')

def shadow(cx, cy, rx, ry=None):
    add(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry or rx*0.22)}" fill="#000" opacity="0.55" filter="url(#kgSoft)"/>')

def rod(x1, y1, x2, y2, w=4):
    add(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="#2c2f35" stroke-width="{w+2}" stroke-linecap="round"/>')
    add(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" stroke="#c3c8d0" stroke-width="{w}" stroke-linecap="round"/>')
    add(f'<line x1="{f(x1-1)}" y1="{f(y1)}" x2="{f(x2-1)}" y2="{f(y2)}" stroke="#fff" stroke-opacity="0.7" stroke-width="1"/>')

def tripod(x, y_top, y_floor, spread=34):
    rod(x, y_top, x, y_floor - 18, 4)
    for dx in (-spread, spread):
        rod(x, y_floor - 22, x + dx, y_floor, 3)
    rod(x, y_floor - 22, x + 4, y_floor + 6, 3)

def drum(cx, top, rx, ry, h, lugs=6, shell='url(#kgWood)', head='url(#kgHead)', inner=''):
    """A drum seen slightly from above: shell, chrome hoops, lugs and the head."""
    bot = top + h
    s = []
    s.append(f'<path d="M{f(cx-rx)} {f(top)} L{f(cx-rx)} {f(bot)} A{f(rx)} {f(ry)} 0 0 0 {f(cx+rx)} {f(bot)} L{f(cx+rx)} {f(top)} Z" fill="{shell}"/>')
    # wood grain: faint vertical streaks
    for k in range(1, 9):
        x = cx - rx + 2 * rx * k / 9
        s.append(f'<line x1="{f(x)}" y1="{f(top+ry*0.4)}" x2="{f(x)}" y2="{f(bot+ry*0.6)}" stroke="#000" stroke-opacity="0.07" stroke-width="1.2"/>')
    s.append(f'<path d="M{f(cx-rx)} {f(bot)} A{f(rx)} {f(ry)} 0 0 0 {f(cx+rx)} {f(bot)}" fill="none" stroke="url(#kgChrome)" stroke-width="5"/>')
    # lugs and tension rods on the front half
    for i in range(lugs):
        a = math.pi * (i + 0.5) / lugs
        x = cx - rx * math.cos(a)
        y = top + ry * math.sin(a)
        lh = h * 0.42
        s.append(f'<rect x="{f(x-3.2)}" y="{f(y+h*0.25)}" width="6.4" height="{f(lh)}" rx="3" fill="url(#kgMetal)" stroke="#2c2f35" stroke-width="0.6"/>')
        s.append(f'<line x1="{f(x)}" y1="{f(y+2)}" x2="{f(x)}" y2="{f(y+h*0.25)}" stroke="#d7dbe1" stroke-width="1.6"/>')
        s.append(f'<line x1="{f(x)}" y1="{f(y+h*0.25+lh)}" x2="{f(x)}" y2="{f(y+h-1)}" stroke="#d7dbe1" stroke-width="1.6"/>')
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(top)}" rx="{f(rx)}" ry="{f(ry)}" fill="{head}"/>')
    s.append(inner)
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(top)}" rx="{f(rx)}" ry="{f(ry)}" fill="none" stroke="url(#kgChrome)" stroke-width="5"/>')
    s.append(f'<ellipse cx="{f(cx-rx*0.25)}" cy="{f(top-ry*0.25)}" rx="{f(rx*0.35)}" ry="{f(ry*0.25)}" fill="#fff" opacity="0.35"/>')
    return ''.join(s)

def cymbal(cx, cy, rx, ry, rot=0, bell=True):
    s = [f'<g transform="rotate({rot} {f(cx)} {f(cy)})">']
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy+3)}" rx="{f(rx)}" ry="{f(ry)}" fill="#3a2706" opacity="0.6"/>')
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="url(#kgCym)" stroke="#5a3d0c" stroke-width="1"/>')
    for k in range(2, 12):  # lathe rings
        s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx*k/12)}" ry="{f(ry*k/12)}" fill="none" stroke="#5a3d0c" stroke-opacity="0.22" stroke-width="0.7"/>')
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="url(#kgShine)"/>')
    if bell:
        s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy-ry*0.12)}" rx="{f(rx*0.17)}" ry="{f(ry*0.32)}" fill="#f0cf74" stroke="#7a5512" stroke-width="0.8"/>')
    s.append(f'<ellipse cx="{f(cx)}" cy="{f(cy-ry*0.2)}" rx="3.2" ry="2" fill="#2c2f35"/>')
    s.append('</g>')
    return ''.join(s)

def piece(pid, body):
    add(f'<g class="kp" data-piece="{pid}">{body}</g>')

# ---- Back: cymbal stands and their shadows -------------------------------------------
for (x, rx) in ((190, 60), (650, 60), (95, 45), (595, 70)):
    shadow(x, 452 if x in (95,) else 445, rx)
shadow(400, 455, 150, 22)
shadow(250, 440, 70)
tripod(205, 140, 450)   # crash stand
tripod(640, 185, 445)   # ride stand

# Floor tom (tom3): on legs, right side.
rod(530, 330, 520, 440, 3); rod(640, 330, 650, 440, 3)
piece('tom3', drum(585, 295, 78, 24, 100, lugs=6))

# Kick: front view, centre.
kick = []
kcx, kcy, kr = 400, 330, 118
kick.append(f'<circle cx="{kcx}" cy="{kcy}" r="{kr}" fill="url(#kgWood)"/>')  # wood hoop
kick.append(f'<circle cx="{kcx}" cy="{kcy}" r="{kr-12}" fill="url(#kgKickHead)"/>')
kick.append(f'<circle cx="{kcx}" cy="{kcy}" r="{kr-11}" fill="none" stroke="url(#kgChrome)" stroke-width="3"/>')
for i in range(10):  # claws
    a = 2 * math.pi * i / 10 + math.pi / 10
    x, y = kcx + (kr - 4) * math.cos(a), kcy + (kr - 4) * math.sin(a)
    kick.append(f'<rect x="{f(x-4)}" y="{f(y-8)}" width="8" height="16" rx="3" fill="url(#kgMetal)" stroke="#23262b" stroke-width="0.6" transform="rotate({f(math.degrees(a)+90)} {f(x)} {f(y)})"/>')
kick.append(f'<circle cx="{kcx}" cy="{kcy-8}" r="58" fill="none" stroke="#d4a24c" stroke-opacity="0.55" stroke-width="2"/>')
kick.append(f'<text x="{kcx}" y="{kcy-14}" text-anchor="middle" font-size="26" font-weight="800" fill="#e6b85c" font-family="Georgia, serif" letter-spacing="2">KNIGHT</text>')
kick.append(f'<text x="{kcx}" y="{kcy+14}" text-anchor="middle" font-size="16" fill="#e6b85c" font-family="Georgia, serif" letter-spacing="8">LYFE</text>')
kick.append(f'<circle cx="{kcx+52}" cy="{kcy+58}" r="16" fill="#050506" stroke="url(#kgChrome)" stroke-width="2.5"/>')  # port
kick.append(f'<ellipse cx="{kcx-40}" cy="{kcy-60}" rx="45" ry="18" fill="#fff" opacity="0.08"/>')
rod(kcx - 105, kcy + 55, kcx - 135, 448, 3); rod(kcx + 105, kcy + 55, kcx + 135, 448, 3)  # spurs
piece('kick', ''.join(kick))

# Rack toms on arms from the kick.
rod(400, 215, 340, 245, 4); rod(400, 215, 462, 245, 4)
piece('tom1', drum(318, 185, 56, 19, 62, lugs=5))
piece('tom2', drum(482, 190, 62, 21, 68, lugs=5))

# Cowbell on the ride stand.
piece('cowbell', '<path d="M690 262 l34 -6 l10 40 l-50 9 z" fill="url(#kgMetal)" stroke="#2c2f35"/><path d="M690 262 l34 -6 l3 10 l-35 6 z" fill="#1d1f24"/>')
rod(660, 270, 692, 268, 3)

# Snare: chrome shell, on its stand, left of the kick.
tripod(232, 330, 446, 30)
snare_inner = ''.join(f'<line x1="{f(232-50+100*k/7)}" y1="{f(306)}" x2="{f(232-50+100*k/7)}" y2="{f(306)}" />' for k in range(0))
piece('snare', drum(232, 300, 76, 24, 40, lugs=6, shell='url(#kgMetal)'))
# Side stick: a drumstick lying across the snare's rim.
piece('stick', '<g transform="rotate(-14 232 296)"><rect x="160" y="292" width="150" height="7" rx="3.5" fill="#d9b382" stroke="#7a5a32" stroke-width="0.8"/><ellipse cx="310" cy="295.5" rx="6" ry="4.5" fill="#e8caa0"/></g>')

# Hi-hat: stand, pedal, two cymbals.
rod(95, 255, 95, 432, 4)
for dx in (-32, 32):
    rod(95, 410, 95 + dx, 448, 3)
piece('hhp', '<path d="M78 436 l34 0 l8 20 l-50 0 z" fill="url(#kgMetal)" stroke="#2c2f35"/><rect x="74" y="455" width="54" height="6" rx="2" fill="#2c2f35"/>')
piece('hhc', cymbal(95, 262, 66, 13, 0))
piece('hho', cymbal(95, 248, 66, 13, 0))

# Tambourine on the hi-hat stand.
tamb = ['<ellipse cx="40" cy="345" rx="30" ry="12" fill="#f0e6d2" stroke="#8a6a3c" stroke-width="5"/>']
for i in range(6):
    a = 2 * math.pi * i / 6
    tamb.append(f'<ellipse cx="{f(40+30*math.cos(a))}" cy="{f(345+12*math.sin(a))}" rx="5" ry="3" fill="url(#kgMetal)" stroke="#2c2f35" stroke-width="0.5"/>')
piece('tamb', ''.join(tamb))
rod(70, 345, 95, 345, 2)

# Clap: an electronic pad on a small arm by the floor tom.
piece('clap', '<rect x="700" y="365" width="64" height="40" rx="8" fill="#22252c" stroke="#5cdbd3" stroke-width="2"/><rect x="706" y="371" width="52" height="28" rx="5" fill="#2e333d"/><text x="732" y="391" text-anchor="middle" font-size="12" font-weight="700" fill="#5cdbd3" font-family="system-ui">CLAP</text>')

# Cymbals on top.
piece('crash', cymbal(200, 132, 118, 24, -9))
piece('ride', cymbal(645, 178, 128, 25, 7, bell=False))
piece('bell', '<g transform="rotate(7 645 178)"><ellipse cx="645" cy="175" rx="24" ry="8" fill="#f3d47c" stroke="#7a5512" stroke-width="0.8"/><ellipse cx="640" cy="172" rx="9" ry="3" fill="#fff" opacity="0.5"/><ellipse cx="645" cy="174" rx="3.2" ry="2" fill="#2c2f35"/></g>')

svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Drum kit: click a drum to hear and edit it">' + ''.join(out) + '</svg>'
print(svg)
