import { Config } from "./config";
import express from "express";
import cors from "cors";

export const expressConfig = (app: express.Express, config: Config) => {
  // Default trusts all proxies (upstream behaviour). Behind a known chain,
  // set TRUST_PROXY to the hop count (e.g. 1 for a single gateway) so
  // req.ip — which keys rate limiting — cannot be spoofed via X-Forwarded-For
  const { TRUST_PROXY } = process.env;
  if (TRUST_PROXY === undefined) {
    app.enable("trust proxy");
  } else if (/^\d+$/.test(TRUST_PROXY)) {
    app.set("trust proxy", parseInt(TRUST_PROXY, 10));
  } else if (TRUST_PROXY.toLowerCase() === "false") {
    app.disable("trust proxy");
  } else {
    // Named preset (e.g. "loopback") or comma-separated IP/CIDR list
    app.set("trust proxy", TRUST_PROXY);
  }
  app.disable("x-powered-by");

  const { httpHeaders } = config;
  if (httpHeaders) {
    app.use((_, response, next) => {
      response.header(httpHeaders);
      next();
    });
  }

  app.use(
    cors({
      origin: "*",
      methods: "GET,POST,OPTIONS",
      allowedHeaders: "X-Requested-With, Content-Type, Accept, Origin",
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};
