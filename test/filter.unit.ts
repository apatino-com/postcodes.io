import { describe, expect, it, beforeEach } from "vitest";
import { filter } from "../api/config/filter";
import * as fs from "node:fs";
import * as path from "node:path";

const bulkPostcodePath = path.resolve(__dirname, "./seed/bulk_postcode.json");
const bulkGeocodingPath = path.resolve(__dirname, "./seed/bulk_geocoding.json");
const bulkPostcodeResult = JSON.parse(
  fs.readFileSync(bulkPostcodePath, "utf8")
);
const bulkGeocodingResult = JSON.parse(
  fs.readFileSync(bulkGeocodingPath, "utf8")
);
const cloneObject = (o: any) => JSON.parse(JSON.stringify(o));

describe("Filter middleware", () => {
  let request: any, response: any;

  beforeEach(() => {
    request = {
      query: {
        filter: "fOo,bar,qUAlity,country",
      },
      route: {
        path: "/postcodes",
      },
    };

    response = {
      jsonApiResponse: {
        result: [
          {
            query: {},
            result: {
              quality: "1",
              longitude: "453",
              country: "United Kingdom",
            },
          },
        ],
        status: 200,
      },
    };
  });

  it("invokes next if there's no jsonResponse", () =>
    new Promise<void>((resolve) => {
      delete response.jsonApiResponse;
      expect(response.jsonApiResponse).toBeUndefined();
      filter(request, response, resolve);
    }));

  it("invokes next if there's no filter", () =>
    new Promise<void>((resolve) => {
      delete request.query.filter;
      expect(request.query.filter).toBeUndefined();
      filter(request, response, resolve);
    }));

  it("invokes next if filter is an empty string", () =>
    new Promise<void>((resolve) => {
      request.query.filter = "";
      filter(request, response, resolve);
    }));

  it("invokes next if status is not 200", () =>
    new Promise<void>((resolve) => {
      response.jsonApiResponse.status = 3321424;
      expect(response.jsonApiResponse.status).not.toBe(200);
      filter(request, response, resolve);
    }));

  it("ignores attributes which are not whitelisted", () =>
    new Promise<void>((resolve) => {
      let result: any = response.jsonApiResponse.result;
      request.query.filter += ",notallowed";
      result = result.map((r: any) => {
        r.result.notallowed = "bad";
        return r;
      });
      filter(request, response, () => {
        response.jsonApiResponse.result.forEach((r: any) => {
          expect(r.result.notallowed).toBeUndefined();
        });
        resolve();
      });
    }));

  it("returns whitelisted attributes that report null", () =>
    new Promise<void>((resolve) => {
      response.jsonApiResponse.result[0].result.country = null;
      filter(request, response, () => {
        expect(response.jsonApiResponse.result[0].result.country).toBeNull();
        resolve();
      });
    }));

  describe("Bulk postcode lookup", () => {
    let request: any, response: any;

    beforeEach(() => {
      request = {
        query: {
          filter: "quALitY,foo,EaStings",
        },
        route: { path: "/postcodes" },
      };
      response = {
        jsonApiResponse: {
          status: 200,
          result: cloneObject(bulkPostcodeResult),
        },
      };
    });

    it("returns empty objects if no valid filters", () =>
      new Promise<void>((resolve) => {
        request.query.filter = "inVaLidFilter,anotherInvaliDFILTER";
        expect(request.query.filter).toBe(
          "inVaLidFilter,anotherInvaliDFILTER"
        );
        filter(request, response, () => {
          const expectedResult = [
            { query: "M32 0JG", result: {} },
            { query: "OX49 5NU", result: {} },
          ];
          expect(response.jsonApiResponse.result).toEqual(expectedResult);
          resolve();
        });
      }));

    it("returns whitelisted attributes given only some filters", () =>
      new Promise<void>((resolve) => {
        request.query.filter = "posTCOde , foo,BaR,   eaSTings ";
        filter(request, response, () => {
          const expectedResult = [
            {
              query: "M32 0JG",
              result: {
                postcode: "M32 0JG",
                eastings: 379988,
              },
            },
            {
              query: "OX49 5NU",
              result: {
                postcode: "OX49 5NU",
                eastings: 464447,
              },
            },
          ];
          expect(response.jsonApiResponse.result).toEqual(expectedResult);
          resolve();
        });
      }));

    it("preserves postcode not found results (null)", () =>
      new Promise<void>((resolve) => {
        request.query.filter = "posTCOde , foo,BaR,   eaSTings ";
        response.jsonApiResponse.result[1].result = null;
        response.jsonApiResponse.result[1].query = "OX49 NU";
        filter(request, response, () => {
          const expectedResult = [
            {
              query: "M32 0JG",
              result: {
                postcode: "M32 0JG",
                eastings: 379988,
              },
            },
            {
              query: "OX49 NU",
              result: null,
            },
          ];
          expect(response.jsonApiResponse.result).toEqual(expectedResult);
          resolve();
        });
      }));
  });

  describe("Bulk reverse geocoding", () => {
    let request: any, response: any;

    beforeEach(() => {
      request = {
        query: {
          filter: "quALitY,foo,EaStings",
        },
        route: { path: "/postcodes" },
      };

      response = {
        jsonApiResponse: {
          status: 200,
          result: cloneObject(bulkGeocodingResult),
        },
      };
    });

    it("filters response attributes by filter query", () =>
      new Promise<void>((resolve) => {
        filter(request, response, () => {
          expect(response.jsonApiResponse).toEqual({
            status: 200,
            result: [
              {
                query: {
                  longitude: "0.629834723775309",
                  latitude: "51.7923246977375",
                },
                result: [
                  {
                    quality: 1,
                    eastings: 581459,
                  },
                  {
                    quality: 1,
                    eastings: 581508,
                  },
                ],
              },
              {
                query: {
                  longitude: "-2.49690382054704",
                  latitude: "53.5351312861402",
                  radius: "1000",
                  limit: "5",
                },
                result: [
                  {
                    quality: 1,
                    eastings: 367163,
                  },
                  {
                    quality: 1,
                    eastings: 367155,
                  },
                ],
              },
            ],
          });
          resolve();
        });
      }));

    it("preserves empty results (i.e. `null`s)", () =>
      new Promise<void>((resolve) => {
        response = {
          jsonApiResponse: {
            status: 200,
            result: [
              {
                query: {
                  longitude: "0",
                  latitude: "0",
                },
                result: null,
              },
              {
                query: {
                  longitude: "-2.49690382054704",
                  latitude: "53.5351312861402",
                  radius: "1000",
                  limit: "5",
                },
                result: [
                  {
                    postcode: "M46 9WU",
                    quality: 1,
                    eastings: 367163,
                    northings: 404390,
                  },
                  {
                    postcode: "M46 9XF",
                    quality: 1,
                    eastings: 367155,
                    northings: 404364,
                  },
                ],
              },
            ],
          },
        };

        filter(request, response, () => {
          expect(response.jsonApiResponse).toEqual({
            status: 200,
            result: [
              {
                query: {
                  longitude: "0",
                  latitude: "0",
                },
                result: null,
              },
              {
                query: {
                  longitude: "-2.49690382054704",
                  latitude: "53.5351312861402",
                  radius: "1000",
                  limit: "5",
                },
                result: [
                  {
                    quality: 1,
                    eastings: 367163,
                  },
                  {
                    quality: 1,
                    eastings: 367155,
                  },
                ],
              },
            ],
          });
          resolve();
        });
      }));
  });
});
