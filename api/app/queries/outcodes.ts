import { query } from "./db";
import {
  InvalidGeolocationError,
  InvalidLimitError,
  InvalidRadiusError,
} from "../lib/errors";
import { getConfig } from "../../config/config";

const { defaults } = getConfig();
const radiusDefaults = defaults.nearestOutcodes.radius;
const limitDefaults = defaults.nearestOutcodes.limit;

export interface OutcodeRow {
  outcode: string;
  longitude: number | null;
  latitude: number | null;
  northings: number;
  eastings: number;
  admin_district: string[];
  parish: string[];
  admin_county: string[];
  admin_ward: string[];
  country: string[];
  parliamentary_constituency: string[];
}

export interface OutcodeNearbyRow extends OutcodeRow {
  distance: number;
}

// Normalise NULL array_agg results (no source rows passed the matview
// FILTER) into empty arrays so the public contract stays `string[]`.
const COALESCE_ARRAY = (col: string) =>
  `COALESCE(${col}, ARRAY[]::text[]) AS ${col}`;

const SELECT_COLUMNS = `
  outcode, longitude, latitude, eastings, northings,
  ${COALESCE_ARRAY("admin_district")},
  ${COALESCE_ARRAY("parish")},
  ${COALESCE_ARRAY("admin_county")},
  ${COALESCE_ARRAY("admin_ward")},
  ${COALESCE_ARRAY("country")},
  ${COALESCE_ARRAY("parliamentary_constituency")}
`;

const normaliseOutcode = (outcode: string): string =>
  outcode.toUpperCase().replace(/\s/g, "");

export const find = async (outcode?: string): Promise<OutcodeRow | null> => {
  if (!outcode) return null;
  const result = await query<OutcodeRow>({
    name: "outcodes_find",
    text: `
      SELECT ${SELECT_COLUMNS}
      FROM public.outcodes
      WHERE outcode = $1
    `,
    values: [normaliseOutcode(outcode)],
  });
  return result.rows[0] ?? null;
};

interface NearestOptions {
  longitude: string;
  latitude: string;
  limit?: string;
  radius?: string;
}

export const nearest = async (
  params: NearestOptions
): Promise<OutcodeNearbyRow[] | null> => {
  const longitude = parseFloat(params.longitude);
  if (isNaN(longitude)) throw new InvalidGeolocationError();

  const latitude = parseFloat(params.latitude);
  if (isNaN(latitude)) throw new InvalidGeolocationError();

  let limit = limitDefaults.DEFAULT;
  if (params.limit) {
    limit = parseInt(params.limit, 10);
    if (isNaN(limit)) throw new InvalidLimitError();
  }
  if (limit > limitDefaults.MAX) limit = limitDefaults.MAX;

  let radius = radiusDefaults.DEFAULT;
  if (params.radius) {
    radius = parseFloat(params.radius);
    if (isNaN(radius)) throw new InvalidRadiusError();
  }
  if (radius > radiusDefaults.MAX) radius = radiusDefaults.MAX;

  const result = await query<OutcodeNearbyRow>({
    name: "outcodes_nearest",
    text: `
      SELECT
        ${SELECT_COLUMNS},
        ST_Distance(
          location,
          ST_MakePoint($1::float8, $2::float8)::geography
        ) AS distance
      FROM public.outcodes
      WHERE ST_DWithin(
        location,
        ST_MakePoint($1::float8, $2::float8)::geography,
        $3::float8
      )
      ORDER BY distance
      LIMIT $4::int
    `,
    values: [longitude, latitude, radius, limit],
  });
  if (result.rows.length === 0) return null;
  return result.rows;
};

export const toJson = (o: OutcodeRow): OutcodeRow => ({
  outcode: o.outcode,
  longitude: o.longitude,
  latitude: o.latitude,
  northings: o.northings,
  eastings: o.eastings,
  admin_district: o.admin_district,
  parish: o.parish,
  admin_county: o.admin_county,
  admin_ward: o.admin_ward,
  country: o.country,
  parliamentary_constituency: o.parliamentary_constituency,
});
