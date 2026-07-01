import { describe, expect, it } from "vitest";
import * as helper from "./helper/index";
const { startTimer } = helper.timeout;

describe("startTimer", () => {
  it("returns a timeout object", () => {
    const timer = startTimer(100);
    expect(timer.timedOut).toBe(false);
    expect(timer.id).toBeDefined();
  });
  it("times out after an interval", async () => {
    const timer = startTimer(100);
    expect(timer.timedOut).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(timer.timedOut).toBe(true);
  });
  it("it does not if interval set to 0", () => {
    const timer = startTimer(0);
    expect(timer.timedOut).toBe(false);
    expect(timer.id).toBeUndefined();
  });
});
