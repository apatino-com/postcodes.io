import { isValid, validOutcode } from "postcode";
import { query } from "./db";
import { getConfig } from "../../config/config";
import {
  InvalidGeolocationError,
  InvalidLimitError,
  InvalidRadiusError,
} from "../lib/errors";

const { defaults } = getConfig();

export interface PostcodeRow {
  postcode: string;
  pc_compact: string;
  incode: string;
  outcode: string;
  quality: number | null;
  eastings: number | null;
  northings: number | null;
  longitude: number | null;
  latitude: number | null;
  country: string | null;
  nhs_ha: string | null;
  region: string | null;
  primary_care_trust: string | null;
  european_electoral_region: string | null;
  admin_county: string | null;
  admin_district: string | null;
  admin_ward: string | null;
  parish: string | null;
  parliamentary_constituency: string | null;
  senedd_constituency: string | null;
  senedd_constituency_no: number | null;
  ced: string | null;
  ccg: string | null;
  nuts: string | null;
  pfa: string | null;
  nhs_region: string | null;
  ttwa: string | null;
  national_park: string | null;
  bua: string | null;
  icb: string | null;
  cancer_alliance: string | null;
  lsoa: string | null;
  lsoa11: string | null;
  lsoa21: string | null;
  msoa: string | null;
  msoa11: string | null;
  msoa21: string | null;
  ruc11: string | null;
  ruc21: string | null;
  lep1: string | null;
  lep2: string | null;
  date_of_introduction: string | null;
  date_of_termination: string | null;
  index_of_multiple_deprivation: number | null;

  admin_county_id: string | null;
  admin_district_id: string | null;
  admin_ward_id: string | null;
  parish_id: string | null;
  constituency_id: string | null;
  ced_id: string | null;
  ccg_id: string | null;
  ccg_code: string | null;
  nuts_id: string | null;
  nuts_code: string | null;
  lsoa_id: string | null;
  lsoa11_id: string | null;
  lsoa21_id: string | null;
  msoa_id: string | null;
  msoa11_id: string | null;
  msoa21_id: string | null;
  oa21_id: string | null;
  ruc11_id: string | null;
  ruc21_id: string | null;
  lep1_id: string | null;
  lep2_id: string | null;
  pfa_id: string | null;
  nhs_region_id: string | null;
  ttwa_id: string | null;
  national_park_id: string | null;
  bua_id: string | null;
  icb_id: string | null;
  cancer_alliance_id: string | null;

  distance?: number;
}

const SELECT_COLUMNS = `
  postcode,
  replace(postcode, ' ', '') AS pc_compact,
  incode,
  outcode,
  CASE WHEN quality ~ '^[0-9]+$' THEN quality::int ELSE NULL END AS quality,
  eastings,
  northings,
  longitude,
  latitude,
  country,
  nhs_ha,
  region,
  primary_care_trust,
  european_electoral_region,
  admin_county,
  admin_district,
  admin_ward,
  parish,
  parliamentary_constituency,
  senedd_constituency, senedd_constituency_no,
  ced, ccg, nuts, pfa,
  nhs_region, ttwa, national_park, bua, icb, cancer_alliance,
  lsoa, lsoa11, lsoa21,
  msoa, msoa11, msoa21,
  ruc11, ruc21, lep1, lep2,
  date_of_introduction, date_of_termination, index_of_multiple_deprivation,
  admin_county_id, admin_district_id, admin_ward_id, parish_id, constituency_id,
  ced_id, ccg_id, ccg_code, nuts_id, nuts_code,
  lsoa_id, lsoa11_id, lsoa21_id, msoa_id, msoa11_id, msoa21_id, oa21_id,
  ruc11_id, ruc21_id, lep1_id, lep2_id, pfa_id,
  nhs_region_id, ttwa_id, national_park_id, bua_id, icb_id, cancer_alliance_id
`;

