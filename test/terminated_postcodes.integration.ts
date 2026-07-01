import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper/index";
import { parse } from "postcode";
const app = helper.postcodesioApplication();

const error404Message = "Terminated postcode not found";

describe("Terminated postcode route", () => {
  let testTerminatedPostcode: string, path: string;

  beforeEach(async () => {
    const result = await helper.randomTerminatedPostcode();
    testTerminatedPostcode = result.postcode;
  });

  describe("/GET /terminated_postcodes/:postcode", () => {
    it("should return 200 and only whitelisted attributes if terminated postcode found", async () => {
      path = `/terminated_postcodes/${encodeURI(testTerminatedPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(Object.keys(response.body).length).toBe(2);
      expect(response.body.result.postcode).toBe(testTerminatedPostcode);
    });
    it("only returns postcode, month and year of termination, eastings, northings, longitude and latitude", async () => {
      path = `/terminated_postcodes/${encodeURI(testTerminatedPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      const result = response.body.result;
      expect(Object.keys(result).length).toBe(7);
      expect(result.postcode).toBeDefined();
      expect(result.year_terminated).toBeDefined();
      expect(result.month_terminated).toBeDefined();
      expect(result.eastings).toBeDefined();
      expect(result.northings).toBeDefined();
      expect(result.longitude).toBeDefined();
      expect(result.latitude).toBeDefined();
    });
    it("returns 200 with the correct data if terminated postcode has extra spaces", async () => {
      testTerminatedPostcode = "  " + testTerminatedPostcode + "  ";
      path = `/terminated_postcodes/${encodeURI(testTerminatedPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(Object.keys(response.body).length).toBe(2);
      expect(response.body.result.postcode).toBe(testTerminatedPostcode.trim());
    });
    it("errors if legitimate postcode has special characters", async () => {
      const firstSlice = testTerminatedPostcode.slice(0, 3);
      const secondSlice = testTerminatedPostcode.slice(3);
      const bogusPostcode = `*${firstSlice}*^${secondSlice}£`;
      path = `/terminated_postcodes/"${encodeURI(bogusPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(Object.keys(response.body).length).toBe(2);
      expect(response.body.error).toBe("Invalid postcode");
    });
    it("404 if not a valid postcode according to the postcode module", async () => {
      const firstSlice = testTerminatedPostcode.slice(0, 2);
      const secondSlice = testTerminatedPostcode.slice(2, 4);
      const thirdSlice = testTerminatedPostcode.slice(4);
      testTerminatedPostcode = ` ${firstSlice} ${secondSlice} ${thirdSlice}`;
      path = `/terminated_postcodes/${encodeURI(testTerminatedPostcode)}`;
      //TODO check if change is correct with result
      expect(!parse(testTerminatedPostcode).valid).toBe(true);
      await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
    });
    it("should return 404 and the correct result if terminated postcode not found", async () => {
      testTerminatedPostcode = "ID11QE";
      path = `/terminated_postcodes/${encodeURI(testTerminatedPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(Object.keys(response.body).length).toBe(2);
      expect(response.body.error).toBe(error404Message);
    });
  });
});
