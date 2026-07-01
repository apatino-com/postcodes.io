import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
const app = helper.postcodesioApplication();

describe("Outcodes routes", () => {
  describe("GET /outcodes/:outcode", () => {
    const testOutcode = "AB10";
    it("should return correct geolocation data for a given outcode", async () => {
      const path = ["/outcodes/", encodeURI(testOutcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result.outcode).toBe(testOutcode);
      expect(response.body.result.id).toBeUndefined();
      expect(response.body.result.location).toBeUndefined();
    });
    it("should be case insensitive", async () => {
      const path = ["/outcodes/", encodeURI(testOutcode.toLowerCase())].join(
        ""
      );
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result.outcode).toBe(testOutcode);
    });
    it("should be space insensitive", async () => {
      const path = ["/outcodes/", encodeURI(testOutcode + "   ")].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result.outcode).toBe(testOutcode);
    });
    it("should return 404 for an outcode which does not exist", async () => {
      const path = ["/outcodes/", encodeURI("DEFINITELYBOGUS")].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.result).toBeUndefined();
      expect(response.body.error).toBe("Outcode not found");
    });
    it("should respond to options", async () => {
      const path = ["/outcodes/", encodeURI(testOutcode)].join("");
      const response = await request(app)
        .options(path)
        .expect(204);
      helper.validCorsOptions(response);
    });
  });
  describe("GET /outcodes", () => {
    let loc: any, uri: string;

    beforeEach(() => {
      uri = "/outcodes";
      loc = {
        longitude: -2.09301393644196,
        latitude: 57.1392691975667,
      };
    });

    it("returns a list of nearby postcodes", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
        })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((outcode: any) => {
        expect(typeof outcode.outcode).toBe("string");
      });
    });
    it("accepts full spelling of longitude and latitude", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          longitude: loc.longitude,
          latitude: loc.latitude,
        })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((outcode: any) => {
        expect(typeof outcode.outcode).toBe("string");
      });
    });
    it("returns 400 if longitude is missing", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          latitude: loc.latitude,
        })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(400);
      expect(response.body.status).toBe(400);
    });
    it("returns 400 if latitude is missing", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          longitude: loc.longitude,
        })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(400);
      expect(response.body.status).toBe(400);
    });
    it("is sensitive to distance query", async () => {
      const firstResponse = await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
        })
        .expect(200);
      const secondResponse = await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
          radius: 25000,
        })
        .expect(200);
      expect(
        secondResponse.body.result.length >= firstResponse.body.result.length
      ).toBe(true);
    });
    it("is sensitive to limit query", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
          limit: 1,
        })
        .expect(200);
      expect(response.body.result.length).toBe(1);
    });
    it("returns a 400 error if invalid longitude", async () => {
      await request(app)
        .get(uri)
        .query({
          lon: "BOGUS",
          lat: loc.latitude,
        })
        .expect(400);
    });
    it("returns a 400 error if invalid latitude", async () => {
      await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: "BOGUS",
        })
        .expect(400);
    });
    it("returns a 400 error if invalid limit", async () => {
      await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
          limit: "BOGUS",
        })
        .expect(400);
    });
    it("returns a 400 error if invalid distance", async () => {
      await request(app)
        .get(uri)
        .query({
          lon: loc.longitude,
          lat: loc.latitude,
          radius: "BOGUS",
        })
        .expect(400);
    });
    it("returns null if no outcodes nearby", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          lat: 0,
          lon: 0,
        })
        .expect(200);
      expect(response.body.result).toBeNull();
    });
    it("responds to options", async () => {
      const response = await request(app)
        .options(uri)
        .expect(204);
      helper.validCorsOptions(response);
    });
  });
});
