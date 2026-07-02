### Postcode Data

Lookup a UK postcode against the ONS Postcode Directory (ONSPD). The response is a fully resolved record — every administrative, electoral, statistical and health geography that ONSPD ships for the postcode is returned at the top level by its human-readable name, with the equivalent GSS / official codes mirrored under the `codes` object.

The same shape is returned by `/postcodes` (bulk + search) and the reverse-geocoding endpoints. `/outcodes` returns a separate, aggregated [Outcode](#tag/Outward-Codes) shape — one row per outward code, with admin / parish / constituency arrays summarising the postcodes inside.

Returns `404` if the postcode does not exist or is not valid.
