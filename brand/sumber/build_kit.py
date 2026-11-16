"""Membangun kit logo MotoBase (konsep B 'Cepat') sebagai bentuk terisi, tanpa stroke dan tanpa teks hidup."""
import math, json, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

INK, OR, WHITE = "#181B20", "#F26A1B", "#FFFFFF"
OUT = "out"; os.makedirs(OUT, exist_ok=True)

def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s

def capsule(p, q, w):
    r = w / 2
    dx, dy = q[0]-p[0], q[1]-p[1]; L = math.hypot(dx, dy); dx, dy = dx/L, dy/L
    nx, ny = dy, -dx
    a=(p[0]+nx*r,p[1]+ny*r); b=(q[0]+nx*r,q[1]+ny*r); c=(q[0]-nx*r,q[1]-ny*r); e=(p[0]-nx*r,p[1]-ny*r)
    return (f"M{f(a[0])} {f(a[1])}L{f(b[0])} {f(b[1])}A{f(r)} {f(r)} 0 0 1 {f(c[0])} {f(c[1])}"
            f"L{f(e[0])} {f(e[1])}A{f(r)} {f(r)} 0 0 1 {f(a[0])} {f(a[1])}Z")

def ring(c, ro, ri):
    x, y = c
    return (f"M{f(x-ro)} {f(y)}A{f(ro)} {f(ro)} 0 1 1 {f(x+ro)} {f(y)}A{f(ro)} {f(ro)} 0 1 1 {f(x-ro)} {f(y)}Z"
            f"M{f(x-ri)} {f(y)}A{f(ri)} {f(ri)} 0 1 0 {f(x+ri)} {f(y)}A{f(ri)} {f(ri)} 0 1 0 {f(x-ri)} {f(y)}Z")

# ---- geometri motor matic (koordinat asli, kanvas 256) ----
import math as _m
_FLOOR1 = (156, 138)
SEAT0, SEAT1, STEP1, FLOOR1, HEAD = (34,112), (108,112), (134,138), _FLOOR1, (_FLOOR1[0] + 52*_m.tan(_m.radians(25)), 86)
FORK0, FORK1 = tuple(float(v) for v in os.environ.get("FORK0","184,96").split(",")), (199.8,178)
BAR0, BAR1 = (180,72), (149.1,63.7)
REAR, FRONT = (62,178), (204,178)

def bike(T, s, body_w=26, fork_w=14, bar_w=12, ring_out=40, ring_in=20):
    """Kembalikan satu path (nonzero) berisi roda dan badan. T memetakan titik, s menskalakan lebar."""
    P = lambda p: T(*p)
    parts = [ring(P(REAR), ring_out*s, ring_in*s), ring(P(FRONT), ring_out*s, ring_in*s)]
    for a, b in ((SEAT0,SEAT1),(SEAT1,STEP1),(STEP1,FLOOR1),(FLOOR1,HEAD)):
        parts.append(capsule(P(a), P(b), body_w*s))
    parts.append(capsule(P(FORK0), P(FORK1), fork_w*s))
    parts.append(capsule(P(BAR0), P(BAR1), bar_w*s))
    return "".join(parts)

# ---- simbol master (dengan garis kecepatan) ----
S = 0.82
T_main = lambda x, y: (50 + S*x, 15 + S*y)
y1 = T_main(0, 112)[1]
SPEED = [((14, y1), (52, y1)), ((14, y1+24), (40, y1+24)), ((14, y1+48), (28, y1+48))]
def speed_path():
    return "".join(capsule(a, b, 12) for a, b in SPEED)
BIKE_MAIN = bike(T_main, S)
SYM_BOX = (8, 62, 242, 132)   # x, y, w, h  kotak sempit simbol

# ---- simbol kecil (tanpa garis kecepatan, garis lebih tebal) ----
T_id = lambda x, y: (x, y)
BIKE_SMALL = bike(T_id, 1, body_w=28, fork_w=18, bar_w=16, ring_out=40, ring_in=18)
SMALL_BOX = (22, 55, 222, 163)

def path(d, fill): return f'<path fill="{fill}" d="{d}"/>'
def svg(vb, inner, title):
    _, _, vw, vh = (float(v) for v in vb.split())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{f(vw)}" height="{f(vh)}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{inner}</svg>\n')

def symbol_inner(body, lines):
    return path(BIKE_MAIN, body) + path(speed_path(), lines)

# ---- teks -> outline (Plus Jakarta Sans, OFL) ----
FONT = os.path.expanduser("~/.local/share/fonts/PlusJakartaSans-VariableFont_wght.ttf")
def inst(w): return instancer.instantiateVariableFont(TTFont(FONT), {"wght": w}, inplace=False)
FB, FM = inst(800), inst(500)
def text_paths(font, text, size, x, base, track=0):
    gs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    upm = font["head"].unitsPerEm; k = size / upm
    pen = SVGPathPen(gs, ntos=lambda v: f(v)); cur = x
    for ch in text:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, cur, base)))
        cur += hmtx[g][0]*k + track*size
    return pen.getCommands(), cur
def cap_h(font, size):
    gs, cmap = font.getGlyphSet(), font.getBestCmap(); bp = BoundsPen(gs); gs[cmap[ord("M")]].draw(bp)
    return bp.bounds[3] * size / font["head"].unitsPerEm

