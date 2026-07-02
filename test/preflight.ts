"use strict";

import request from "supertest";
import { describe, expect, it } from "vitest";
import { postcodesioApplication } from "./helper";
const app = postcodesioApplication();

describe("Preflight Requests (OPTIONS)", () => {
  it("should allows preflight requests", async () => {
    const response = await request(app).options("/").expect(204);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,POST,OPTIONS"
    );
  });
});
