import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { configFactory } from "./helper";

describe("Config", () => {
  describe("Environment variables", () => {
    const ENV = process.env;

    beforeEach(() => {
      process.env = {};
    });

    afterAll(() => {
      process.env = ENV;
    });

    describe("HTTP_HEADERS", () => {
      it("is undefined by default", () => {
        expect(configFactory().httpHeaders).toBeUndefined();
      });

      it("assigns httpHeaders", () => {
        const headers = {
          foo: "bar",
          baz: "quux",
        };
        process.env["HTTP_HEADERS"] = JSON.stringify(headers);
        expect(configFactory().httpHeaders).toEqual(headers);
      });

      it("throws if invalid httpHeader string", () => {
        process.env["HTTP_HEADERS"] = "foo";
        expect(configFactory).toThrow();
      });
    });

    describe("CORS_ALLOWED_ORIGINS", () => {
      it("is undefined by default", () => {
        expect(configFactory().corsAllowedOrigins).toBeUndefined();
      });

      it("assigns corsAllowedOrigins from a comma-separated list", () => {
        process.env["CORS_ALLOWED_ORIGINS"] =
          "https://foo.example.com, https://bar.example.com";
        expect(configFactory().corsAllowedOrigins).toEqual([
          "https://foo.example.com",
          "https://bar.example.com",
        ]);
      });

      it("ignores empty entries", () => {
        process.env["CORS_ALLOWED_ORIGINS"] = "https://foo.example.com,,";
        expect(configFactory().corsAllowedOrigins).toEqual([
          "https://foo.example.com",
        ]);
      });
    });
  });
});
