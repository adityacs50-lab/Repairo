"""Original score + sound design for the Repairo launch film.

D major, 120 BPM (every scene cut sits on a beat). Pad -> piano arpeggio -> soft
pulse -> resolve. SFX are pitched to the chord underneath and share the same
reverb as the music so they sit inside the track, not on top of it.
Writes score.wav (48 kHz stereo, 25.0 s).
"""
import numpy as np
import wave

SR = 48000
DUR = 25.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.5


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def buf():
    return np.zeros((2, N))


def place(dst, sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    dst[0, i : i + len(sig)] += sig * l
    dst[1, i : i + len(sig)] += sig * r


def env_adsr(n, a, r, sus=1.0):
    e = np.ones(n) * sus
    na, nr = int(a * SR), int(r * SR)
    na = min(na, n)
    e[:na] = np.linspace(0, sus, na) ** 1.5
    if nr > 0:
        nr = min(nr, n)
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


# ---------------------------------------------------------------- instruments
def pad_note(m, dur, det=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.zeros(n)
    for d in (-0.07, 0.0, 0.06):  # gentle chorus
        ff = f * 2 ** ((d + det) / 12)
        for h, amp in ((1, 1.0), (2, 0.28), (3, 0.1), (4, 0.04)):
            s += amp * np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28))
    s *= 0.2 * (1 + 0.08 * np.sin(2 * np.pi * 0.23 * t))
    return s


def piano(m, dur=2.2, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.zeros(n)
    for h in range(1, 8):
        fh = f * h * np.sqrt(1 + 0.0004 * h * h)  # slight inharmonicity
        s += (1 / h ** 1.6) * np.exp(-t * (1.6 + 0.9 * h)) * np.sin(2 * np.pi * fh * t)
    s *= np.minimum(1, t / 0.004)
    s *= np.linspace(1, 0, n) ** 0.5
    return s * vel * 0.5


def bell(m, dur=2.5, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.zeros(n)
    for ratio, amp, dec in ((1, 1, 1.8), (2.0, 0.45, 3.0), (3.01, 0.25, 4.5), (4.2, 0.12, 6.0)):
        s += amp * np.exp(-t * dec) * np.sin(2 * np.pi * f * ratio * t)
    s *= np.minimum(1, t / 0.002)
    return s * vel * 0.35


def sub_boom(dur=3.0, f0=62, f1=36):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 1.3) * np.minimum(1, t / 0.01)
    body = onepole_lp(rng.standard_normal(n) * np.exp(-t * 9), 380) * 0.8
    return s + body


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 44 + 70 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 11) * np.minimum(1, t / 0.002)


def hat():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    x = np.diff(rng.standard_normal(n + 1))  # crude high-pass
    x = x - onepole_lp(x, 6000)
    return x * np.exp(-t * 70) * 0.25


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    x = onepole_lp(rng.standard_normal(n), 3500)
    return x * np.exp(-t * 180)


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # sweep a one-pole LP upward: build in chunks
    out = np.zeros(n)
    chunk = 2400
    acc = 0.0
    for c in range(0, n, chunk):
        cut = 300 + 5200 * (c / n) ** 2
        a = np.exp(-2 * np.pi * cut / SR)
        seg = x[c : c + chunk]
        y = np.empty_like(seg)
        for i, v in enumerate(seg):
            acc = (1 - a) * v + a * acc
            y[i] = acc
        out[c : c + chunk] = y
    return out * (t / dur) ** 2.2 * 0.9


def whoosh(dur=0.7):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = onepole_lp(rng.standard_normal(n), 1800)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return x * e


# ---------------------------------------------------------------- arrangement
CHORDS = [  # (start, end, bass, pad voicing)
    (0.0, 2.75, 35, [54, 57, 61, 62, 66]),  # Bm9
    (2.75, 5.5, 31, [55, 59, 62, 66]),  # Gmaj7
    (5.5, 8.0, 38, [57, 62, 64, 66, 69]),  # Dadd9
    (8.0, 10.5, 37, [57, 61, 64, 69]),  # A/C#
    (10.5, 12.25, 35, [54, 57, 62, 66]),  # Bm7
    (12.25, 14.0, 31, [55, 59, 62, 67]),  # G
    (14.0, 15.75, 42, [57, 62, 66, 69]),  # D/F#
    (15.75, 17.5, 31, [55, 59, 62, 66, 71]),  # Gmaj7
    (17.5, 19.25, 40, [55, 59, 62, 67]),  # Em7
    (19.25, 20.25, 33, [57, 62, 64, 69]),  # Asus4
    (20.25, 21.0, 33, [57, 61, 64, 69]),  # A
    (21.0, 25.0, 38, [54, 57, 62, 64, 69, 74]),  # Dadd9 — home
]

music = buf()
sfx = buf()

