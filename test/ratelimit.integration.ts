import request from "supertest";
import { describe, expect, it } from "vitest";
import { configFactory, postcodesioApplication } from "./helper";

const rateLimitedApp = (rateLimit: any) => {
  const config = configFactory();
  return postcodesioApplication({
    ...config,
    defaults: { ...config.defaults, rateLimit },
  });
};

describe("Rate limiting", () => {
  it("returns rate limit headers on API routes", async () => {
    const app = rateLimitedApp({
      enabled: true,
      windowMs: 60000,
      max: 5,
      bulk: { windowMs: 60000, max: 2 },
    });
    const response = await request(app).get("/postcodes").expect(400);
    expect(response.headers["ratelimit-limit"]).toBe("5");
    expect(response.headers["ratelimit-remaining"]).toBe("4");
    expect(response.headers["x-ratelimit-limit"]).toBe("5");
  });

  it("responds with 429 once the limit is exceeded", async () => {
    const app = rateLimitedApp({
      enabled: true,
      windowMs: 60000,
      max: 2,
      bulk: { windowMs: 60000, max: 2 },
    });
    await request(app).get("/postcodes").expect(400);
    await request(app).get("/postcodes").expect(400);
    const response = await request(app)
      .get("/postcodes")
      .expect("Content-Type", /json/)
      .expect(429);
    expect(response.body.status).toBe(429);
    expect(response.body.error).toMatch(/too many requests/i);
  });

  it("applies the stricter bulk limit to bulk endpoints", async () => {
    const app = rateLimitedApp({
      enabled: true,
      windowMs: 60000,
      max: 100,
      bulk: { windowMs: 60000, max: 1 },
    });
    await request(app).post("/postcodes").send({}).expect(400);
    const response = await request(app).post("/postcodes").send({}).expect(429);
    expect(response.body.status).toBe(429);
    // General API routes remain within their own, separate allowance
    await request(app).get("/postcodes").expect(400);
  });

  it("does not rate limit health check endpoints", async () => {
    const app = rateLimitedApp({
      enabled: true,
      windowMs: 60000,
      max: 1,
      bulk: { windowMs: 60000, max: 1 },
    });
    for (let i = 0; i < 3; i += 1) {
      const response = await request(app).get("/ping").expect(200);
      expect(response.headers["ratelimit-limit"]).toBeUndefined();
    }
  });

  it("can be disabled via configuration", async () => {
    const app = rateLimitedApp({
      enabled: false,
      windowMs: 60000,
      max: 1,
      bulk: { windowMs: 60000, max: 1 },
    });
    for (let i = 0; i < 3; i += 1) {
      const response = await request(app).get("/postcodes").expect(400);
      expect(response.headers["ratelimit-limit"]).toBeUndefined();
    }
  });
});
