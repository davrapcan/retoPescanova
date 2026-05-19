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
