import { expect } from "vitest";

export const allowsCORS = (response: any): void => {
  expect(response.headers["access-control-allow-origin"]).toBe("*");
};

export const validCorsOptions = (response: any): void => {
  allowsCORS(response);
  expect(response.headers["access-control-allow-methods"]).toBe(
    "GET,POST,OPTIONS"
  );
  expect(response.headers["access-control-allow-headers"]).toBe(
    "X-Requested-With, Content-Type, Accept, Origin"
  );
};

// Rough regex to extract json object
export const jsonpResponseBody = (text: string): JSON => {
  const result = text.match(/\(.*\)/)!;
  return JSON.parse(result[0].slice(1, result[0].length - 1));
};
