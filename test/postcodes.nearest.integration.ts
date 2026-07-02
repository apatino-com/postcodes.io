import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
import request from "supertest";
const app = helper.postcodesioApplication();

describe("Postcodes routes", () => {
  let testPostcode: string;

  beforeEach(async () => {
    const result = await helper.lookupRandomPostcode();
    if (result === null) throw new Error("Result is null");
    testPostcode = result.postcode;
  });

  describe("GET /postcodes/:postcode/nearest", () => {
    it("should return a list of nearby postcodes", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
        expect(typeof postcode.distance).toBe("number");
      });
    });
    it("should be sensitive to distance query", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const firstResponse = await request(app).get(uri).expect(200);
      const secondResponse = await request(app)
        .get(uri)
        .query({ radius: 2000 })
        .expect(200);
      expect(
        secondResponse.body.result.length >= firstResponse.body.result.length
      ).toBe(true);
    });

    it("should be sensitive to limit query", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const response = await request(app)
        .get(uri)
        .query({ limit: 1 })
        .expect(200);
      expect(response.body.result.length).toBe(1);
    });

    it("should throw a 400 error if invalid limit", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const response = await request(app)
        .get(uri)
        .query({ limit: "bogus" })
        .expect(400);
      expect(response.body.error).toBe("Invalid result limit submitted");
    });

    it("should throw a 400 error if invalid distance", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const response = await request(app)
        .get(uri)
        .query({ radius: "bogus" })
        .expect(400);
      expect(response.body.error).toBe("Invalid lookup radius submitted");
    });

    it("should respond to options", async () => {
      const uri = encodeURI("/postcodes/" + testPostcode + "/nearest");

      const response = await request(app).options(uri).expect(204);
      helper.validCorsOptions(response);
    });

    it("should return 404 if postcode not found", async () => {
      const testPostcode = "ID11QE";
      const path = ["/postcodes/", encodeURI(testPostcode), "/nearest"].join(
        ""
      );
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.error).toBe("Postcode not found");
    });
  });
});
