from app.transforms.caesar import decode_caesar, auto_detect_shift


def test_decode_chapela():
    assert decode_caesar("Gletipe", -4) == "Chapela"


def test_decode_porrino():
    assert decode_caesar("Tsvvmñs", -4) == "Porriño"


def test_decode_arteixo():
    assert decode_caesar("Evximbs", -4) == "Arteixo"


def test_decode_boiro():
    assert decode_caesar("Fsmvs", -4) == "Boiro"


def test_decode_espana_segment():
    # "Iwteñe" → "España" (ñ passes through)
    assert decode_caesar("Iwteñe", -4) == "España"


def test_passthrough_non_alpha():
    assert decode_caesar("(Gsp) - 123", -4) == "(Col) - 123"


def test_wrap_around():
    # a=0, (0-4+26)%26=22=w
    assert decode_caesar("a", -4) == "w"


def test_uppercase_preserved():
    assert decode_caesar("GLETIPE", -4) == "CHAPELA"


def test_auto_detect_returns_minus_4():
    sample = ["Gletipe", "Tsvvmñs", "Evximbs", "Fsmvs", "Iwteñe"]
    assert auto_detect_shift(sample) == -4
