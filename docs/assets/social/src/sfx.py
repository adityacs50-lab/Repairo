import numpy as np, wave, struct

SR = 48000
DUR = 36.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

dry = np.zeros((N, 2), dtype=np.float64)   # direct
wet = np.zeros((N, 2), dtype=np.float64)   # reverb send

def idx(t): return int(round(t * SR))

def place(buf, t, sig, pan=0.0, gain=1.0):
    """pan -1..1"""
    i = idx(t)
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    if n <= 0: return
    l = np.sqrt((1 - pan) / 2) * np.sqrt(2)
    r = np.sqrt((1 + pan) / 2) * np.sqrt(2)
    buf[i:i+n, 0] += sig[:n] * gain * l
    buf[i:i+n, 1] += sig[:n] * gain * r

def env(n, a, d, p=2.2):
    """attack/decay envelope, lengths in seconds"""
    na = max(1, int(a * SR)); nd = max(1, n - na)
    e = np.concatenate([
        np.linspace(0, 1, na) ** 0.7,
        (np.linspace(1, 0, nd) ** p)
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))

def sweep(f0, f1, dur, curve=3.0):
    n = int(dur * SR); t = np.arange(n) / SR
    k = (t / dur) ** curve
    f = f0 + (f1 - f0) * k
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph)

def tone(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t)

def band_noise(dur, lo, hi, slope=1.0):
    n = max(8, int(dur * SR))
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    m *= 1 / (1 + (lo / np.maximum(f, 1e-6)) ** (4 * slope))   # HP
    m *= 1 / (1 + (np.maximum(f, 1e-6) / hi) ** (4 * slope))   # LP
    return np.fft.irfft(X * m, n)

def norm(x):
    m = np.max(np.abs(x)) or 1.0
    return x / m

# ---------------------------------------------------------------- elements
def impact(power=1.0, pan=0.0):
    """sub drop + body + transient click"""
    d = 1.15
    sub = sweep(105, 38, d, 2.4) * env(int(d*SR), 0.002, d, 3.4)
    body = band_noise(0.42, 60, 900, 1.2) * env(int(0.42*SR), 0.001, 0.42, 4.2)
    tick = band_noise(0.05, 1800, 9000) * env(int(0.05*SR), 0.0005, 0.05, 6.0)
    n = max(len(sub), len(body), len(tick))
    out = np.zeros(n)
    out[:len(sub)] += sub * 0.95
    out[:len(body)] += body * 0.40
    out[:len(tick)] += tick * 0.22
    return norm(out) * power

def riser(dur=0.42, pan=0.0):
    n = int(dur * SR)
    nz = band_noise(dur, 400, 7000, 0.8)
    e = (np.linspace(0, 1, n) ** 2.6)
    # add a pitched component climbing
    p = sweep(220, 1400, dur, 1.8) * 0.25
    return norm((nz * e + p * e)) * 0.55

def whoosh(dur=0.5):
    n = int(dur * SR)
    nz = band_noise(dur, 250, 5200, 0.7)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.8
    return norm(nz * e) * 0.5

def tick(bright=1.0, dur=0.022):
    n = int(dur * SR)
    s = band_noise(dur, 1400 * bright, 7200 * bright) * env(n, 0.0004, dur, 5.0)
    return norm(s) * 0.30

def blip(f=880, dur=0.10):
    n = int(dur * SR)
    s = (tone(f, dur) * 0.7 + tone(f * 2.0, dur) * 0.22) * env(n, 0.002, dur, 4.2)
    return norm(s) * 0.5

def ding(fs=(1318.5, 1975.5, 2637.0), dur=1.15):
    n = int(dur * SR)
    s = np.zeros(n)
    for i, f in enumerate(fs):
        s += tone(f, dur)[:n] * (0.7 ** i) * env(n, 0.001, dur, 2.6)
    return norm(s) * 0.55

def thud(f0=180, f1=62, dur=0.5):
    n = int(dur * SR)
    return norm(sweep(f0, f1, dur, 2.0) * env(n, 0.002, dur, 3.4)) * 0.8

# ---------------------------------------------------------------- score
CUTS = [3.45, 7.45, 13.60, 19.60, 26.00, 31.00]

# room tone
air = band_noise(DUR, 200, 6000, 0.6)
dry[:len(air), 0] += air[:N] * 0.0032
dry[:len(air), 1] += np.roll(air, 137)[:N] * 0.0032

# --- S1 typing
for i in range(9):
    st = 0.30 + i * 0.205
    ln = [26, 62, 30, 41, 66, 43, 46, 34, 26][i]
    d = min(0.32, 0.012 * ln)
    k = max(4, int(d / 0.026))
    for j in range(k):
        t = st + d * j / k + rng.uniform(-0.004, 0.004)
        place(dry, t, tick(bright=rng.uniform(0.75, 1.25)), pan=rng.uniform(-0.3, 0.3), gain=0.55)
        place(wet, t, tick(bright=1.0), gain=0.10)
    if i >= 3:  # error lines get a soft low bump
        place(dry, st, thud(150, 70, 0.28), gain=0.10)

place(dry, 1.94, thud(200, 58, 0.62), gain=0.55)     # build failed
place(wet, 1.94, thud(200, 58, 0.62), gain=0.30)
place(dry, 2.05, riser(0.30), gain=0.30)
place(dry, 2.32, impact(0.65), gain=0.55)            # hook text lands
place(wet, 2.32, impact(0.65), gain=0.22)

