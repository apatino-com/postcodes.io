import { describe, expect, it } from "vitest";
import request from "supertest";
import * as helper from "./helper";

const app = helper.postcodesioApplication();

describe("Security headers", () => {
  it("sets helmet security headers on responses", async () => {
    const response = await request(app).get("/ping").expect(200);
    const { headers } = response;
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  it("keeps responses embeddable cross-origin for JSONP consumers", async () => {
    const response = await request(app).get("/ping").expect(200);
    expect(response.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin"
    );
  });

  it("allows HTTP_HEADERS config to override helmet defaults", async () => {
    const configWithHeaders = {
      ...helper.config,
      httpHeaders: { "X-Frame-Options": "SAMEORIGIN" },
    };
    const response = await request(
      helper.postcodesioApplication(configWithHeaders)
    )
      .get("/ping")
      .expect(200);
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});

describe("CORS configuration", () => {
  it("defaults to a wildcard origin (deliberately public API)", async () => {
    const response = await request(app)
      .get("/ping")
      .set("Origin", "https://anywhere.example.com")
      .expect(200);
    helper.allowsCORS(response);
  });

  describe("with CORS_ALLOWED_ORIGINS allowlist", () => {
    const allowedOrigin = "https://consumer.example.com";
    const restrictedApp = helper.postcodesioApplication({
      ...helper.config,
      corsAllowedOrigins: [allowedOrigin],
    });

    it("reflects an allowlisted origin", async () => {
      const response = await request(restrictedApp)
        .get("/ping")
        .set("Origin", allowedOrigin)
        .expect(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        allowedOrigin
      );
    });

    it("does not allow other origins", async () => {
      const response = await request(restrictedApp)
        .get("/ping")
        .set("Origin", "https://evil.example.com")
        .expect(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });
});
