import { isEmpty, qToString } from "../lib/string";
import { isValid } from "postcode";
import { getConfig } from "../../config/config";
import {
  InvalidPostcodeError,
  PostcodeNotFoundError,
  InvalidJsonQueryError,
  JsonArrayRequiredError,
  ExceedMaxGeolocationsError,
  ExceedMaxPostcodesError,
  PostcodeQueryRequiredError,
  InvalidGeolocationError,
  InvalidLimitError,
  InvalidRadiusError,
} from "../lib/errors";
import { Handler } from "../types/express";
import {
  PostcodeRow,
  NearestPostcodesOptions,
  ResolvedNearest,
  find,
  findMany,
  search,
  random as randomPostcode,
  nearestPostcodes,
  nearestPostcodesMany,
  toJson,
} from "../queries/postcodes";
import { find as findTerminated } from "../queries/terminated_postcodes";

const { defaults } = getConfig();

export const show: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    if (!isValid(postcode.trim())) throw new InvalidPostcodeError();

    const result = await find(postcode);
    if (!result) {
      const terminated = await findTerminated(postcode);
      throw new PostcodeNotFoundError(terminated);
    }
    response.jsonApiResponse = { status: 200, result: toJson(result) };
    next();
  } catch (error) {
    next(error);
  }
};

export const valid: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    const result = await find(postcode);
    response.jsonApiResponse = { status: 200, result: !!result };
    next();
  } catch (error) {
    next(error);
  }
};

export const random: Handler = async (request, response, next) => {
  try {
    const { outcode } = request.query;
    const result = await randomPostcode(qToString(outcode));
    response.jsonApiResponse = {
      status: 200,
      result: result ? toJson(result) : null,
    };
    return next();
  } catch (error) {
    next(error);
  }
};

export const bulk: Handler = (request, response, next) => {
  if (request.body.postcodes)
    return bulkLookupPostcodes(request, response, next);
  try {
    if (request.body.geolocations) return bulkGeocode(request, response, next);
  } catch (err) {
    return next(err);
  }
  return next(new InvalidJsonQueryError());
};

const MAX_GEOLOCATIONS = defaults.bulkGeocode.geolocations.MAX;

interface LookupGeolocationResult {
  query: { [index: string]: unknown };
  result: null | ReturnType<typeof toJson>[];
}

const QUERY_WHITELIST = ["limit", "longitude", "latitude", "radius", "widesearch"];
const sanitizeGeoQuery = (q: NearestPostcodesOptions) => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(q)) {
    if (QUERY_WHITELIST.indexOf(key.toLowerCase()) !== -1) result[key] = value;
  }
  return result;
};

const isWidesearch = (l: NearestPostcodesOptions) =>
  !!l.widesearch || !!l.wideSearch;

const clampLimit = (raw: string | undefined): number => {
  let limit = defaults.nearest.limit.DEFAULT;
  if (raw !== undefined) {
    limit = parseInt(raw, 10);
    if (isNaN(limit)) throw new InvalidLimitError();
  }
  if (limit > defaults.nearest.limit.MAX) limit = defaults.nearest.limit.MAX;
  return limit;
};

const clampRadius = (raw: string | undefined): number => {
  let radius = defaults.nearest.radius.DEFAULT;
  if (raw !== undefined) {
    radius = parseFloat(raw);
    if (isNaN(radius)) throw new InvalidRadiusError();
  }
  if (radius > defaults.nearest.radius.MAX) radius = defaults.nearest.radius.MAX;
  return radius;
};

const resolveNearest = (l: NearestPostcodesOptions): ResolvedNearest => {
  const longitude = parseFloat(l.longitude);
  if (isNaN(longitude)) throw new InvalidGeolocationError();
  const latitude = parseFloat(l.latitude);
  if (isNaN(latitude)) throw new InvalidGeolocationError();
  return {
    longitude,
    latitude,
    limit: clampLimit(l.limit),
    radius: clampRadius(l.radius),
  };
};