export const find = async (
  postcode: string | null | undefined
): Promise<PostcodeRow | null> => {
  if (!postcode) return null;
  const trimmed = postcode.trim().toUpperCase();
  if (!isValid(trimmed)) return null;
  const compact = trimmed.replace(/\s/g, "");
  const result = await query<PostcodeRow>({
    name: "postcodes_find",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.postcodes
      WHERE replace(postcode, ' ', '') = $1
        AND date_of_termination IS NULL
      LIMIT 1
    `,
    values: [compact],
  });
  return result.rows[0] ?? null;
};

export const findMany = async (
  compacts: string[]
): Promise<PostcodeRow[]> => {
  if (compacts.length === 0) return [];
  const result = await query<PostcodeRow>({
    name: "postcodes_find_many",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.postcodes
      WHERE replace(postcode, ' ', '') = ANY($1::text[])
        AND date_of_termination IS NULL
    `,
    values: [compacts],
  });
  return result.rows;
};

interface SearchOptions {
  postcode: string;
  limit?: string;
}

const clampSearchLimit = (limit?: string): number => {
  const parsed = parseInt(limit ?? "", 10);
  if (isNaN(parsed) || parsed < 1) return defaults.search.limit.DEFAULT;
  if (parsed > defaults.search.limit.MAX) return defaults.search.limit.MAX;
  return parsed;
};

export const search = async (
  options: SearchOptions
): Promise<PostcodeRow[] | null> => {
  const upper = options.postcode.toUpperCase().trim();
  const compact = upper.replace(/\s+/g, "");
  const limit = clampSearchLimit(options.limit);

  const extractPartial = (rows: PostcodeRow[]) =>
    rows.filter((r) => r.pc_compact.includes(compact));

  const finalise = (rows: PostcodeRow[]): PostcodeRow[] | null => {
    const matches = extractPartial(rows);
    if (matches.length === 0) return null;
    const exact = matches.filter((r) => r.pc_compact === compact);
    return exact.length > 0 ? exact : matches;
  };

  if (validOutcode(upper)) {
    const r = await searchByPostcode(`${upper} `, limit);
    if (extractPartial(r).length > 0) return finalise(r);
  }

  if (upper.match(/^\w+\s+\w+$/)) {
    const r = await searchByPostcode(upper.split(/\s+/).join(" "), limit);
    if (extractPartial(r).length > 0) return finalise(r);
  }

  const r = await searchByPcCompact(compact, limit);
  return finalise(r);
};

const searchByPostcode = async (
  prefix: string,
  limit: number
): Promise<PostcodeRow[]> => {
  const result = await query<PostcodeRow>({
    name: "postcodes_search_by_postcode",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.postcodes
      WHERE postcode >= $1
        AND date_of_termination IS NULL
      ORDER BY postcode ASC
      LIMIT $2
    `,
    values: [prefix, limit],
  });
  return result.rows;
};

const searchByPcCompact = async (
  prefix: string,
  limit: number
): Promise<PostcodeRow[]> => {
  const result = await query<PostcodeRow>({
    name: "postcodes_search_by_pc_compact",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.postcodes
      WHERE replace(postcode, ' ', '') >= $1
        AND date_of_termination IS NULL
      ORDER BY replace(postcode, ' ', '') ASC
      LIMIT $2
    `,
    values: [prefix, limit],
  });
  return result.rows;
};

export interface NearestPostcodesOptions {
  longitude: string;
  latitude: string;
  limit?: string;
  radius?: string;
  widesearch?: boolean;
  wideSearch?: boolean;
}

