import { describe, expect, it } from "vitest";
import { unaccent } from "../api/app/lib/unaccent";
import * as fs from "node:fs";
import * as path from "node:path";

const testDataPath = path.resolve(__dirname, "./seed/accent_tests.json");
const testData = JSON.parse(fs.readFileSync(testDataPath, "utf8"));

describe("unaccent", () => {
  it("removes diacritics the same way as postgres", () => {
    // making sure all lines are read
    Object.keys(testData).forEach((accentedString) => {
      const expectedUnaccentedString = testData[accentedString];
      expect(unaccent(accentedString)).toBe(expectedUnaccentedString);
    });
  });

  it("removes repeated accents", () => {
    expect(unaccent("ÀÀ")).toBe("AA");
  });
});
