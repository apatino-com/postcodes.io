import { describe, expect, it } from "vitest";
import * as helper from "./helper/index";
const { isEmpty } = helper.string;

describe("isEmpty", () => {
  it("returns true if null", () => {
    //@ts-expect-error
    expect(isEmpty(null)).toBe(true);
  });
  it("returns true if undefined", () => {
    //@ts-expect-error
    expect(isEmpty(undefined)).toBe(true);
  });
  it("returns true if spaces", () => {
    expect(isEmpty("   ")).toBe(true);
  });
  it("returns true if empty string", () => {
    expect(isEmpty("")).toBe(true);
  });
  it("returns true if space", () => {
    expect(isEmpty(" ")).toBe(true);
  });
  it("returns false if not empty string", () => {
    expect(isEmpty("foo")).toBe(false);
  });
});
