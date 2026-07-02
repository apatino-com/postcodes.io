import { Handler } from "../types/express";
import { isValid } from "postcode";
import {
  InvalidPostcodeError,
  PostcodeNotFoundError,
  PostcodeNotInSpdError,
} from "../lib/errors";
import { find as findScottish, toJson } from "../queries/scottish_postcodes";
import { find as findPostcode } from "../queries/postcodes";

export const show: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    if (!isValid(postcode.trim())) throw new InvalidPostcodeError();

    const result = await findScottish(postcode);
    if (!result) {
      const pResult = await findPostcode(postcode);
      if (!pResult) throw new PostcodeNotFoundError();
      throw new PostcodeNotInSpdError();
    }
    response.jsonApiResponse = { status: 200, result: toJson(result) };
    next();
  } catch (error) {
    next(error);
  }
};
