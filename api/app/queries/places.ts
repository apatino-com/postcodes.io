import escapeRegex from "escape-string-regexp";
import { query } from "./db";
import { unaccent } from "../lib/unaccent";
import { getConfig } from "../../config/config";

const { defaults } = getConfig();
const searchDefaults = defaults.placesSearch;

export interface PlaceRow {
  code: string;
  longitude: number;
  latitude: number;
  eastings: number;
  northings: number;
  min_eastings: number;
  min_northings: number;
  max_eastings: number;
  max_northings: number;
  local_type: string;
  outcode: string;
  name_1: string;
  name_1_lang: string | null;
  name_2: string | null;
  name_2_lang: string | null;
  county_unitary: string | null;
  county_unitary_type: string | null;
  district_borough: string | null;
  district_borough_type: string | null;
  region: string;
  country: string;
}

const SELECT_COLUMNS = `
  code, longitude, latitude, eastings, northings,
  min_eastings, min_northings, max_eastings, max_northings,
  local_type, outcode,
  name_1, name_1_lang, name_2, name_2_lang,
  county_unitary, county_unitary_type,
  district_borough, district_borough_type,
  region, country
`;

export const findByCode = async (code: string): Promise<PlaceRow | null> => {
  if (typeof code !== "string") return null;
  const result = await query<PlaceRow>({
    name: "places_find_by_code",
    text: `SELECT ${SELECT_COLUMNS} FROM public.places WHERE code = $1`,
    values: [code.toLowerCase()],
  });
  return result.rows[0] ?? null;
};

interface SearchOptions {
  name: string;
  limit?: number;
}

const clampLimit = (limit?: number): number => {
  if (!limit || limit < 1) return searchDefaults.limit.DEFAULT;
  if (limit > searchDefaults.limit.MAX) return searchDefaults.limit.MAX;
  return limit;
};

export const search = async ({
  name,
  limit,
}: SearchOptions): Promise<PlaceRow[] | null> => {
  if (!name || name.length === 0) return null;

  const searchTerm = name
    .toLowerCase()
    .trim()
    .replace(/'/g, "")
    .replace(/-/g, " ");

  const clampedLimit = clampLimit(limit);

  const terms = await termsSearch(searchTerm, clampedLimit);
  if (terms !== null) return terms;
  return prefixSearch(searchTerm, clampedLimit);
};

const termsSearch = async (
  name: string,
  limit: number
): Promise<PlaceRow[] | null> => {
  const result = await query<PlaceRow>({
    name: "places_terms_search",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.places
      WHERE name_1_search_ts @@ phraseto_tsquery('simple', $1)
        OR name_2_search_ts @@ phraseto_tsquery('simple', $1)
      ORDER BY GREATEST(
        ts_rank_cd(name_1_search_ts, phraseto_tsquery('simple', $1), 1),
        coalesce(ts_rank_cd(name_2_search_ts, phraseto_tsquery('simple', $1), 1), 0)
      ) DESC
      LIMIT $2
    `,
    values: [name, limit],
  });
  if (result.rows.length === 0) return null;
  return result.rows;
};

const prefixSearch = async (
  name: string,
  limit: number
): Promise<PlaceRow[] | null> => {
  const regex = `^${unaccent(escapeRegex(name))}.*`;
  const result = await query<PlaceRow>({
    name: "places_prefix_search",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.places
      WHERE name_1_search ~ $1 OR name_2_search ~ $1
      LIMIT $2
    `,
    values: [regex, limit],
  });
  if (result.rows.length === 0) return null;
  return result.rows;
};

let codeCache: string[] | null = null;

const loadCodes = async (): Promise<string[]> => {
  const result = await query<{ code: string }>({
    name: "places_load_codes",
    text: "SELECT code FROM public.places",
  });
  return result.rows.map((r) => r.code);
};

export const random = async (): Promise<PlaceRow | null> => {
  if (!codeCache) codeCache = await loadCodes();
  if (codeCache.length === 0) return null;
  const code = codeCache[Math.floor(Math.random() * codeCache.length)];
  return findByCode(code);
};

export const toJson = (place: PlaceRow): PlaceRow => ({
  code: place.code,
  name_1: place.name_1,
  name_1_lang: place.name_1_lang,
  name_2: place.name_2,
  name_2_lang: place.name_2_lang,
  local_type: place.local_type,
  outcode: place.outcode,
  county_unitary: place.county_unitary,
  county_unitary_type: place.county_unitary_type,
  district_borough: place.district_borough,
  district_borough_type: place.district_borough_type,
  region: place.region,
  country: place.country,
  longitude: place.longitude,
  latitude: place.latitude,
  eastings: place.eastings,
  northings: place.northings,
  min_eastings: place.min_eastings,
  min_northings: place.min_northings,
  max_eastings: place.max_eastings,
  max_northings: place.max_northings,
});
