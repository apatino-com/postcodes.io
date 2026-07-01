import { Handler } from "../types/express";
import { isValid } from "postcode";
import { InvalidPostcodeError, TPostcodeNotFoundError } from "../lib/errors";
import { find, toJson } from "../queries/terminated_postcodes";

export const show: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;

    if (!isValid(postcode.trim())) throw new InvalidPostcodeError();

    const result = await find(postcode);
    if (!result) throw new TPostcodeNotFoundError();

    response.jsonApiResponse = { status: 200, result: toJson(result) };
    next();
  } catch (error) {
    next(error);
  }
};
