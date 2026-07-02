import { query } from "../../api/app/queries/db";
import { getConfig as configFactory } from "../../api/config/config";
import {
  random as randomPostcodeQuery,
  find as findPostcodeQuery,
} from "../../api/app/queries/postcodes";

import { unaccent } from "../../api/app/lib/unaccent";
import * as errors from "../../api/app/lib/errors";
import * as string from "../../api/app/lib/string";
import * as timeout from "../../api/app/lib/timeout";

import app from "../../api/app";

const config = configFactory();

const postcodesioApplication = (cfg?: any) => app(cfg || config);

const locationWithNearbyPostcodes = async function () {
  const postcodeWithNearbyPostcodes = "AB14 0LP";
  return findPostcodeQuery(postcodeWithNearbyPostcodes);
};

const getRandom = (max: number) => Math.ceil(Math.random() * max);

const QueryTerminatedPostcode = `
	SELECT postcode
	FROM public.postcodes
	WHERE date_of_termination IS NOT NULL
	LIMIT 1 OFFSET $1
`;

async function randomTerminatedPostcode() {
  const randomId = getRandom(8);
  const result = await query(QueryTerminatedPostcode, [randomId]);
  return result.rows.length === 0 ? null : result.rows[0];
}

const randomPostcode = async () => {
  const result = await randomPostcodeQuery();
  return result?.postcode;
};

const randomOutcode = async () => {
  const result = await randomPostcodeQuery();
  return result?.outcode;
};

const randomLocation = async () => {
  const result = await randomPostcodeQuery();
  if (!result) return null;
  return { longitude: result.longitude, latitude: result.latitude };
};

const lookupRandomPostcode = async () => randomPostcodeQuery();

// HTTP Helpers
export * from "./http";

export {
  configFactory,
  config,
  randomOutcode,
  randomPostcode,
  randomTerminatedPostcode,
  randomLocation,
  lookupRandomPostcode,
  locationWithNearbyPostcodes,
  unaccent,
  errors,
  string,
  timeout,
  postcodesioApplication,
};
