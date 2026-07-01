// Contract tests for api/app/queries/places.ts.
// Note: termsSearch() relies on Postgres tsvector + ts_rank_cd. On DuckDB this
// path needs to be reimplemented via the FTS extension (or LIKE) — this test
// is the parity gate for that work.

import { describe, expect, it } from "vitest";
import { findByCode, random, search, toJson } from "../api/app/queries/places";

const KNOWN_CODE = "osgb4000000074335381"; // "Rapness" in the seed

describe("queries/places (contract)", () => {
  describe("findByCode()", () => {
    it("returns the place for a known code", async () => {
      expect(await findByCode(KNOWN_CODE)).toEqual({
        code: "osgb4000000074335381",
        country: "Scotland",
        county_unitary: "Orkney Islands",
        county_unitary_type: "UnitaryAuthority",
        district_borough: null,
        district_borough_type: null,
        eastings: 350579,
        latitude: 59.24447732296904,
        local_type: "Village",
        longitude: -2.86809907870848,
        max_eastings: 351500,
        max_northings: 1042451,
        min_eastings: 349191,
        min_northings: 1039006,
        name_1: "Rapness",
        name_1_lang: null,
        name_2: null,
        name_2_lang: null,
        northings: 1040090,
        outcode: "KW17",
        region: "Scotland",
      });
    });
    it("lowercases the input code", async () => {
      expect(await findByCode(KNOWN_CODE.toUpperCase())).toEqual({
        code: "osgb4000000074335381",
        country: "Scotland",
        county_unitary: "Orkney Islands",
        county_unitary_type: "UnitaryAuthority",
        district_borough: null,
        district_borough_type: null,
        eastings: 350579,
        latitude: 59.24447732296904,
        local_type: "Village",
        longitude: -2.86809907870848,
        max_eastings: 351500,
        max_northings: 1042451,
        min_eastings: 349191,
        min_northings: 1039006,
        name_1: "Rapness",
        name_1_lang: null,
        name_2: null,
        name_2_lang: null,
        northings: 1040090,
        outcode: "KW17",
        region: "Scotland",
      });
    });
    it("returns null for an unknown code", async () => {
      expect(await findByCode("does-not-exist")).toBeNull();
    });
    it("returns null for non-string input", async () => {
      //@ts-expect-error — exercising defensive guard
      expect(await findByCode(123)).toBeNull();
    });
  });

  describe("search()", () => {
    it("returns ranked matches for a known full term (termsSearch path)", async () => {
      expect(await search({ name: "rapness" })).toEqual([
        {
          code: "osgb4000000074335381",
          country: "Scotland",
          county_unitary: "Orkney Islands",
          county_unitary_type: "UnitaryAuthority",
          district_borough: null,
          district_borough_type: null,
          eastings: 350579,
          latitude: 59.24447732296904,
          local_type: "Village",
          longitude: -2.86809907870848,
          max_eastings: 351500,
          max_northings: 1042451,
          min_eastings: 349191,
          min_northings: 1039006,
          name_1: "Rapness",
          name_1_lang: null,
          name_2: null,
          name_2_lang: null,
          northings: 1040090,
          outcode: "KW17",
          region: "Scotland",
        },
      ]);
    });
    it("returns prefix matches for a partial term (prefixSearch path)", async () => {
      expect(await search({ name: "rap" })).toEqual([
        {
          code: "osgb4000000074335381",
          country: "Scotland",
          county_unitary: "Orkney Islands",
          county_unitary_type: "UnitaryAuthority",
          district_borough: null,
          district_borough_type: null,
          eastings: 350579,
          latitude: 59.24447732296904,
          local_type: "Village",
          longitude: -2.86809907870848,
          max_eastings: 351500,
          max_northings: 1042451,
          min_eastings: 349191,
          min_northings: 1039006,
          name_1: "Rapness",
          name_1_lang: null,
          name_2: null,
          name_2_lang: null,
          northings: 1040090,
          outcode: "KW17",
          region: "Scotland",
        },
      ]);
    });
    it("returns null for empty input", async () => {
      expect(await search({ name: "" })).toBeNull();
    });
    it("returns null for a term with no matches", async () => {
      expect(await search({ name: "zzznopezzz" })).toBeNull();
    });
    it("strips quotes and hyphens before searching", async () => {
      expect(await search({ name: "rap-ness" })).toBeNull();
    });
    it("honours the limit parameter", async () => {
      const rows = await search({ name: "m", limit: 2 });
      expect(rows?.length ?? null).toBe(2);
    });
  });

  describe("random()", () => {
    it("returns a place-shaped row", async () => {
      const originalRandom = Math.random;
      Math.random = () => 0.5;
      try {
        const row = await random();
        expect({
          isObject: row !== null && typeof row === "object",
          hasCode: typeof row?.code === "string",
          hasName1: typeof row?.name_1 === "string",
        }).toEqual({
          hasCode: true,
          hasName1: true,
          isObject: true,
        });
      } finally {
        Math.random = originalRandom;
      }
    });
  });

  describe("toJson()", () => {
    it("shapes a known place row into the public JSON response", async () => {
      const row = await findByCode(KNOWN_CODE);
      expect(row && toJson(row)).toEqual({
        code: "osgb4000000074335381",
        country: "Scotland",
        county_unitary: "Orkney Islands",
        county_unitary_type: "UnitaryAuthority",
        district_borough: null,
        district_borough_type: null,
        eastings: 350579,
        latitude: 59.24447732296904,
        local_type: "Village",
        longitude: -2.86809907870848,
        max_eastings: 351500,
        max_northings: 1042451,
        min_eastings: 349191,
        min_northings: 1039006,
        name_1: "Rapness",
        name_1_lang: null,
        name_2: null,
        name_2_lang: null,
        northings: 1040090,
        outcode: "KW17",
        region: "Scotland",
      });
    });
  });
});
