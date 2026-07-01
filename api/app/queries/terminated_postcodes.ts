import { isValid } from "postcode";
import { query } from "./db";

export interface TerminatedPostcodeRow {
  postcode: string;
  year_terminated: number;
  month_terminated: number;
  eastings: number | null;
  northings: number | null;
  longitude: number | null;
  latitude: number | null;
}

interface RawRow {
  postcode: string;
  date_of_termination: string;
  eastings: number | null;
  northings: number | null;
  longitude: number | null;
  latitude: number | null;
}

export const find = async (
  postcode: string | null | undefined
): Promise<TerminatedPostcodeRow | null> => {
  if (!postcode) return null;
  const trimmed = postcode.trim().toUpperCase();
  if (!isValid(trimmed)) return null;
  const compact = trimmed.replace(/\s/g, "");

  const result = await query<RawRow>({
    name: "terminated_postcodes_find",
    text: `
      SELECT postcode, date_of_termination, eastings, northings, longitude, latitude
      FROM public.postcodes
      WHERE replace(postcode, ' ', '') = $1
        AND date_of_termination IS NOT NULL
      LIMIT 1
    `,
    values: [compact],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    postcode: row.postcode,
    year_terminated: parseInt(row.date_of_termination.slice(0, 4), 10),
    month_terminated: parseInt(row.date_of_termination.slice(4, 6), 10),
    eastings: row.eastings,
    northings: row.northings,
    longitude: row.longitude,
    latitude: row.latitude,
  };
};

export const toJson = (t: TerminatedPostcodeRow): TerminatedPostcodeRow => ({
  postcode: t.postcode,
  year_terminated: t.year_terminated,
  month_terminated: t.month_terminated,
  eastings: t.eastings,
  northings: t.northings,
  longitude: t.longitude,
  latitude: t.latitude,
});
