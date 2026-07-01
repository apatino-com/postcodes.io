Lookup a Scottish postcode.

Returns Scottish Postcode Directory (SPD) data associated with the postcode. The response covers the full SPD field set: council area, electoral ward, Scottish and UK parliamentary geographies, health board, integration authority, data zone, intermediate zone, output area, locality, settlement, civil parish, island, national park, travel-to-work area, ITL/LAU, urban-rural classification, SIMD rank, ROA, census counts, and the corresponding GSS / official codes under the `codes` object.

Top-level fields hold the latest (canonical) value for each datapoint. Year-suffixed fields surface prior versions where the SPD publishes them.

Returns `404` if the postcode does not exist in SPD or is not valid.

For postcodes not in SPD but present in ONSPD (i.e. non-Scottish postcodes), a `404` is returned with the error message "Postcode exists in ONSPD but not in SPD."

Source: Scottish Postcode Directory (National Records of Scotland).
