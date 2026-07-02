import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  config,
  postcodesioApplication,
  allowsCORS,
  validCorsOptions,
} from "./helper/index";

const { defaults } = config;
const app = postcodesioApplication();

const DEFAULT_LIMIT = defaults.placesSearch.limit.DEFAULT;

describe("Places Routes", () => {
  describe("/places/:id", () => {
    it("returns a place by id", async () => {
      const code = "osgb4000000074558362";
      const response = await request(app)
        .get(`/places/${code}`)
        .expect(200)
        .expect(allowsCORS);
      expect(response.body.status).toBe(200);
      const place = response.body.result;
      expect(place.code).toBe(code);
    });
    it("is case insensitive", async () => {
      const code = "osgb4000000074558362";
      const response = await request(app)
        .get(`/places/${code.toUpperCase()}`)
        .expect(200)
        .expect(allowsCORS);
      expect(response.body.status).toBe(200);
      const place = response.body.result;
      expect(place.code).toBe(code);
    });
    it("returns 404 if place not a valid resource", async () => {
      const code = "foo";
      const response = await request(app)
        .get(`/places/${code}`)
        .expect(404)
        .expect(allowsCORS);
      expect(response.body.status).toBe(404);
      expect(response.body.result).toBeUndefined();
      expect(response.body.error).toMatch(/place\snot\sfound/i);
    });
    it("responds to options", async () => {
      const code = "osgb4000000074558362";
      const response = await request(app)
        .options(`/places/${code}`)
        .expect(204)
        .expect(allowsCORS);
      validCorsOptions(response);
    });
  });

  describe("/places?q= (search)", () => {
    it("returns places by search term", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ query })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length > 0).toBe(true);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
    it("accepts q as parameter", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ q: query })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length > 0).toBe(true);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
    it("returns empty array if empty query", async () => {
      const response = await request(app)
        .get("/places")
        .query({ query: " " })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      expect(response.body.result.length).toBe(0);
    });
    it("returns empty array no matching places", async () => {
      const query = "foobarbaz";
      const response = await request(app)
        .get("/places")
        .query({ query })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      expect(response.body.result.length).toBe(0);
    });
    it("responds to options", async () => {
      const response = await request(app)
        .options("/places")
        .expect(204)
        .expect(allowsCORS);
      validCorsOptions(response);
    });
    it("accepts a limit paramater", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ query, limit: 1 })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length).toBe(1);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
    it("uses default limit if invalid", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ query, limit: "foo" })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length).toBe(DEFAULT_LIMIT);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
    it("accepts l as limit parameter", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ query, l: 1 })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length).toBe(1);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
    it("returns 400 if invalid limit", async () => {
      const response = await request(app)
        .get("/places")
        .expect(400)
        .expect(allowsCORS);
      expect(response.body.status).toBe(400);
    });
    it("sets limit to default if requested limit < 1", async () => {
      const query = "b";
      const response = await request(app)
        .get("/places")
        .query({ query, l: 0 })
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      const places = response.body.result;
      expect(places.length).toBe(DEFAULT_LIMIT);
      places.forEach((p: any) => expect(typeof p.code).toBe("string"));
    });
  });

  describe("/random/places", () => {
    it("returns a random place", async () => {
      const response = await request(app)
        .get("/random/places")
        .expect(200)
        .expect(allowsCORS);
      expect(response.status).toBe(200);
      expect(typeof response.body.result.code).toBe("string");
    });
  });
});