# --- cuts
POW = [0.85, 0.80, 0.78, 0.86, 0.78, 1.00]
for c, p in zip(CUTS, POW):
    place(dry, c - 0.40, riser(0.40), gain=0.34 * p)
    place(dry, c - 0.26, whoosh(0.42), gain=0.22 * p)
    place(dry, c, impact(p), gain=0.78)
    place(wet, c, impact(p), gain=0.26)

# --- S3 breaking chip
place(dry, 9.70, blip(523.25, 0.16), pan=0.18, gain=0.32)
place(dry, 9.78, blip(392.00, 0.22), pan=0.18, gain=0.26)
place(wet, 9.70, blip(523.25, 0.16), gain=0.16)

# --- S4 scan sweep + hits (mirrors the visual sweep exactly)
SA, SB = 14.45, 17.45
def ease_sweep(p): return 2*p*p if p < .5 else 1 - ((-2*p+2)**2)/2
G_TOP, G_H, ROW_H, CHIP_H = 930, 406, 70, 56
gTop, gH = G_TOP - 16, G_H + 34
HIT_IDS = sorted([0,1,2,4,6,8,10,13,15,17,18,20,21,22])

def light_time(i):
    """solve for t where the scan line reaches this chip"""
    chip_y = G_TOP + (i // 4) * ROW_H + CHIP_H * 0.55
    k = (chip_y - gTop) / gH
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if ease_sweep(mid) < k: lo = mid
        else: hi = mid
    return SA + (SB - SA) * hi

sd = SB - SA
n = int(sd * SR)
scan = band_noise(sd, 300, 4200, 0.7) * (0.35 + 0.65 * np.sin(np.linspace(0, np.pi, n)) ** 1.2)
scan += sweep(160, 520, sd, 1.0) * 0.18 * np.sin(np.linspace(0, np.pi, n))
place(dry, SA, norm(scan) * 0.10, pan=-0.1)
place(wet, SA, norm(scan) * 0.10, gain=0.5)
for k, i in enumerate(HIT_IDS):
    h = light_time(i)
    place(dry, h, blip(660 + k * 26, 0.055), pan=(-0.35 + 0.7 * (i % 4) / 3), gain=0.16)
    place(wet, h, blip(660 + k * 26, 0.055), gain=0.06)
place(dry, SB + 0.02, thud(240, 88, 0.55), gain=0.42)      # counter lands
place(dry, SB + 0.02, blip(440, 0.30), gain=0.20)
place(wet, SB + 0.02, blip(440, 0.30), gain=0.14)

# --- S5 the swap
place(dry, 21.38, whoosh(0.30), pan=-0.25, gain=0.22)
place(dry, 21.42, tick(0.7, 0.05), pan=-0.3, gain=0.5)
place(dry, 21.92, blip(587.33, 0.14), pan=0.2, gain=0.26)
place(wet, 21.92, blip(587.33, 0.14), gain=0.12)
for j in range(11):                                        # tsc typing
    place(dry, 22.57 + j * 0.042, tick(rng.uniform(.8, 1.2)), pan=rng.uniform(-.2, .2), gain=0.42)
place(dry, 23.10, band_noise(0.45, 180, 2200, .8) * env(int(.45*SR), .05, .45, 1.6) * 0.06)  # compile hum
place(dry, 23.55, ding(), gain=0.40)                       # pass
place(wet, 23.55, ding(), gain=0.28)
place(dry, 23.55, thud(120, 55, 0.45), gain=0.30)

# --- S6 checklist
for i in range(5):
    t = 27.07 + i * 0.20
    place(dry, t, blip(523.25 * (1 + 0.04 * i), 0.07), pan=(-0.2 + 0.1 * i), gain=0.20)
    place(wet, t, blip(523.25 * (1 + 0.04 * i), 0.07), gain=0.08)
place(dry, 29.32, blip(329.63, 0.30), gain=0.18)

# --- S7 lockup accents
place(dry, 31.62, tick(0.6, 0.06), gain=0.35)
place(dry, 32.57, blip(659.25, 0.18), gain=0.26)
place(wet, 32.57, blip(659.25, 0.18), gain=0.14)
place(dry, 33.17, blip(987.77, 0.22), gain=0.18)

# ---------------------------------------------------------------- reverb
def make_ir(dur=1.5, pre=0.012):
    n = int(dur * SR)
    t = np.arange(n) / SR
    d = rng.standard_normal(n) * np.exp(-t * 4.2)
    X = np.fft.rfft(d); f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / (1 + (np.maximum(f, 1e-6) / 5200) ** 3)     # damp highs
    X *= 1 / (1 + (90 / np.maximum(f, 1e-6)) ** 3)       # thin lows
    ir = np.fft.irfft(X, n)
    ir[:int(pre * SR)] = 0
    return norm(ir)

def fftconv(x, h):
    n = len(x) + len(h) - 1
    nf = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(h, nf), nf)[:n]
    return y[:len(x)]

irL, irR = make_ir(1.5), make_ir(1.6)
rev = np.stack([fftconv(wet[:, 0], irL), fftconv(wet[:, 1], irR)], axis=1)
mix = dry + rev * 0.42

# gentle bus: soft clip + fades
mix = np.tanh(mix * 1.25) / 1.25
fi = int(0.05 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(0.6 * SR);  mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix = mix / (np.max(np.abs(mix)) or 1) * 0.80

pcm = (mix * 32767).astype(np.int16)
w = wave.open('sfx.wav', 'wb')
w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(pcm.tobytes()); w.close()
print('sfx.wav', pcm.shape, 'peak', np.max(np.abs(mix)).round(3))
