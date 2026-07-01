import { qToString } from "../lib/string";
import { Handler } from "../types/express";
import { OutcodeNotFoundError, InvalidGeolocationError } from "../lib/errors";
import { find, nearest as nearestOutcodesQuery, toJson } from "../queries/outcodes";

export const query: Handler = (request, response, next): void => {
  const { lat, lon, longitude, latitude, limit, radius } = request.query;

  request.params.limit = qToString(limit);
  request.params.radius = qToString(radius);

  if (latitude && longitude) {
    request.params.latitude = qToString(latitude);
    request.params.longitude = qToString(longitude);
    nearestOutcodes(request, response, next);
    return;
  }

  if (lat && lon) {
    request.params.latitude = qToString(lat);
    request.params.longitude = qToString(lon);
    nearestOutcodes(request, response, next);
    return;
  }

  return next(new InvalidGeolocationError());
};

export const showOutcode: Handler = async (request, response, next) => {
  try {
    const { outcode } = request.params;
    const result = await find(outcode);
    if (!result) return next(new OutcodeNotFoundError());
    response.jsonApiResponse = { status: 200, result: toJson(result) };
    next();
  } catch (error) {
    next(error);
  }
};

export const nearest: Handler = async (request, response, next) => {
  try {
    const { outcode } = request.params;
    const { limit, radius } = request.query;
    const result = await find(outcode);
    if (!result) return next(new OutcodeNotFoundError());
    request.params.longitude = qToString(result.longitude);
    request.params.latitude = qToString(result.latitude);
    request.params.limit = qToString(limit);
    request.params.radius = qToString(radius);
    nearestOutcodes(request, response, next);
  } catch (error) {
    next(error);
  }
};

const nearestOutcodes: Handler = async (request, response, next) => {
  try {
    const { longitude, latitude, limit, radius } = request.params;
    const results = await nearestOutcodesQuery({ longitude, latitude, limit, radius });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map(toJson) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};
