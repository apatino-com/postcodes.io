import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import * as helper from "./helper";
const jsonResponseTypeRegex = /text\/javascript/;
const app = helper.postcodesioApplication();

describe("Utils with JSONP", () => {
  describe("Ping", () => {
    it("should pong", async () => {
      const { text } = await request(app)
        .get("/ping?callback=foo")
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(jsonBody.result).toBe("pong");
    });
  });
});

describe("Postcodes routes with JSONP", () => {
  let testPostcode: any, testOutcode: any;

  beforeEach(async () => {
    const result = await helper.lookupRandomPostcode();
    if (result === null) throw new Error("Result is null");
    testPostcode = result.postcode;
    testOutcode = result.outcode;
  });

  describe("GET /postcodes", () => {
    let uri: any;
    it("should return a list of matching postcode objects", async () => {
      uri = encodeURI(
        "/postcodes?q=" +
          testPostcode.replace(" ", "").slice(0, 2) +
          "&callback=foo"
      );
      const { text } = await request(app)
        .get(uri)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(Array.isArray(jsonBody.result)).toBe(true);
      expect(jsonBody.result.length).toBe(10);
      jsonBody.result.forEach((pc: any) => expect(typeof pc.postcode).toBe("string"));
    });
  });

  describe("GET /postcodes/:postcode", () => {
    it("should return 200 if postcode found", async () => {
      const path = [
        "/postcodes/",
        encodeURI(testPostcode),
        "?callback=foo",
      ].join("");
      const { text } = await request(app)
        .get(path)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(jsonBody.status).toBe(200);
      expect(jsonBody.result.postcode).toBe(testPostcode);
    });
  });

  describe("/outcodes/:outcode", () => {
    it("should return correct geolocation data for a given outcode", async () => {
      const path = ["/outcodes/", encodeURI(testOutcode), "?callback=foo"].join(
        ""
      );
      const { text } = await request(app)
        .get(path)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(jsonBody.status).toBe(200);
      expect(jsonBody.result.outcode).toBe(testOutcode);
      expect(jsonBody.result).toHaveProperty("longitude");
      expect(jsonBody.result).toHaveProperty("latitude");
      expect(jsonBody.result).toHaveProperty("northings");
      expect(jsonBody.result).toHaveProperty("eastings");
    });
  });

  describe("GET /postcodes/:postcode/validate", () => {
    it("should return true if postcode found", async () => {
      const path = [
        "/postcodes/",
        encodeURI(testPostcode),
        "/validate",
        "?callback=foo",
      ].join("");
      const { text } = await request(app)
        .get(path)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(jsonBody.status).toBe(200);
      expect(jsonBody.result).toBe(true);
    });
  });

  describe("GET /postcodes/:postcode/nearest", () => {
    it("should return a list of nearby postcodes", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const result = await request(app)
        .get(uri)
        .query({ callback: "foo" })
        .expect(200);
      const { text } = result;
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(Array.isArray(jsonBody.result)).toBe(true);
      expect(jsonBody.result.length > 0).toBe(true);
      jsonBody.result.forEach((pc: any) => {
        expect(typeof pc.postcode).toBe("string");
        expect(typeof pc.distance).toBe("number");
      });
    });
  });

  describe("GET /random/postcode", () => {
    it("should return a random postcode", async () => {
      const path = "/random/postcodes?callback=foo";
      const { text } = await request(app)
        .get(path)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(typeof jsonBody.result.postcode).toBe("string");
    });
  });

  describe("GET /postcodes/:postcode/autocomplete", () => {
    let uri: any;

    it("should return a list of matching postcodes only", async () => {
      uri = encodeURI(
        "/postcodes/" + testPostcode.slice(0, 2) + "/autocomplete?callback=foo"
      );

      const { text } = await request(app)
        .get(uri)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(Array.isArray(jsonBody.result)).toBe(true);
      expect(jsonBody.result.length).toBe(10);
      jsonBody.result.forEach((pc: any) => expect(typeof pc).toBe("string"));
    });
  });

  describe("GET /postcodes/lon/:longitude/lat/:latitude", () => {
    let loc: any;

    beforeEach(async () => {
      loc = await helper.locationWithNearbyPostcodes();
    });

    it("should return a list of nearby postcodes", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" +
          loc.longitude +
          "/lat/" +
          loc.latitude +
          "?callback=foo"
      );
      const { text } = await request(app)
        .get(uri)
        .expect("Content-Type", jsonResponseTypeRegex)
        .expect(200);
      const jsonBody: any = helper.jsonpResponseBody(text);
      expect(Array.isArray(jsonBody.result)).toBe(true);
      expect(jsonBody.result.length > 0).toBe(true);
      jsonBody.result.forEach((pc: any) => {
        expect(typeof pc.postcode).toBe("string");
        expect(typeof pc.distance).toBe("number");
      });
      expect(
        jsonBody.result.some((elem: any) => elem.postcode === loc.postcode)
      ).toBe(true);
    });
  });
});
