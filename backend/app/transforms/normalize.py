"""Location normalization and country ISO mapping."""

LOCATION_MAP: dict[str, str] = {
    "Francia": "Francia",
    "France": "Francia",
    "": "Sin asignar",
}

COUNTRY_ISO: dict[str, str] = {
    "España": "ES",
    "Ecuador": "EC",
    "Nicaragua": "NI",
    "Argentina": "AR",
    "Francia": "FR",
    "Grecia": "GR",
    "Guatemala": "GT",
    "Portugal": "PT",
    "Namibia": "NA",
    "Sudáfrica": "ZA",
    "Mozambique": "MZ",
    "Angola": "AO",
    "Italia": "IT",
    "Irlanda": "IE",
    "Perú": "PE",
    "Estados Unidos": "US",
}


def normalize_location(raw: str) -> str:
    if not raw or str(raw).strip() == "":
        return "Sin asignar"
    stripped = str(raw).strip()
    return LOCATION_MAP.get(stripped, stripped)


def country_to_iso(country: str) -> str:
    return COUNTRY_ISO.get(country, country[:2].upper())


def user_score_pct(overall_score_raw, modules_completed) -> float:
    """
    Score = (raw_score / (1000 * modules_completed)) * 100, clamped to 100.
    None inputs → 0 (penalizes user/country).
    """
    if overall_score_raw is None:
        overall_score_raw = 0
    if modules_completed is None or modules_completed == 0:
        return 0.0
    pct = (overall_score_raw / (1000.0 * modules_completed)) * 100.0
    return min(pct, 100.0)
