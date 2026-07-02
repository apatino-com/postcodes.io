import { qToString } from "../lib/string";
import { PlaceNotFoundError, InvalidQueryError } from "../lib/errors";
import { Handler, Response, Next } from "../types/express";
import { findByCode, random as randomPlace, search, toJson } from "../queries/places";

export const show: Handler = async (request, response, next) => {
  try {
    const { id } = request.params;
    const place = await findByCode(id.toLowerCase());
    if (!place) return next(new PlaceNotFoundError());
    response.jsonApiResponse = { status: 200, result: toJson(place) };
    next();
  } catch (error) {
    next(error);
  }
};

export const random: Handler = async (_, response, next) => {
  try {
    const place = await randomPlace();
    if (!place) return next(new PlaceNotFoundError());
    response.jsonApiResponse = { status: 200, result: toJson(place) };
    next();
  } catch (error) {
    next(error);
  }
};

const returnEmptyResponse = (response: Response, next: Next): void => {
  response.jsonApiResponse = { status: 200, result: [] };
  next();
};

export const query: Handler = async (request, response, next) => {
  try {
    const q = request.query.query || request.query.q;
    if (!q) return next(new InvalidQueryError());

    const name = qToString(request.query.query || request.query.q) || "";
    if (name.trim().length === 0) return returnEmptyResponse(response, next);

    const rawLimit = parseInt(qToString(request.query.limit || request.query.l), 10);
    const limit = isNaN(rawLimit) ? undefined : rawLimit;

    const places = await search({ name, limit });
    if (!places) return returnEmptyResponse(response, next);

    response.jsonApiResponse = {
      status: 200,
      result: places.map(toJson),
    };
    next();
  } catch (error) {
    next(error);
  }
};
