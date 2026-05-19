"""Caesar cipher decoder for MDM Remote Office field (shift -4, Spanish alphabet with ñ)."""

ALPHABET = "abcdefghijklmnñopqrstuvwxyz"
ALPHABET_UPPER = ALPHABET.upper()


def decode_caesar(text: str, shift: int = -4) -> str:
    """Rotate each letter by `shift` positions in the Spanish alphabet (includes ñ/Ñ)."""
    result = []
    for ch in text:
        if ch in ALPHABET:
            idx = (ALPHABET.index(ch) + shift) % len(ALPHABET)
            result.append(ALPHABET[idx])
        elif ch in ALPHABET_UPPER:
            idx = (ALPHABET_UPPER.index(ch) + shift) % len(ALPHABET_UPPER)
            result.append(ALPHABET_UPPER[idx])
        else:
            result.append(ch)
    return "".join(result)


def auto_detect_shift(sample: list[str]) -> int:
    """Try shifts in {-4, -3, -5, +4, +3, +5} and return the one producing most legible Spanish."""
    spanish_words = {"españa", "galicia", "madrid", "barcelona", "porriño", "chapela", "arteixo"}
    best_shift = -4
    best_score = -1
    for s in (-4, -3, -5, 4, 3, 5):
        decoded = [decode_caesar(t, s).lower() for t in sample[:50]]
        score = sum(any(w in d for w in spanish_words) for d in decoded)
        if score > best_score:
            best_score = score
            best_shift = s
    return best_shift