# Pad, overlapping slightly so chords breathe into each other.
for s, e, bass, voicing in CHORDS:
    d = e - s + 0.6
    g = 0.55 if s < 5.5 else 0.75
    if s >= 21:
        g = 0.95
    for k, m in enumerate(voicing):
        n = pad_note(m, d)
        n *= env_adsr(len(n), 0.5 if s > 0 else 1.6, 0.7)
        place(music, n, s, pan=(k / max(1, len(voicing) - 1) - 0.5) * 0.9, gain=g * 0.16)

# Hook: sparse piano — one note per beat, like a keynote cold open.
hook_notes = [74, 69, 66, 69, 74, 69, 66, 71, 67, 71]
for i, m in enumerate(hook_notes):
    place(music, piano(m, 2.4, 0.55), 0.5 + i * BEAT, pan=0.15 * ((-1) ** i), gain=0.8)

# From the reveal: gentle 8th-note arpeggio built from each chord.
for s, e, bass, voicing in CHORDS[2:-1]:
    tones = sorted(set(v + 12 for v in voicing))
    pattern = tones + tones[-2:0:-1]
    t = s
    i = 0
    while t < e - 1e-6:
        vel = 0.6 if i % 2 == 0 else 0.42
        place(music, piano(pattern[i % len(pattern)], 1.8, vel), t, pan=0.3 * np.sin(i * 0.9), gain=0.62)
        t += BEAT / 2
        i += 1

# Bass from the first highlight.
for s, e, bass, voicing in CHORDS[4:]:
    d = e - s
    n = int(d * SR)
    tt = np.arange(n) / SR
    b = np.sin(2 * np.pi * hz(bass + 12) * tt) + 0.25 * np.sin(2 * np.pi * hz(bass + 24) * tt)
    b *= env_adsr(n, 0.02, 0.15)
    place(music, b, s, gain=0.2 if s < 21 else 0.26)

# Soft pulse under the triad (Detect / Repair / Verified).
t = 10.5
while t < 21.0 - 1e-6:
    place(music, kick(), t, gain=0.5)
    place(music, hat(), t + BEAT / 2, pan=0.25, gain=0.35)
    t += BEAT

# Final chord: the piano plays it out.
for k, m in enumerate([50, 57, 62, 66, 69, 74]):
    place(music, piano(m, 4.0, 0.75), 21.0 + k * 0.035, pan=(k / 5 - 0.5) * 0.8, gain=0.8)

# ---------------------------------------------------------------- sound design
# Strike on max_tokens: a low, slightly unresolved note + soft thump.
place(sfx, piano(38, 3.0, 0.8) + 0.6 * piano(45, 3.0, 0.5), 1.6, gain=0.7)
place(sfx, sub_boom(1.2, 80, 45), 1.6, gain=0.25)
# Riser into the reveal, boom as the wordmark lands.
place(sfx, riser(1.3), 4.25, gain=0.1)
place(sfx, sub_boom(3.0), 5.9, gain=0.55)
place(sfx, bell(86, 3.0, 0.5), 5.95, pan=0.1, gain=0.5)
# Terminal: soft keys while the command types, blips as output lands.
for k in range(0, 18):
    place(sfx, tick(), 11.35 + k * 0.045, pan=0.2, gain=0.12)
for i, m in enumerate([78, 81, 83, 85, 81, 78]):
    place(sfx, bell(m, 0.8, 0.35), 12.4 + i * 0.1, pan=-0.2 + i * 0.08, gain=0.35)
# Repair: strike swish, then the fix lands with a chime.
place(sfx, whoosh(0.5), 15.3, pan=-0.2, gain=0.1)
place(sfx, whoosh(0.5), 15.95, pan=0.2, gain=0.12)
place(sfx, bell(86, 2.0, 0.6) + bell(81, 2.0, 0.4), 16.12, gain=0.45)
# Verified: three ascending chimes, one per check.
for at, m in ((18.6, 78), (19.0, 81), (19.4, 86)):
    place(sfx, bell(m, 2.2, 0.6), at + 0.1, gain=0.45)
# Outro: the brand lands.
place(sfx, riser(0.9), 20.1, gain=0.08)
place(sfx, sub_boom(3.5, 58, 34), 21.1, gain=0.6)

# ---------------------------------------------------------------- mix
dry = music + sfx


def reverb_ir(seconds=2.8, seed=3):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.4)
    ir = onepole_lp(ir, 5200)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    return ir / np.sqrt(np.sum(ir ** 2))


def fftconv(x, h):
    L = len(x) + len(h) - 1
    nfft = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[: len(x)]
    return y


wet = np.stack([fftconv(dry[0], reverb_ir(seed=3)), fftconv(dry[1], reverb_ir(seed=4))])
mix = dry * 0.78 + wet * 0.34

# Gentle master: fade in/out, soft clip, normalize to -1 dBFS.
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.08)
mix *= np.clip((DUR - t) / 1.0, 0, 1) ** 1.5
mix = np.tanh(mix * 1.4) / 1.4
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

pcm = (mix.T * 32767).astype(np.int16)
with wave.open("score.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote score.wav", pcm.shape)