SIZE, TRACK = 108, -0.012
CAP = cap_h(FB, SIZE)
def wordmark(x, base, c_moto, c_base):
    d1, nx = text_paths(FB, "Moto", SIZE, x, base, TRACK)
    d2, ex = text_paths(FM, "Base", SIZE, nx, base, TRACK)
    return path(d1, c_moto) + path(d2, c_base), ex

LK = 1.15   # skala simbol di lockup horizontal
def lockup_h(body, lines, c_moto, c_base):
    sx, sy, sw, sh = SYM_BOX
    gap = 40
    tx = 8 - sx*LK; ty = 128 - (sy + sh/2)*LK
    base = 128 + CAP/2
    wm, end = wordmark(8 + sw*LK + gap, base, c_moto, c_base)
    W = math.ceil(end + 8)
    inner = (f'<g id="symbol" transform="translate({f(tx)} {f(ty)}) scale({LK})">{symbol_inner(body, lines)}</g>'
             f'<g id="wordmark">{wm}</g>')
    return svg(f"0 0 {W} 256", inner, "MotoBase"), W

def lockup_v(body, lines, c_moto, c_base):
    sx, sy, sw, sh = SYM_BOX
    _, e1 = text_paths(FB, "Moto", SIZE, 0, 0, TRACK); _, tw = text_paths(FM, "Base", SIZE, e1, 0, TRACK)
    k = 0.8 * tw / sw
    W = math.ceil(tw + 96); top = 40
    sym_x = (W - sw*k)/2 - sx*k
    wm, _ = wordmark((W - tw)/2, 0, c_moto, c_base)
    base_y = top + sh*k + 56 + CAP; H = math.ceil(base_y + 44)
    inner = (f'<g id="symbol" transform="translate({f(sym_x)} {f(top - sy*k)}) scale({f(k)})">{symbol_inner(body, lines)}</g>'
             f'<g id="wordmark" transform="translate(0 {f(base_y)})">{wm}</g>')
    return svg(f"0 0 {f(W)} {f(H)}", inner, "MotoBase"), (W, H)

# ---- ikon: latar putih polos, motor hitam dengan 3 garis kecepatan oranye ----
# Ukuran kecil: garis dan badan dibuat lebih tebal agar tetap terbaca di 16-32 px.
STRIPES_ICON = "".join(capsule(a, b, 16) for a, b in
                       (((-53, 112), (1, 112)), ((-37, 138), (1, 138)), ((-21, 164), (1, 164))))
ICON_BOX = (-61, 55, 305, 163)   # x, y, w, h  (motor kecil + garis)

def tile(bg, body, lines, scale=0.9, r=0):
    x, y, w, h = ICON_BOX
    k = scale * 256 / w
    tx = 128 - (x + w/2) * k; ty = 128 - (y + h/2) * k
    return (f'<rect width="256" height="256" rx="{r}" fill="{bg}"/>'
            f'<g transform="translate({f(tx)} {f(ty)}) scale({f(k)})">{path(BIKE_SMALL, body)}{path(STRIPES_ICON, lines)}</g>')

def write(name, content): open(f"{OUT}/{name}", "w").write(content)

# ---------------- keluaran ----------------
sx, sy, sw, sh = SYM_BOX
vb_sym = f"{sx-8} {sy-8} {sw+16} {sh+16}"
for name, body, lines in (("simbol", INK, OR), ("simbol-gelap", WHITE, OR), ("simbol-hitam", INK, INK),
                          ("simbol-putih", WHITE, WHITE), ("simbol-oranye", OR, OR)):
    write(f"motobase-{name}.svg", svg(vb_sym, symbol_inner(body, lines), "MotoBase"))
write("motobase-simbol-kecil.svg", svg(f"{SMALL_BOX[0]-8} {SMALL_BOX[1]-8} {SMALL_BOX[2]+16} {SMALL_BOX[3]+16}", path(BIKE_SMALL, INK), "MotoBase"))
write("motobase-ikon.svg", svg("0 0 256 256", tile(WHITE, INK, OR), "MotoBase"))
write("motobase-ikon-gelap.svg", svg("0 0 256 256", tile(INK, WHITE, OR), "MotoBase"))
write("motobase-ikon-maskable.svg", svg("0 0 256 256", tile(WHITE, INK, OR, scale=0.66), "MotoBase"))

LOCK = {}
for name, body, lines, cm, cb in (("warna", INK, OR, INK, OR), ("gelap", WHITE, OR, WHITE, OR), ("hitam", INK, INK, INK, INK),
                                  ("putih", WHITE, WHITE, WHITE, WHITE), ("oranye", OR, OR, OR, OR)):
    s, W = lockup_h(body, lines, cm, cb); write(f"motobase-lockup-{name}.svg", s); LOCK[name] = W
    s, _ = lockup_v(body, lines, cm, cb); write(f"motobase-tumpuk-{name}.svg", s)
json.dump({"lockup_w": LOCK, "sym_box": SYM_BOX, "cap": CAP}, open(f"{OUT}/meta.json", "w"))
print("OK", LOCK, "cap", round(CAP,1))