export const nearestPostcodes = async (
  options: NearestPostcodesOptions
): Promise<PostcodeRow[] | null> => {
  const longitude = parseFloat(options.longitude);
  if (isNaN(longitude)) throw new InvalidGeolocationError();
  const latitude = parseFloat(options.latitude);
  if (isNaN(latitude)) throw new InvalidGeolocationError();

  let limit = defaults.nearest.limit.DEFAULT;
  if (options.limit) {
    limit = parseInt(options.limit, 10);
    if (isNaN(limit)) throw new InvalidLimitError();
  }
  if (limit > defaults.nearest.limit.MAX) limit = defaults.nearest.limit.MAX;

  let radius = defaults.nearest.radius.DEFAULT;
  if (options.radius) {
    radius = parseFloat(options.radius);
    if (isNaN(radius)) throw new InvalidRadiusError();
  }
  if (radius > defaults.nearest.radius.MAX) radius = defaults.nearest.radius.MAX;

  if (options.wideSearch || options.widesearch) {
    if (limit > defaults.nearest.limit.DEFAULT) {
      limit = defaults.nearest.limit.DEFAULT;
    }
    const wide = await deriveMaxRange(longitude, latitude);
    if (wide === null) return null;
    radius = wide;
  }

  const result = await query<PostcodeRow>({
    name: "postcodes_nearest_knn",
    text: `
      SELECT
        ${SELECT_COLUMNS},
        (location OPERATOR(public.<->) ST_MakePoint($1::float8, $2::float8)::geography) AS distance
      FROM public.postcodes
      WHERE date_of_termination IS NULL
        AND ST_DWithin(location, ST_MakePoint($1::float8, $2::float8)::geography, $3::float8, false)
      ORDER BY location OPERATOR(public.<->) ST_MakePoint($1::float8, $2::float8)::geography
      LIMIT $4::int
    `,
    values: [longitude, latitude, radius, limit],
  });
  if (result.rows.length === 0) return null;
  return result.rows;
};

export interface ResolvedNearest {
  longitude: number;
  latitude: number;
  limit: number;
  radius: number;
}

export const nearestPostcodesMany = async (
  items: ResolvedNearest[]
): Promise<Array<PostcodeRow[]>> => {
  if (items.length === 0) return [];
  const idx: number[] = [];
  const lng: number[] = [];
  const lat: number[] = [];
  const radii: number[] = [];
  const limits: number[] = [];
  items.forEach((it, i) => {
    idx.push(i);
    lng.push(it.longitude);
    lat.push(it.latitude);
    radii.push(it.radius);
    limits.push(it.limit);
  });

  const result = await query<PostcodeRow & { idx: number }>({
    name: "postcodes_nearest_many_knn",
    text: `
      WITH inputs AS (
        SELECT
          idx,
          ST_MakePoint(lng, lat)::geography AS pt,
          radius,
          lim
        FROM UNNEST(
          $1::int[], $2::float8[], $3::float8[], $4::float8[], $5::int[]
        ) AS t(idx, lng, lat, radius, lim)
      )
      SELECT i.idx, o.*
      FROM inputs i
      JOIN LATERAL (
        SELECT
          ${SELECT_COLUMNS},
          (location OPERATOR(public.<->) i.pt) AS distance
        FROM public.postcodes
        WHERE date_of_termination IS NULL
          AND ST_DWithin(location, i.pt, i.radius, false)
        ORDER BY location OPERATOR(public.<->) i.pt
        LIMIT i.lim
      ) o ON true
      ORDER BY i.idx, distance ASC
    `,
    values: [idx, lng, lat, radii, limits],
  });

  const grouped: PostcodeRow[][] = items.map((): PostcodeRow[] => []);
  for (const row of result.rows) {
    grouped[row.idx].push(row);
  }
  return grouped;
};

const START_RANGE = 500;
const MAX_RANGE = 20000;
const SEARCH_LIMIT = 10;
const INCREMENT = 1000;

const countWithin = async (
  longitude: number,
  latitude: number,
  radius: number
): Promise<number> => {
  const result = await query<{ distance: number }>({
    name: "postcodes_nearest_count",
    text: `
      SELECT 1 AS distance
      FROM public.postcodes
      WHERE date_of_termination IS NULL
        AND ST_DWithin(location, ST_MakePoint($1::float8, $2::float8)::geography, $3::float8)
      LIMIT $4
    `,
    values: [longitude, latitude, radius, SEARCH_LIMIT],
  });
  return result.rowCount ?? 0;
};

const deriveMaxRange = async (
  longitude: number,
  latitude: number
): Promise<number | null> => {
  if ((await countWithin(longitude, latitude, START_RANGE)) >= SEARCH_LIMIT) {
    return START_RANGE;
  }
  if ((await countWithin(longitude, latitude, MAX_RANGE)) === 0) {
    return null;
  }
  for (let r = START_RANGE + INCREMENT; r <= MAX_RANGE; r += INCREMENT) {
    if ((await countWithin(longitude, latitude, r)) >= SEARCH_LIMIT) return r;
  }
  return MAX_RANGE;
};

