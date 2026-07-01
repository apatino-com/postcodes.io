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
  });
});