const bulkGeocode: Handler = async (request, response, next) => {
  try {
    const { geolocations } = request.body;

    let globalLimit: string | undefined;
    if (request.query.limit) globalLimit = qToString(request.query.limit);

    let globalRadius: string | undefined;
    if (request.query.radius) globalRadius = qToString(request.query.radius);

    let globalWidesearch: boolean | undefined;
    if (request.query.widesearch) globalWidesearch = true;

    if (!Array.isArray(geolocations)) return next(new JsonArrayRequiredError());
    if (geolocations.length > MAX_GEOLOCATIONS)
      return next(new ExceedMaxGeolocationsError());

    const merged: NearestPostcodesOptions[] = geolocations.map((g) => ({
      ...(globalLimit && { limit: globalLimit }),
      ...(globalRadius && { radius: globalRadius }),
      ...(globalWidesearch && { widesearch: true }),
      ...g,
    }));

    const data: LookupGeolocationResult[] = new Array(merged.length);
    const batchIdx: number[] = [];
    const batchResolved: ResolvedNearest[] = [];

    await Promise.all(
      merged.map(async (location, i) => {
        if (isWidesearch(location)) {
          const postcodes = await nearestPostcodes(location);
          data[i] = {
            query: sanitizeGeoQuery(location),
            result:
              postcodes && postcodes.length > 0 ? postcodes.map(toJson) : null,
          };
          return;
        }
        batchIdx.push(i);
        batchResolved.push(resolveNearest(location));
      })
    );

    if (batchResolved.length > 0) {
      const batched = await nearestPostcodesMany(batchResolved);
      batched.forEach((rows, j) => {
        const i = batchIdx[j];
        data[i] = {
          query: sanitizeGeoQuery(merged[i]),
          result: rows.length > 0 ? rows.map(toJson) : null,
        };
      });
    }

    response.jsonApiResponse = { status: 200, result: data };
    next();
  } catch (error) {
    next(error);
  }
};

const MAX_POSTCODES = defaults.bulkLookups.postcodes.MAX;

interface BulkLookupPostcodesResult {
  query: string;
  result: null | ReturnType<typeof toJson>;
}

const bulkLookupPostcodes: Handler = async (request, response, next) => {
  try {
    const { postcodes } = request.body;
    if (!Array.isArray(postcodes)) return next(new JsonArrayRequiredError());
    if (postcodes.length > MAX_POSTCODES)
      return next(new ExceedMaxPostcodesError());

    const inputs = postcodes.filter((pc): pc is string => typeof pc === "string");
    const compacts: (string | null)[] = inputs.map((pc) => {
      const t = pc.trim().toUpperCase();
      return isValid(t) ? t.replace(/\s/g, "") : null;
    });

    const unique = Array.from(
      new Set(compacts.filter((c): c is string => c !== null))
    );
    const rows = await findMany(unique);
    const byCompact = new Map(rows.map((r) => [r.pc_compact, r]));

    const result: BulkLookupPostcodesResult[] = inputs.map((pc, i) => {
      const compact = compacts[i];
      const row = compact ? byCompact.get(compact) : undefined;
      return { query: pc, result: row ? toJson(row) : null };
    });

    response.jsonApiResponse = { status: 200, result };
    next();
  } catch (error) {
    next(error);
  }
};

export const query: Handler = async (request, response, next) => {
  request.params.limit = qToString(request.query.limit);
  request.params.radius = qToString(request.query.radius);

  if (request.query.latitude && request.query.longitude) {
    request.params.latitude = qToString(request.query.latitude);
    request.params.longitude = qToString(request.query.longitude);
    nearest_byLatLon(request, response, next);
    return;
  }

  if (request.query.lat && request.query.lon) {
    request.params.latitude = qToString(request.query.lat);
    request.params.longitude = qToString(request.query.lon);
    nearest_byLatLon(request, response, next);
    return;
  }

  const postcode: string = qToString(request.query.q || request.query.query);
  if (isEmpty(postcode)) return next(new PostcodeQueryRequiredError());

  try {
    const results = await search({
      limit: qToString(request.query.limit),
      postcode,
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map(toJson) : null,
    };
    return next();
  } catch (error) {
    next(error);
  }
};

export const autocomplete: Handler = async (request, response, next) => {
  try {
    const results = await search({
      postcode: request.params.postcode,
      limit: qToString(request.query.limit),
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map((p: PostcodeRow) => p.postcode) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const nearest_byLatLon: Handler = async (request, response, next) => {
  try {
    const { longitude, latitude, limit, radius } = request.params;
    const results = await nearestPostcodes({
      longitude,
      latitude,
      limit,
      radius,
      wideSearch: !!request.query.wideSearch || !!request.query.widesearch,
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map(toJson) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const lonlat: Handler = async (request, response, next) => {
  try {
    const { limit, radius } = request.query;
    request.params.limit = qToString(limit);
    request.params.radius = qToString(radius);
    return nearest_byLatLon(request, response, next);
  } catch (error) {
    next(error);
  }
};

export const nearest: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    const { limit, radius } = request.query;
    const result = await find(postcode);
    if (!result) return next(new PostcodeNotFoundError());
    request.params.longitude = qToString(result.longitude);
    request.params.latitude = qToString(result.latitude);
    request.params.limit = qToString(limit);
    request.params.radius = qToString(radius);
    return nearest_byLatLon(request, response, next);
  } catch (error) {
    next(error);
  }
};
