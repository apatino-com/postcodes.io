import request from "supertest";
import { describe, expect, it } from "vitest";
import { postcodesioApplication } from "./helper";
import { isValid } from "postcode";
const app = postcodesioApplication();

const error404Message = "Postcode not found";

describe("Scottish postcode route", () => {
  const testPostcode = "AB10 1AB";

  describe("/GET /scotland/postcodes/:postcode", () => {
    it("should return 200 if postcode found", async () => {
      const path = `/scotland/postcodes/${encodeURI(testPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
    });

    it("returns canonical SPD attributes", async () => {
      const path = `/scotland/postcodes/${encodeURI(testPostcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      const { result } = response.body;
      expect(result.postcode).toBe("AB10 1AB");
      expect(result.council_area).toBe("Aberdeen City");
      expect(result.codes.council_area).toBe("S12000033");
      expect(typeof result.scottish_parliamentary_constituency).toBe("string");
      expect(typeof result.codes).toBe("object");
    });

    it("accepts padded postcode", async () => {
      const postcode = "  " + testPostcode + "  ";
      const path = `/scotland/postcodes/${encodeURI(postcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result.postcode).toBe("AB10 1AB");
    });

    it("404 if not a valid postcode according to the postcode module", async () => {
      const path = `/scotland/postcodes/foo`;
      expect(isValid("foo")).toBe(false);
      await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
    });

    it("should return 404 if postcode not found", async () => {
      const postcode = "ID11QE";
      const path = `/scotland/postcodes/${encodeURI(postcode)}`;
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.error).toBe(error404Message);
    });
  });
});
