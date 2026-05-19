"""Caesar cipher decoder for MDM Remote Office field.

Uses the standard 26-letter English alphabet. ñ/Ñ and all other
non-alpha characters pass through unchanged — the original encoder
treated them as non-alphabetic.
"""

ALPHABET = "abcdefghijklmnopqrstuvwxyz"
ALPHABET_UPPER = ALPHABET.upper()


def decode_caesar(text: str, shift: int = -4) -> str:
    """Rotate each ASCII letter by `shift` positions in the 26-letter alphabet."""
    n = len(ALPHABET)
    result = []
    for ch in text:
        if ch in ALPHABET:
            idx = (ALPHABET.index(ch) + shift) % n
            result.append(ALPHABET[idx])
        elif ch in ALPHABET_UPPER:
            idx = (ALPHABET_UPPER.index(ch) + shift) % n
            result.append(ALPHABET_UPPER[idx])
        else:
            result.append(ch)
    return "".join(result)


def auto_detect_shift(sample: list[str]) -> int:
    """Try shifts in {-4, -3, -5, +4, +3, +5}; return the one producing most legible Spanish."""
    spanish_words = {"españa", "galicia", "porriño", "chapela", "arteixo", "boiro", "carballo", "vigo"}
    best_shift, best_score = -4, -1
    for s in (-4, -3, -5, 4, 3, 5):
        decoded = [decode_caesar(t, s).lower() for t in sample[:50]]
        score = sum(any(w in d for w in spanish_words) for d in decoded)
        if score > best_score:
            best_score, best_shift = score, s
    return best_shift
