// Contract tests for api/app/queries/terminated_postcodes.ts.

import { describe, expect, it } from "vitest";
import { find, toJson } from "../api/app/queries/terminated_postcodes";

const KNOWN_TERMINATED = "AB10 1AA";
const KNOWN_LIVE = "AB10 1AB";

describe("queries/terminated_postcodes (contract)", () => {
  describe("find()", () => {
    it("returns the row for a known terminated postcode", async () => {
      expect(await find(KNOWN_TERMINATED)).toEqual({
        eastings: 394251,
        northings: 806376,
        latitude: 57.148216,
        longitude: -2.096655,
        month_terminated: 10,
        postcode: "AB10 1AA",
        year_terminated: 2016,
      });
    });
    it("returns null for a live postcode", async () => {
      expect(await find(KNOWN_LIVE)).toBeNull();
    });
    it("normalises whitespace and case", async () => {
      expect(await find("  ab10 1aa  ")).toEqual({
        eastings: 394251,
        northings: 806376,
        latitude: 57.148216,
        longitude: -2.096655,
        month_terminated: 10,
        postcode: "AB10 1AA",
        year_terminated: 2016,
      });
    });
    it("returns null for an invalid postcode", async () => {
      expect(await find("NOT A POSTCODE")).toBeNull();
    });
    it("returns null for nullish input", async () => {
      expect(await find(null)).toBeNull();
      expect(await find(undefined)).toBeNull();
      expect(await find("")).toBeNull();
    });
  });
  describe("toJson()", () => {
    it("shapes a known terminated row into the public JSON response", async () => {
      const row = await find(KNOWN_TERMINATED);
      expect(row && toJson(row)).toEqual({
        eastings: 394251,
        northings: 806376,
        latitude: 57.148216,
        longitude: -2.096655,
        month_terminated: 10,
        postcode: "AB10 1AA",
        year_terminated: 2016,
      });
    });
  });
});
