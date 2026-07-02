import request from "supertest";
import { describe, expect, it } from "vitest";
import * as helper from "./helper/index";
const app = helper.postcodesioApplication();

describe("Places E2E", () => {
  describe("GET /places/:code", () => {
    it("returns exact expected response for osgb4000000074558362", async () => {
      const expectedResponse = {
        code: "osgb4000000074558362",
        name_1: "Clestrain",
        name_1_lang: null,
        name_2: null,
        name_2_lang: null,
        local_type: "Other Settlement",
        outcode: "KW16",
        county_unitary: "Orkney Islands",
        county_unitary_type: "UnitaryAuthority",
        district_borough: null,
        district_borough_type: null,
        region: "Scotland",
        country: "Scotland",
        longitude: -3.209590302133838,
        latitude: 58.94274852555889,
        eastings: 330491,
        northings: 1006798,
        min_eastings: 329011,
        min_northings: 1005860,
        max_eastings: 331758,
        max_northings: 1009740,
      };

      const response = await request(app)
        .get("/places/osgb4000000074558362")
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result).toEqual(expectedResponse);
    });
  });
});
