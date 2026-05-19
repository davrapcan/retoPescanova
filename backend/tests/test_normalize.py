from app.transforms.normalize import user_score_pct, normalize_location, country_to_iso


def test_score_pct_normal():
    # 500 raw score, 1 module completed → 50%
    assert user_score_pct(500, 1) == 50.0


def test_score_pct_clamped():
    # 1550 raw score, 1 module → 155%, clamped to 100
    assert user_score_pct(1550, 1) == 100.0


def test_score_pct_zero_modules():
    assert user_score_pct(1000, 0) == 0.0


def test_score_pct_none_score():
    # None → treat as 0 → 0.0
    assert user_score_pct(None, 3) == 0.0


def test_score_pct_none_modules():
    assert user_score_pct(500, None) == 0.0


def test_normalize_france():
    assert normalize_location("France") == "Francia"
    assert normalize_location("Francia") == "Francia"


def test_normalize_empty():
    assert normalize_location("") == "Sin asignar"
    assert normalize_location("   ") == "Sin asignar"


def test_country_iso():
    assert country_to_iso("España") == "ES"
    assert country_to_iso("Nicaragua") == "NI"
