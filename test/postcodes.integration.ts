import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import * as helper from "./helper";
const app = helper.postcodesioApplication();

describe("Postcodes routes", () => {
  let testPostcode: string;

  beforeEach(async () => {
    const result = await helper.lookupRandomPostcode();
    if (result == null) throw new Error("Result is null");
    testPostcode = result.postcode;
  });

  describe("GET /postcodes", () => {
    let uri: string, limit: string;

    it("should return a list of matching postcode objects", async () => {
      uri = encodeURI(
        "/postcodes?q=" + testPostcode.replace(" ", "").slice(0, 2)
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should be insensitive to case", async () => {
      uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).toLowerCase());
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should be insensitive to space", async () => {
      uri = encodeURI(
        "/postcodes?q=" + testPostcode.slice(0, 2).split("").join(" ")
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should be sensitive to limit", async () => {
      limit = "11";
      uri = encodeURI(
        "/postcodes?q=" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "&limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(11);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should max out limit at 100", async () => {
      limit = "101";
      uri = encodeURI(
        "/postcodes?q=" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "&limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(100);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should set limit to 10 if invalid", async () => {
      limit = "BOGUS";
      uri = encodeURI(
        "/postcodes?q=" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "&limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode.postcode).toBe("string");
      });
    });
    it("should return 400 if no postcode submitted", async () => {
      uri = encodeURI("/postcodes?q=");
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(400);
      expect(response.body.status).toBe(400);
    });
    it("should respond to options", async () => {
      const response = await request(app)
        .options("/postcodes")
        .expect(204);
      helper.validCorsOptions(response);
    });
  });

  describe("GET /postcodes/:postcode", () => {
    it("should return 200 if postcode found", async () => {
      const path = ["/postcodes/", encodeURI(testPostcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result.postcode).toBe(testPostcode);
    });
    it("should return 404 if not found", async () => {
      testPostcode = "ID11QE";
      const path = ["/postcodes/", encodeURI(testPostcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.error).toMatch(/postcode not found/i);
    });
    it("returns invalid postcode if postcode doesn't match format", async () => {
      testPostcode = "FOO";
      const path = ["/postcodes/", encodeURI(testPostcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.error).toMatch(/invalid postcode/i);
    });
    it("returns terminated postcode data if postcode is terminated", async () => {
      // AB1 0AA is a terminated postcode in the seed data
      const terminatedPostcode = "AB1 0AA";
      const path = ["/postcodes/", encodeURI(terminatedPostcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.error).toMatch(/postcode not found/i);
      // Should include terminated postcode data
      expect(response.body).toHaveProperty("terminated");
      expect(typeof response.body.terminated).toBe("object");
      // Verify terminated object structure
      expect(response.body.terminated).toHaveProperty("postcode");
      expect(response.body.terminated).toHaveProperty("year_terminated");
      expect(response.body.terminated).toHaveProperty("month_terminated");
      expect(response.body.terminated).toHaveProperty("longitude");
      expect(response.body.terminated).toHaveProperty("latitude");
      // Verify the postcode matches
      expect(
        response.body.terminated.postcode.replace(/\s/g, "")
      ).toBe(terminatedPostcode.replace(/\s/g, ""));
    });
    it("does not include terminated field if postcode is not found and not terminated", async () => {
      // ID1 1QE is a valid format but doesn't exist in either table
      testPostcode = "ID11QE";
      const path = ["/postcodes/", encodeURI(testPostcode)].join("");
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404);
      expect(response.body.status).toBe(404);
      expect(response.body.error).toMatch(/postcode not found/i);
      // Should NOT include terminated field
      expect(response.body).not.toHaveProperty("terminated");
    });
    it("should respond to options", async () => {
      const path = ["/postcodes/", encodeURI(testPostcode)].join("");
      const response = await request(app)
        .options(path)
        .expect(204);
      helper.validCorsOptions(response);
    });
  });

  describe("GET /postcodes/:postcode/validate", () => {
    it("should return true if postcode found", async () => {
      const path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join(
        ""
      );
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result).toBe(true);
    });
    it("should return false if postcode not found", async () => {
      testPostcode = "ID11QE";
      const path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join(
        ""
      );
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.status).toBe(200);
      expect(response.body.result).toBe(false);
    });
    it("should respond to options", async () => {
      const path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join(
        ""
      );
      const response = await request(app)
        .options(path)
        .expect(204);
      helper.validCorsOptions(response);
    });
  });

  describe("GET /random/postcode", () => {
    it("should return a random postcode", async () => {
      const path = "/random/postcodes";
      const response = await request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200);
      expect(typeof response.body.result.postcode).toBe("string");
    });
    it("should respond to options", async () => {
      const path = "/random/postcodes";
      const response = await request(app)
        .options(path)
        .expect(204);
      helper.validCorsOptions(response);
    });
    describe("filtered by outcode", () => {
      it("returns a random postcode within an outcode", async () => {
        const path = "/random/postcodes";
        const outcode = "AB10";
        const response = await request(app)
          .get(path)
          .query({ outcode: outcode })
          .expect("Content-Type", /json/)
          .expect(200);
        expect(typeof response.body.result.postcode).toBe("string");
        expect(response.body.result.outcode).toBe(outcode);
      });
      it("returns a null for invalid outcode", async () => {
        const path = "/random/postcodes";
        const outcode = "BOGUS";
        const response = await request(app)
          .get(path)
          .query({ outcode: outcode })
          .expect("Content-Type", /json/)
          .expect(200);
        expect(response.body.result).toBeNull();
      });
    });
  });

  describe("GET /postcodes/:postcode/autocomplete", () => {
    let uri: string, limit: string;
    const testPostcode = "AB101AL";

    it("should return a list of matching postcodes only", async () => {
      uri = encodeURI(
        "/postcodes/" + testPostcode.slice(0, 2) + "/autocomplete"
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should be insensitive to case", async () => {
      uri = encodeURI(
        "/postcodes/" + testPostcode.slice(0, 2).toLowerCase() + "/autocomplete"
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should be insensitive to space", async () => {
      uri = encodeURI(
        "/postcodes/" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "/autocomplete"
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should be sensitive to limit", async () => {
      limit = "11";
      uri = encodeURI(
        "/postcodes/" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "/autocomplete" +
          "?limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(Number(limit));
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should max limit out at 100", async () => {
      limit = "101";
      uri = encodeURI(
        "/postcodes/" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "/autocomplete" +
          "?limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(100);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should set limit to 10 if invalid", async () => {
      limit = "BOGUS";
      uri = encodeURI(
        "/postcodes/" +
          testPostcode.slice(0, 2).split("").join(" ") +
          "/autocomplete" +
          "?limit=" +
          limit
      );
      const response = await request(app)
        .get(uri)
        .expect("Content-Type", /json/)
        .expect(helper.allowsCORS)
        .expect(200);
      expect(Array.isArray(response.body.result)).toBe(true);
      expect(response.body.result.length).toBe(10);
      response.body.result.forEach((postcode: any) => {
        expect(typeof postcode).toBe("string");
      });
    });
    it("should respond to options", async () => {
      uri = encodeURI(
        "/postcodes/" + testPostcode.slice(0, 2) + "/autocomplete"
      );
      const response = await request(app)
        .options(uri)
        .expect(204);
      helper.validCorsOptions(response);
    });
  });
});
