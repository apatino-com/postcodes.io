const {
  RATE_LIMIT_ENABLED,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_BULK_WINDOW_MS,
  RATE_LIMIT_BULK_MAX,
  NEAREST_RADIUS_DEFAULT,
  NEAREST_RADIUS_MAX,
  NEAREST_LIMIT_DEFAULT,
  NEAREST_LIMIT_MAX,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  BULKGEOCODE_GEOLOCATIONS_MAX,
  BULKLOOKUPS_POSTCODES_MAX,
  NEARESTOUTCODES_RADIUS_DEFAULT,
  NEARESTOUTCODES_RADIUS_MAX,
  NEARESTOUTCODES_LIMIT_DEFAULT,
  NEARESTOUTCODES_LIMIT_MAX,
  PLACESSEARCH_LIMIT_DEFAULT,
  PLACESSEARCH_LIMIT_MAX,
} = process.env;

import { parseEnv } from "../app/lib/env";

export const defaults = {
  rateLimit: {
    enabled: parseEnv(RATE_LIMIT_ENABLED, true),
    windowMs: parseEnv(RATE_LIMIT_WINDOW_MS, 60000), // Rate limit window in milliseconds
    max: parseEnv(RATE_LIMIT_MAX, 300), // Maximum requests per IP per window
    bulk: {
      windowMs: parseEnv(RATE_LIMIT_BULK_WINDOW_MS, 60000),
      max: parseEnv(RATE_LIMIT_BULK_MAX, 30), // Stricter cap for bulk lookup/geocode requests
    },
  },
  nearest: {
    radius: {
      DEFAULT: parseEnv(NEAREST_RADIUS_DEFAULT, 100),
      MAX: parseEnv(NEAREST_RADIUS_MAX, 2000),
    },
    limit: {
      DEFAULT: parseEnv(NEAREST_LIMIT_DEFAULT, 10),
      MAX: parseEnv(NEAREST_LIMIT_MAX, 100),
    },
  },
  search: {
    limit: {
      DEFAULT: parseEnv(SEARCH_LIMIT_DEFAULT, 10),
      MAX: parseEnv(SEARCH_LIMIT_MAX, 100),
    },
  },
  bulkGeocode: {
    geolocations: {
      MAX: parseEnv(BULKGEOCODE_GEOLOCATIONS_MAX, 100), // Maximum number of geolocations per request
    },
  },
  bulkLookups: {
    postcodes: {
      MAX: parseEnv(BULKLOOKUPS_POSTCODES_MAX, 100), // Maximum number of postcodes per request
    },
  },
  nearestOutcodes: {
    radius: {
      DEFAULT: parseEnv(NEARESTOUTCODES_RADIUS_DEFAULT, 5000),
      MAX: parseEnv(NEARESTOUTCODES_RADIUS_MAX, 25000),
    },
    limit: {
      DEFAULT: parseEnv(NEARESTOUTCODES_LIMIT_DEFAULT, 10),
      MAX: parseEnv(NEARESTOUTCODES_LIMIT_MAX, 100),
    },
  },
  placesSearch: {
    limit: {
      DEFAULT: parseEnv(PLACESSEARCH_LIMIT_DEFAULT, 10),
      MAX: parseEnv(PLACESSEARCH_LIMIT_MAX, 100),
    },
  },
  filterableAttributes: [
    "postcode",
    "quality",
    "eastings",
    "northings",
    "country",
    "nhs_ha",
    "longitude",
    "latitude",
    "parliamentary_constituency",
    "european_electoral_region",
    "primary_care_trust",
    "region",
    "lsoa",
    "msoa",
    "incode",
    "outcode",
    "codes",
    "admin_district",
    "parish",
    "admin_county",
    "admin_ward",
    "ccg",
    "nuts",
    "ced",
  ],
};
