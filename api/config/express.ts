import { Config } from "./config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

export const expressConfig = (app: express.Express, config: Config) => {
  app.enable("trust proxy");
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
