import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
const app = helper.postcodesioApplication();

describe("Postcodes routes", () => {
  beforeEach(async () => {
    await helper.lookupRandomPostcode();
  });

  describe("GET /postcodes/lon/:longitude/lat/latitude", () => {
    let loc: any;

    beforeEach(async () => {
      loc = await helper.locationWithNearbyPostcodes();
    });

    it("should return a list of nearby postcodes", async () => {
      const uri = encodeURI(
        `/postcodes/lon/${loc.longitude}/lat/${loc.latitude}`
      );

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
      expect(
        response.body.result.some((elem: any) => elem.postcode === loc.postcode)
      ).toBe(true);
    });
    it("should be sensitive to distance query", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude
      );
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
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude
      );
      const response = await request(app)
        .get(uri)
        .query({ limit: 1 })
        .expect(200);
      expect(response.body.result.length).toBe(1);
    });
    it("should throw a 400 error if invalid longitude", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + "BOGUS" + "/lat/" + loc.latitude
      );
      await request(app).get(uri).expect(400);
    });
    it("should throw a 400 error if invalid latitude", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + "BOGUS"
      );
      await request(app).get(uri).expect(400);
    });
    it("should throw a 400 error if invalid limit", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude
      );
      await request(app).get(uri).query({ limit: "BOGUS" }).expect(400);
    });
    it("should throw a 400 error if invalid distance", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude
      );
      await request(app).get(uri).query({ radius: "BOGUS" }).expect(400);
    });
    it("returns null if no postcodes nearby", async () => {
      const uri = encodeURI("/postcodes/lon/0/lat/0");
      const response = await request(app).get(uri).expect(200);
      expect(response.body.result).toBeNull();
    });
    it("should respond to options", async () => {
      const uri = encodeURI(
        "/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude
      );
      const response = await request(app).options(uri).expect(204);
      helper.validCorsOptions(response);
    });
  });

  describe("GET /postcodes?lon=:longitude&lat=:latitude", () => {
    let loc: any, uri: string;

    beforeEach(async () => {
      uri = "/postcodes/";
      loc = await helper.locationWithNearbyPostcodes();
    });

    it("returns a list of nearby postcodes", async () => {
      const response = await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
        expect(typeof postcode.distance).toBe("number");
      });
      expect(
        response.body.result.some((elem: any) => elem.postcode === loc.postcode)
      ).toBe(true);
    });
    it("accepts full spelling of longitude and latitude", async () => {
      const response = await request(app)
        .get(uri)
        .query({ longitude: loc.longitude, latitude: loc.latitude })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length > 0).toBe(true);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
        expect(typeof postcode.distance).toBe("number");
      });
      expect(
        response.body.result.some((elem: any) => elem.postcode === loc.postcode)
      ).toBe(true);
    });
    it("falls back to a postcode query if longitude is missing", async () => {
      const response = await request(app)
        .get(uri)
        .query({ latitude: loc.latitude })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(400);
      expect(response.body.status).toBe(400);
    });
    it("falls back to a postcode query if latitude is missing", async () => {
      const response = await request(app)
        .get(uri)
        .query({ longitude: loc.longitude })
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(400);
      expect(response.body.status).toBe(400);
    });
    it("is sensitive to distance query", async () => {
      const firstResponse = await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude })
        .expect(200);
      const secondResponse = await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude, radius: 2000 })
        .expect(200);
      expect(
        secondResponse.body.result.length >= firstResponse.body.result.length
      ).toBe(true);
    });
    it("is sensitive to limit query", async () => {
      const response = await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude, limit: 1 })
        .expect(200);
      expect(response.body.result.length).toBe(1);
    });
    it("returns a 400 error if invalid longitude", async () => {
      await request(app)
        .get(uri)
        .query({ lon: "BOGUS", lat: loc.latitude })
        .expect(400);
    });
    it("returns a 400 error if invalid latitude", async () => {
      await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: "BOGUS" })
        .expect(400);
    });
    it("returns a 400 error if invalid limit", async () => {
      await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude, limit: "BOGUS" })
        .expect(400);
    });
    it("returns a 400 error if invalid distance", async () => {
      await request(app)
        .get(uri)
        .query({ lon: loc.longitude, lat: loc.latitude, radius: "BOGUS" })
        .expect(400);
    });
    it("returns null if no postcodes nearby", async () => {
      const uri = encodeURI("/postcodes");
      const response = await request(app)
        .get(uri)
        .query({ lat: 0, lon: 0 })
        .expect(200);
      expect(response.body.result).toBeNull();
    });
    it("responds to options", async () => {
      const response = await request(app).options(uri).expect(204);
      helper.validCorsOptions(response);
    });
    describe("Wide Area Searches", () => {
      let longitude: any, latitude: any;
      beforeEach(() => {
        longitude = -2.12659411941741;
        latitude = 57.2465923827836;
      });
      it("allows search over a larger area", async () => {
        const response = await request(app)
          .get("/postcodes")
          .query({ longitude, latitude, wideSearch: true })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(10);
      });

      it("allows search over a larger area using 'widesearch'", async () => {
        const response = await request(app)
          .get("/postcodes")
          .query({ longitude, latitude, widesearch: true })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(10);
      });

      it("does not allow limit to exceed 10", async () => {
        const response = await request(app)
          .get("/postcodes")
          .query({ longitude, latitude, limit: 100, wideSearch: true })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(10);
      });

      it("does allows limit to be below 10", async () => {
        const response = await request(app)
          .get("/postcodes")
          .query({ longitude, latitude, limit: 1, wideSearch: true })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(1);
      });
    });
  });
});
