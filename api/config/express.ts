import { Config } from "./config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

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

  app.use(
    helmet({
      // Responses must remain embeddable cross-origin: this is a public API
      // and JSONP (?callback=) is loaded via <script src>, a no-cors request
      // which helmet's default same-origin CORP would block.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // The API serves no HTML documents that could be framed.
      frameguard: { action: "deny" },
    })
  );

  const { httpHeaders } = config;
  if (httpHeaders) {
    app.use((_, response, next) => {
      response.header(httpHeaders);
      next();
    });
  }

  // Defaults to a wildcard origin: this is a deliberately public, unauthenticated
  // API with no cookies or credentialed requests, so any origin may call it.
  // Set CORS_ALLOWED_ORIGINS (comma-separated) to restrict to known consumers.
  app.use(
    cors({
      origin: config.corsAllowedOrigins ?? "*",
      methods: "GET,POST,OPTIONS",
      allowedHeaders: "X-Requested-With, Content-Type, Accept, Origin",
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};
