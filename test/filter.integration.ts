import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import * as helper from "./helper/index";
const app = helper.postcodesioApplication();

describe("Filter method", () => {
  let testPostcode: string;

  beforeEach(async () => {
    const result = await helper.lookupRandomPostcode();
    if (result === null) throw new Error("Result is null");
    testPostcode = result.postcode;
  });

  describe("Bulk postcode lookup", () => {
    it("filters by filter attributes", async () => {
      const filter = "postcode";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ postcodes: [testPostcode] })
        .expect(200);
      response.body.result.forEach((resultObj: any) => {
        expect(resultObj.result["postcode"]).toBeDefined();
        expect(Object.keys(resultObj.result).length === 1).toBe(true);
      });
    });
    it("filters by attribute array", async () => {
      const filter = "postcode,country";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ postcodes: [testPostcode, testPostcode] })
        .expect(200);
      response.body.result.forEach((resultObj: any) => {
        expect(resultObj.result["postcode"]).toBeDefined();
        expect(resultObj.result["country"]).toBeDefined();
        expect(Object.keys(resultObj.result).length === 2).toBe(true);
      });
    });
    it("returns empty object if no matching filters", async () => {
      const filter = "definitely,nota,matchingfilter";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ postcodes: [testPostcode, testPostcode] })
        .expect(200);
      response.body.result.forEach((resultObj: any) => {
        expect(typeof resultObj.result).toBe("object");
        expect(Object.keys(resultObj.result)).toHaveLength(0);
      });
    });
    it("returns null on postcode not found", async () => {
      const filter = "quaLity,postcode,Bar";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ postcodes: ["OX49 NU", testPostcode] })
        .expect(200);
      expect(response.body.result[0].result === null).toBe(true);
      expect(response.body.result[1].result["postcode"]).toBeDefined();
      expect(response.body.result[1].result["quality"]).toBeDefined();
      expect(Object.keys(response.body.result[1].result).length === 2).toBe(true);
    });
    it("is case/whitespace insensitive", async () => {
      const filter = "   quALiTy,    PostcodE,   Bar";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ postcodes: [testPostcode, testPostcode] })
        .expect(200);
      expect(response.body.result[0].result["postcode"]).toBeDefined();
      expect(response.body.result[0].result["quality"]).toBeDefined();
      expect(response.body.result[1].result["postcode"]).toBeDefined();
      expect(response.body.result[1].result["quality"]).toBeDefined();
      expect(Object.keys(response.body.result[0].result).length === 2).toBe(true);
      expect(Object.keys(response.body.result[1].result).length === 2).toBe(true);
    });
  });

  describe("Bulk geolocation lookup", () => {
    let location: any;

    beforeEach(async () => {
      location = await helper.randomLocation();
    });

    it("filters by a single attribute", async () => {
      const filter = "country";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ geolocations: [location, location] })
        .expect(200);
      response.body.result.forEach((obj: any) => {
        obj.result.forEach((obj: any) => {
          expect(Object.keys(obj).length === 1).toBe(true);
          expect(obj["country"]).toBeDefined();
        });
      });
    });
    it("filters by multiple attributes", async () => {
      const filter = "country,northings";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ geolocations: [location, location] })
        .expect(200);
      response.body.result.forEach((obj: any) => {
        obj.result.forEach((obj: any) => {
          expect(Object.keys(obj).length === 2).toBe(true);
          expect(obj["country"]).toBeDefined();
          expect(obj["northings"]).toBeDefined();
        });
      });
    });
    it("returns null on postcodes not found and is case/whitespace insensitive", async () => {
      const filter = "coUntRY, nOrThings   , B22ar";
      const response = await request(app)
        .post("/postcodes")
        .query({ filter })
        .send({ geolocations: [{ longitude: 0, latitude: 0 }, location] })
        .expect(200);
      const result = response.body.result;

      result
        .filter((r: any) => r.query.longitude === 0)
        .forEach((r: any) => expect(r.result).toBeNull());

      result
        .filter((r: any) => r.query.longitude !== 0)
        .forEach((r: any) => {
          r.result.forEach((obj: any) => {
            expect(Object.keys(obj).length === 2).toBe(true);
            expect(obj["country"]).toBeDefined();
            expect(obj["northings"]).toBeDefined();
          });
        });
    });
  });
});
