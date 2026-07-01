import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
const app = helper.postcodesioApplication();

describe("Outcodes routes", () => {
  let testOutcode: string, uri: string;

  beforeEach(() => {
    testOutcode = "AB10";
    uri = `/outcodes/${encodeURI(testOutcode)}/nearest`;
  });

  describe("GET /outcodes/:outcode/nearest", () => {
    it("should return a list of nearby outcodes", async () => {
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((o: any) =>
        expect(typeof o.outcode).toBe("string")
      );
    });
    it("should be sensitive to distance query", async () => {
      const firstResponse = await request(app)
        .get(uri)
        .expect(200);
      const secondResponse = await request(app)
        .get(uri)
        .query({
          radius: 25000,
        })
        .expect(200);
      expect(
        secondResponse.body.result.length >= firstResponse.body.result.length
      ).toBe(true);
    });

    it("should be sensitive to limit query", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          limit: 1,
        })
        .expect(200);
      expect(response.body.result.length).toBe(1);
    });

    it("should throw a 400 error if invalid limit", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          limit: "bogus",
        })
        .expect(400);
      expect(response.body.error).toBe("Invalid result limit submitted");
    });

    it("should throw a 400 error if invalid distance", async () => {
      const response = await request(app)
        .get(uri)
        .query({
          radius: "bogus",
        })
        .expect(400);
      expect(response.body.error).toBe("Invalid lookup radius submitted");
    });

    it("should respond to options", async () => {
      const response = await request(app)
        .options(uri)
        .expect(204);
      helper.validCorsOptions(response);
    });

    it("should return 404 if outcode not found", async () => {
      const testOutcode = "ZZ10";
      const path = ["/outcodes/", encodeURI(testOutcode), "/nearest"].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.error).toBe("Outcode not found");
    });
  });
});
