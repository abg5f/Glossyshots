"""
Synthétise la bande-son de la vidéo : une boucle lo-fi chill et les bruitages (clics, touche, déclencheur…).
Tout est généré par le code : aucun sample externe, aucun droit à gérer, résultat reproductible.

Usage : python video/scripts/make_audio.py
Sortie : video/public/audio/*.wav
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(7)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def t_of(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Passe-bas un pôle (chaleur, adoucit les aigus)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return lowpass(highpass(x, lo), hi)


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(attack, 1e-4)) * np.exp(-t * decay)


def place(buf: np.ndarray, sound: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    j = min(len(buf), i + len(sound))
    if i < len(buf):
        buf[i:j] += sound[: j - i] * gain


def write(name: str, x: np.ndarray, peak_db: float = -1.0, stereo_width: float = 0.0) -> None:
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)
    left = x
    right = np.roll(x, int(stereo_width * SR)) if stereo_width else x
    data = (np.stack([left, right], axis=1) * 32767).astype(np.int16)
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"{name}: {len(x) / SR:.2f} s")


# ───────────────────────────── Instruments ─────────────────────────────


def rhodes(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_of(dur)
    tone = (
        np.sin(2 * np.pi * freq * t)
        + 0.32 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 3.0)
        + 0.10 * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t * 7.0)
        + 0.05 * np.sin(2 * np.pi * 7.02 * freq * t) * np.exp(-t * 20.0)  # « tine »
    )
    trem = 1 + 0.07 * np.sin(2 * np.pi * 4.2 * t)
    return tone * trem * env(len(t), 0.012, 0.85) * vel


def bell(freq: float, dur: float = 1.6) -> np.ndarray:
    t = t_of(dur)
    tone = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2.76 * freq * t) * np.exp(-t * 6)
    return tone * env(len(t), 0.004, 2.4)


def bass(freq: float, dur: float) -> np.ndarray:
    t = t_of(dur)
    tone = np.sin(2 * np.pi * freq * t) + 0.18 * np.sin(2 * np.pi * 2 * freq * t)
    return tone * env(len(t), 0.02, 1.1)


def kick() -> np.ndarray:
    t = t_of(0.35)
    f = 45 + 85 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 11)


def snare() -> np.ndarray:
    t = t_of(0.22)
    noise = bandpass(rng.standard_normal(len(t)), 900, 5000)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (noise * 0.7 + body * 0.5) * np.exp(-t * 22)


def hat() -> np.ndarray:
    t = t_of(0.06)
    return highpass(rng.standard_normal(len(t)), 6500) * np.exp(-t * 70)


# ───────────────────────────── Musique ─────────────────────────────


def music(total: float = 35.0) -> np.ndarray:
    bpm = 84
    beat = 60 / bpm
    bar = beat * 4
    swing = 0.07 * beat
    mix = np.zeros(int((total + 3) * SR))
    keys = np.zeros_like(mix)
    drums = np.zeros_like(mix)

    # Dm9 → G13 → Cmaj9 → Am9
    chords = [
        ([50, 53, 57, 60, 64], 38),
        ([47, 53, 57, 59, 64], 43),
        ([52, 55, 59, 62, 64], 36),
        ([48, 55, 59, 60, 64], 45),
    ]
    penta = [62, 65, 67, 69, 72, 74, 77]
    n_bars = int(np.ceil(total / bar))

    for b in range(n_bars):
        start = b * bar
        notes, root = chords[b % 4]
        for k, n in enumerate(notes):
            # léger arpège à l'attaque, plus humain qu'un accord plaqué
            place(keys, rhodes(midi(n), bar * 1.6, 0.55), start + k * 0.012)
            place(keys, rhodes(midi(n), bar * 0.9, 0.28), start + 2 * beat + swing + k * 0.01)
        place(mix, bass(midi(root), bar * 0.95), start, 0.55)
        place(mix, bass(midi(root + 7), beat * 1.2), start + 2.5 * beat, 0.32)

        # petite mélodie clairsemée, déterministe
        if b >= 2:
            for step in range(8):
                if rng.random() < 0.28:
                    n = penta[rng.integers(len(penta))]
                    place(keys, bell(midi(n)), start + step * beat / 2 + (swing if step % 2 else 0), 0.16)

        if 1 <= b < n_bars - 1:
            for q in range(4):
                tq = start + q * beat
                if q in (0, 2):
                    place(drums, kick(), tq, 0.9)
                if q == 2 and b % 2:
                    place(drums, kick(), tq + beat * 0.75, 0.55)
                if q in (1, 3):
                    place(drums, snare(), tq, 0.32)
                place(drums, hat(), tq, 0.16)
                place(drums, hat(), tq + beat / 2 + swing, 0.11)

    keys = lowpass(keys, 3200)
    drums = lowpass(drums, 7000)
    mix += keys * 0.55 + drums

    # Grain de vinyle : souffle doux + craquements épars
    n = len(mix)
    hiss = lowpass(rng.standard_normal(n), 2500) * 0.012
    crackle = np.zeros(n)
    idx = rng.integers(0, n, size=int(total * 9))
    crackle[idx] = rng.uniform(-1, 1, size=len(idx)) * 0.18
    mix += hiss + highpass(crackle, 1500)

    mix = mix[: int(total * SR)]
    # Fondu d'entrée court, sortie longue sur l'écran de fin
    fade_in = np.minimum(1, np.arange(len(mix)) / (0.8 * SR))
    fade_out = np.clip((total - np.arange(len(mix)) / SR) / 3.5, 0, 1)
    mix = np.tanh(mix * fade_in * fade_out * 1.2)  # saturation douce
    return mix


# ───────────────────────────── Bruitages ─────────────────────────────


def sfx_click() -> np.ndarray:
    t = t_of(0.09)
    tick = np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 160)
    snap = highpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 400)
    out = tick * 0.6 + snap * 0.5
    up = np.zeros_like(out)
    place(up, np.sin(2 * np.pi * 2900 * t) * np.exp(-t * 220) * 0.3, 0.045)
    return out + up


def sfx_mousedown() -> np.ndarray:
    t = t_of(0.05)
    return np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 180) * 0.6 + highpass(rng.standard_normal(len(t)), 3000) * np.exp(-t * 450) * 0.4


def sfx_mouseup() -> np.ndarray:
    t = t_of(0.05)
    return np.sin(2 * np.pi * 2700 * t) * np.exp(-t * 230) * 0.45


def sfx_key() -> np.ndarray:
    t = t_of(0.18)
    body = np.sin(2 * np.pi * (170 + 90 * np.exp(-t * 60)) * t) * np.exp(-t * 32)
    clack = bandpass(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t * 140)
    return body * 0.9 + clack * 0.6


def sfx_shutter() -> np.ndarray:
    out = np.zeros(int(0.25 * SR))
    for at, g in ((0.0, 1.0), (0.07, 0.7)):
        t = t_of(0.06)
        burst = bandpass(rng.standard_normal(len(t)), 1500, 7000) * np.exp(-t * 90)
        place(out, burst, at, g)
    return out


def sfx_pop() -> np.ndarray:
    t = t_of(0.12)
    f = 520 + 380 * (1 - np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.003, 38)


def sfx_tick() -> np.ndarray:
    t = t_of(0.06)
    return np.sin(2 * np.pi * 1650 * t) * env(len(t), 0.002, 75)


def sfx_whoosh() -> np.ndarray:
    dur = 0.6
    t = t_of(dur)
    noise = rng.standard_normal(len(t))
    # balayage : on mélange deux bandes selon la progression
    lo = bandpass(noise, 300, 900)
    hi = bandpass(noise, 1500, 4500)
    p = t / dur
    shape = np.sin(np.pi * p) ** 2
    return (lo * (1 - p) + hi * p) * shape


def sfx_success() -> np.ndarray:
    out = np.zeros(int(1.4 * SR))
    place(out, bell(midi(88), 1.2), 0.0, 0.8)
    place(out, bell(midi(95), 1.2), 0.09, 0.7)
    return out


def sfx_outro() -> np.ndarray:
    out = np.zeros(int(3.0 * SR))
    for k, n in enumerate([72, 76, 79, 83, 86]):  # Cmaj9 arpégé
        place(out, bell(midi(n), 2.4), k * 0.07, 0.6)
    return out


if __name__ == "__main__":
    write("music.wav", music(), peak_db=-1.0, stereo_width=0.004)
    write("click.wav", sfx_click(), -3)
    write("mousedown.wav", sfx_mousedown(), -4)
    write("mouseup.wav", sfx_mouseup(), -6)
    write("key.wav", sfx_key(), -2)
    write("shutter.wav", sfx_shutter(), -3)
    write("pop.wav", sfx_pop(), -4)
    write("tick.wav", sfx_tick(), -8)
    write("whoosh.wav", sfx_whoosh(), -6)
    write("success.wav", sfx_success(), -4)
    write("outro.wav", sfx_outro(), -3)
