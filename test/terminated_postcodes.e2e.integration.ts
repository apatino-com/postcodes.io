import request from "supertest";
import { describe, expect, it } from "vitest";
import * as helper from "./helper/index";
const app = helper.postcodesioApplication();

describe("Terminated postcodes E2E", () => {
  describe("GET /terminated_postcodes/:postcode", () => {
    it("returns exact expected response for AB10 1AA", async () => {
      const expectedResponse = {
        postcode: "AB10 1AA",
        year_terminated: 2016,
        month_terminated: 10,
        eastings: 394251,
        northings: 806376,
        longitude: -2.096655,
        latitude: 57.148216,
      };

      const response = await request(app)
        .get("/terminated_postcodes/AB10%201AA")
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result).toEqual(expectedResponse);
    });
  });
});
