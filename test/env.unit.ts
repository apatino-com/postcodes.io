import { describe, expect, it } from "vitest";
import { parseEnv } from "../api/app/lib/env";

describe("parseEnv", () => {
  it("returns default if variable is undefined", () => {
    const defaultValue = "foo";
    expect(parseEnv(undefined, defaultValue)).toBe(defaultValue);
  });

  it("returns true if variable is `true`", () => {
    expect(parseEnv("true")).toBe(true);
  });

  it("returns false if variable is `false`", () => {
    expect(parseEnv("false")).toBe(false);
  });

  it("returns number if varaible is `number`", () => {
    expect(parseEnv("8")).toBe(8);
  });
  it("returns string if variable is `string`", () => {
    expect(parseEnv("FOO")).toBe("FOO");
  });

  it("returns null if variable is 'null'", () => {
    expect(parseEnv("null")).toBe(null);
  });

  it("returns empty string if variable is ''", () => {
    expect(parseEnv("")).toBe("");
  });
});
