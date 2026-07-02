import { describe, expect, it } from "vitest";
import { errors } from "./helper/index";
const { PostcodesioHttpError, InvalidJsonError, NotFoundError } = errors;

describe("Errors", () => {
  describe("PostcodesioHttpError", () => {
    it("instantiates with default attributes", () => {
      const e = new PostcodesioHttpError();
      expect(e.name).toBe("PostcodesioHttpError");
      expect(e.status).toBe(500);
      expect(e.humanMessage).toContain("500 Server Error");
      expect(e.message).toContain("500 Server Error");
    });

    it("instantiates with correct attributes", () => {
      const code = 401;
      const msg = "Foo";
      const e = new PostcodesioHttpError(code, msg);
      expect(e.status).toBe(code);
      expect(e.humanMessage).toBe(msg);
    });

    it("has toJSON method", () => {
      const e = new PostcodesioHttpError();
      const result = e.toJSON();
      expect(result.status).toBe(e.status);
      expect(result.error).toBe(e.humanMessage);
    });
  });

  describe("InvalidJsonError", () => {
    it("instantiates with correct attributes", () => {
      const e = new InvalidJsonError();
      expect(e.status).toBe(400);
      expect(e.humanMessage).toContain("Invalid JSON submitted");
    });
  });

  describe("NotFoundError", () => {
    it("instantiates with correct attributes", () => {
      const e = new NotFoundError();
      expect(e.status).toBe(404);
      expect(e.humanMessage).toContain("Resource not found");
    });
  });
});
