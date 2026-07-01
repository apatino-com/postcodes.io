import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
const app = helper.postcodesioApplication();

describe("Postcodes routes", () => {
  beforeEach(async () => {
    await helper.lookupRandomPostcode();
  });

  describe("POST /postcodes", () => {
    const bulkLength = 12;
    let testPostcodes: any, testLocations: any;

    describe("Invalid JSON submission", () => {
      it("returns 400 on invalid JSON", async () => {
        const response = await request(app)
          .post("/postcodes")
          .set({ "Content-Type": "application/json" })
          .send("}{")
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(400);
        expect(response.body.error).toMatch(/invalid json submitted/gi);
      });
    });

    describe("Bulk geocoding", () => {
      beforeEach(async () => {
        testLocations = await Promise.all(
          Array.from({ length: bulkLength }, () => helper.randomLocation())
        );
      });

      it("should return postcodes for specified geolocations", async () => {
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: testLocations })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(Array.isArray(response.body.result)).toBe(true);
        expect(response.body.result.length).toBe(bulkLength);
        response.body.result.forEach((lookup: any) => {
          expect(lookup).toHaveProperty("query");
          expect(lookup).toHaveProperty("result");
          expect(Array.isArray(lookup.result)).toBe(true);
          lookup.result.forEach((result: any) => {
            expect(typeof result.postcode).toBe("string");
            expect(typeof result.distance).toBe("number");
          });
        });
      });
      it("should return null if no nearby postcode", async () => {
        const response = await request(app)
          .post("/postcodes")
          .send({
            geolocations: [
              {
                longitude: 0,
                latitude: 0,
              },
            ],
          })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(1);
        expect(response.body.result[0].result).toBeNull();
      });
      it("should refuse request if lookups number over 100", async () => {
        testLocations = [];
        for (let i = 0; i < 101; i++) {
          testLocations.push("bogus");
        }
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: testLocations })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(400);
        expect(response.body.error).toMatch(/too many locations submitted/i);
      });

      it("should return 404 if invalid geolocations object", async () => {
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: "Bogus" })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(400);
        expect(response.body.error).toMatch(/Invalid data submitted/i);
      });
      it("is sensitive to limit", async () => {
        const testLocation = {
          longitude: -2.084524,
          latitude: 57.129475,
          limit: 1,
        };
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(1);
        expect(response.body.result[0].result.length).toBe(1);
        expect(typeof response.body.result[0].result[0].postcode).toBe("string");
        expect(typeof response.body.result[0].result[0].distance).toBe("number");
      });

      it("is sensitive to limit set in query string", async () => {
        const testLocation = {
          longitude: -2.084524,
          latitude: 57.129475,
        };
        const response = await request(app)
          .post("/postcodes?limit=1")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(1);
        expect(response.body.result[0].result.length).toBe(1);
        expect(typeof response.body.result[0].result[0].postcode).toBe("string");
        expect(typeof response.body.result[0].result[0].distance).toBe("number");
      });
      it("overrides global limit with local", async () => {
        const testLocation = {
          longitude: -2.084524,
          latitude: 57.129475,
          limit: 2,
        };
        const response = await request(app)
          .post("/postcodes?limit=1")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result.length).toBe(1);
        expect(response.body.result[0].result.length).toBe(2);
        expect(typeof response.body.result[0].result[0].postcode).toBe("string");
        expect(typeof response.body.result[0].result[0].distance).toBe("number");
      });
      it("is sensitive to radius", async () => {
        const testLocation = testLocations[0];
        testLocation.limit = 100;
        testLocation.radius = 100;
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result[0].result.length > 0).toBe(true);
        const count = response.body.result[0].result.length;
        const query = response.body.result[0].query;
        expect(query.limit).toBeDefined();
        expect(query.radius).toBe(testLocation.radius);
        expect(typeof response.body.result[0].result[0].postcode).toBe("string");
        expect(typeof response.body.result[0].result[0].distance).toBe("number");
        testLocation.radius = 1000;
        const response2 = await request(app)
          .post("/postcodes")
          .send({ geolocations: [testLocation] })
          .expect(200);
        expect(response2.body.result[0].result.length > count).toBe(true);
      });

      it("returns searches in order", async () => {
        const geolocations = [
          {
            longitude: -2.084524,
            latitude: 57.129475,
          },
          {
            longitude: -2.014524,
            latitude: 57.129475,
          },
          {
            longitude: -2.024524,
            latitude: 57.129475,
          },
        ];
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations })
          .expect(200);
        for (let i = 0; i < geolocations.length; i += 1) {
          expect(geolocations[i].longitude).toBe(
            response.body.result[i].query.longitude
          );
        }
      });

      it("allows wide area searches", async () => {
        const testLocation = {
          longitude: -2.12659411941741,
          latitude: 57.2465923827836,
          wideSearch: true,
        };
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result[0].result.length).toBe(10);
        expect(response.body.result[0].query["wideSearch"]).toBe(true);
        expect(response.body.result[0].query["lowerBound"]).toBeUndefined();
        expect(response.body.result[0].query["upperBound"]).toBeUndefined();
      });
      it("allows wide area searches using 'widesearch'", async () => {
        const testLocation = {
          longitude: -2.12659411941741,
          latitude: 57.2465923827836,
          widesearch: true,
        };
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [testLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(200);
        expect(response.body.result[0].result.length).toBe(10);
        expect(response.body.result[0].query["widesearch"]).toBe(true);
        expect(response.body.result[0].query["lowerBound"]).toBeUndefined();
        expect(response.body.result[0].query["upperBound"]).toBeUndefined();
      });

      it("should return 400 if type of value associated with latitude key is invalid", async () => {
        const invalidTestLocation: any = {
          longitude: -2.12659411941741,
          latitude: null,
          widesearch: true,
        };
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [invalidTestLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(400);
        expect(response.body.error).toMatch(
          /Invalid longitude\/latitude submitted/i
        );
      });

      it("should return 400 if type of value associated with longitude key is invalid", async () => {
        const invalidTestLocation: any = {
          longitude: null,
          latitude: 53.5351312861402,
          widesearch: true,
        };
        const response = await request(app)
          .post("/postcodes")
          .send({ geolocations: [invalidTestLocation] })
          .expect("Content-Type", /json/)
          .expect(helper.allowsCORS)
          .expect(400);
        expect(response.body.error).toMatch(
          /Invalid longitude\/latitude submitted/i
        );
      });
    });

    describe("Bulk postcode lookup", () => {
      beforeEach(async () => {
        testPostcodes = await Promise.all(
          Array.from({ length: bulkLength }, () => helper.randomPostcode())
        );
      });

      it("returns results in order", async () => {
        const postcodes = [
          "YO31 6EG",
          "HG3 3EX",
          "CH65 6RW",
          "CH6Z 6RW",
          "N1 1SJ",
          "BT36 5NS",
        ];
        const response = await request(app)
          .post("/postcodes")
          .send({ postcodes })
          .expect(200);
        for (let i = 0; i < postcodes.length; i += 1) {
          expect(response.body.result[i].query).toBe(postcodes[i]);
        }
      });

      it("should return addresses for postcodes", async () => {
        const response = await request(app)
          .post("/postcodes")
          .send({ postcodes: testPostcodes })
          .expect("Content-Type", /json/)
          .expect(200);
        expect(Array.isArray(response.body.result)).toBe(true);
        expect(response.body.result.length).toBe(bulkLength);
        response.body.result.forEach((lookup: any) => {
          expect(lookup).toHaveProperty("query");
          expect(lookup).toHaveProperty("result");
          expect(typeof lookup.result.postcode).toBe("string");
        });
      });
      it("should return an empty result for non string queries", async () => {
        const response = await request(app)
          .post("/postcodes")
          .send({ postcodes: [null] })
          .expect("Content-Type", /json/)
          .expect(200);
        expect(Array.isArray(response.body.result)).toBe(true);
        expect(response.body.result.length).toBe(0);
      });
      it("should return a null if postcode not found", async () => {
        testPostcodes.push("B0GUS");
        const response = await request(app)
          .post("/postcodes")
          .send({ postcodes: testPostcodes })
          .expect("Content-Type", /json/)
          .expect(200);
        expect(response.body.result.length).toBe(bulkLength + 1);
        const hasNull = response.body.result.some(
          (l: any) => l.result === null
        );
        expect(hasNull).toBe(true);
      });

      it("returns 400 if too many postcodes submitted", async () => {
        // @ts-ignore
        const postcodes = new Array(101).fill().map(() => "foo");
        const response = await request(app)
          .post("/postcodes")
          .set({ "Content-Type": "application/json" })
          .send({ postcodes })
          .expect(400);
        expect(response.body.error).toMatch(/Too many postcodes submitted/gi);
      });
      it("returns 400 if non-array submitted", async () => {
        const response = await request(app)
          .post("/postcodes")
          .set({ "Content-Type": "application/json" })
          .send({ postcodes: "foo" })
          .expect(400);
        expect(response.body.error).toMatch(
          /You need to provide a JSON array/gi
        );
      });

      it("should refuse requests if lookups number over 100", async () => {
        testPostcodes = [];
        for (let i = 0; i < 101; i++) {
          testPostcodes.push("bogus");
        }
        await request(app)
          .post("/postcodes")
          .send(testPostcodes)
          .expect("Content-Type", /json/)
          .expect(400);
      });
    });

    it("should return a 400 error if array not submitted", async () => {
      const response = await request(app)
        .post("/postcodes")
        .send({ wrong: "dataType" })
        .expect("Content-Type", /json/)
        .expect(400);
      expect(response.body.error).toMatch(
        /ensure that Content-Type is set to application\/json/
      );
    });
  });
});
