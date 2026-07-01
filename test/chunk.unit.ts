import { describe, expect, it } from "vitest";
import { chunk } from "../api/app/lib/chunk";

describe("chunk", () => {
  it("chunks arrays", () => {
    expect(chunk([1, 1, 1, 2, 2, 2, 3, 3, 3], 3)).toEqual([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
    ]);
    expect(chunk([1, 1, 1, 2, 2, 2, 3, 3], 3)).toEqual([
      [1, 1, 1],
      [2, 2, 2],
      [3, 3],
    ]);
    expect(chunk([1, 1], 3)).toEqual([[1, 1]]);
  });
});