const cachedRandomPostcodes: Record<string, string[]> = {};

const loadRandomPostcodes = async (
  outcode: string | undefined
): Promise<string[]> => {
  const result = outcode
    ? await query<{ postcode: string }>({
        name: "postcodes_random_by_outcode",
        text: `
          SELECT postcode FROM public.postcodes
          WHERE date_of_termination IS NULL
            AND outcode = $1
        `,
        values: [outcode.toUpperCase().replace(/\s/g, "")],
      })
    : await query<{ postcode: string }>({
        name: "postcodes_random_all",
        text: `
          SELECT postcode FROM public.postcodes
          WHERE date_of_termination IS NULL
        `,
      });
  return result.rows.map((r) => r.postcode);
};

export const random = async (
  outcode?: string | null
): Promise<PostcodeRow | null> => {
  const key = outcode ? outcode.toUpperCase().replace(/\s/g, "") : "__all__";
  if (!cachedRandomPostcodes[key]) {
    cachedRandomPostcodes[key] = await loadRandomPostcodes(outcode || undefined);
  }
  const list = cachedRandomPostcodes[key];
  if (list.length === 0) return null;
  const pick = list[Math.floor(Math.random() * list.length)];
  return find(pick);
};

export const toJson = (p: PostcodeRow) => ({
  postcode: p.postcode,
  quality: p.quality,
  eastings: p.eastings,
  northings: p.northings,
  country: p.country,
  nhs_ha: p.nhs_ha,
  longitude: p.longitude,
  latitude: p.latitude,
  european_electoral_region: p.european_electoral_region,
  primary_care_trust: p.primary_care_trust,
  region: p.region,
  lsoa: p.lsoa21,
  msoa: p.msoa21,
  incode: p.incode,
  outcode: p.outcode,
  parliamentary_constituency: p.parliamentary_constituency,
  parliamentary_constituency_2024: p.parliamentary_constituency,
  senedd_constituency: p.senedd_constituency,
  senedd_constituency_no: p.senedd_constituency_no,
  admin_district: p.admin_district,
  parish: p.parish,
  admin_county: p.admin_county,
  date_of_introduction: p.date_of_introduction,
  date_of_termination: p.date_of_termination || null,
  index_of_multiple_deprivation: p.index_of_multiple_deprivation,
  admin_ward: p.admin_ward,
  ced: p.ced,
  ccg: p.ccg,
  nuts: p.nuts,
  pfa: p.pfa,
  nhs_region: p.nhs_region,
  ttwa: p.ttwa,
  national_park: p.national_park,
  bua: p.bua,
  icb: p.icb,
  cancer_alliance: p.cancer_alliance,
  lsoa11: p.lsoa11,
  msoa11: p.msoa11,
  lsoa21: p.lsoa21,
  msoa21: p.msoa21,
  oa21: p.oa21_id,
  ruc11: p.ruc11,
  ruc21: p.ruc21,
  lep1: p.lep1,
  lep2: p.lep2,
  codes: {
    admin_district: p.admin_district_id,
    admin_county: p.admin_county_id,
    admin_ward: p.admin_ward_id,
    parish: p.parish_id,
    parliamentary_constituency: p.constituency_id,
    parliamentary_constituency_2024: p.constituency_id,
    ccg: p.ccg_id,
    ccg_id: p.ccg_code,
    ced: p.ced_id,
    nuts: p.nuts_code,
    lsoa: p.lsoa21_id,
    msoa: p.msoa21_id,
    lau2: p.nuts_id,
    pfa: p.pfa_id,
    nhs_region: p.nhs_region_id,
    ttwa: p.ttwa_id,
    national_park: p.national_park_id,
    bua: p.bua_id,
    icb: p.icb_id,
    cancer_alliance: p.cancer_alliance_id,
    lsoa11: p.lsoa11_id,
    msoa11: p.msoa11_id,
    lsoa21: p.lsoa21_id,
    msoa21: p.msoa21_id,
    oa21: p.oa21_id,
    ruc11: p.ruc11_id,
    ruc21: p.ruc21_id,
    lep1: p.lep1_id,
    lep2: p.lep2_id,
  },
  ...(p.distance !== undefined && { distance: p.distance }),
});
