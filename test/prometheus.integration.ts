import { describe, expect, it, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { config, postcodesioApplication } from "./helper";
import promClient from "prom-client";

describe("Prometheus /metrics endpoint", () => {
  afterEach(() => {
    promClient.register.clear();
  });

  describe("when no basic auth configuration is provided", () => {
    it("should not expose a metrics endpoint if username missing", async () => {
      const cfg = Object.assign({ prometheusPassword: "bar" }, config);
      expect(cfg.prometheusUsername).toBeUndefined();
      const app = postcodesioApplication(cfg);
      await request(app).get("/metrics").expect(404);
    });
    it("should not expose a metrics endpoint if password missing", async () => {
      const cfg = Object.assign({ prometheusUsername: "foo" }, config);
      expect(cfg.prometheusPassword).toBeUndefined();
      const app = postcodesioApplication(cfg);
      await request(app).get("/metrics").expect(404);
    });
  });

  describe("when basic auth configuration provided", () => {
    const prometheusUsername = "foo";
    const prometheusPassword = "bar";
    let app: any, getMetrics: any;

    beforeEach(() => {
      const cfg = Object.assign(
        { prometheusUsername, prometheusPassword },
        config
      );
      app = postcodesioApplication(cfg);
      getMetrics = () =>
        request(app)
          .get("/metrics")
          .expect(200)
          .auth(prometheusUsername, prometheusPassword);
    });

    it("exposes /metrics behind basic auth", async () => {
      await request(app).get("/metrics").expect(401);
    });

    const testMetric = async (url: string, expectedMetric: any) => {
      await generateMetric(url);
      const { text } = await getMetrics();
      expect(text).not.toContain(url);
      expect(text).toContain(expectedMetric);
    };

    /**
     * Generates metric for URL, swallows any error
     */
    const generateMetric = async (url: string) => {
      try {
        return await request(app).get(url);
      } catch (error) {
        // When database is not instantiated,
        // requesting data will generally return errors like 404
        return error;
      }
    };

    describe("URL normalisation", () => {
      it("normalises /postcodes/:postcode", async () => {
        const url = "/postcodes/foobar";
        const expectedMetric = "/postcodes/:postcode";
        await testMetric(url, expectedMetric);
      });

      it("normalises /postcodes/lon/:longitude/lat/:latitude", async () => {
        const url = "/postcodes/lon/12.1/lat/8";
        const expectedMetric = "/postcodes/lon/:lon/lat/:lat";
        await testMetric(url, expectedMetric);
      });

      it("normalises /postcodes/lon/:longitude/lat/:latitude", async () => {
        const url = "/postcodes/lat/12.1/lon/8.2";
        const expectedMetric = "/postcodes/lon/:lon/lat/:lat";
        await testMetric(url, expectedMetric);
      });

      it("normalises /postcodes/:postcode/validate", async () => {
        const url = "/postcodes/foobar/validate";
        const expectedMetric = "/postcodes/:postcode/validate";
        await testMetric(url, expectedMetric);
      });

      it("normalises /postcodes/:postcode/nearest", async () => {
        const url = "/postcodes/foobar/nearest";
        const expectedMetric = "/postcodes/:postcode/nearest";
        await testMetric(url, expectedMetric);
      });

      it("normalises /postcodes/:postcode/autocomplete", async () => {
        const url = "/postcodes/foobar/autocomplete";
        const expectedMetric = "/postcodes/:postcode/autocomplete";
        await testMetric(url, expectedMetric);
      });

      it("normalises /outcodes/:outcode", async () => {
        const url = "/outcodes/foo";
        const expectedMetric = "/outcodes/:outcode";
        await testMetric(url, expectedMetric);
      });

      it("normalises /outcodes/:outcode/nearest", async () => {
        const url = "/outcodes/foo/nearest";
        const expectedMetric = "/outcodes/:outcode/nearest";
        await testMetric(url, expectedMetric);
      });

      it("normalises /terminated_postcodes/:postcode", async () => {
        const url = "/terminated_postcodes/foobar";
        const expectedMetric = "/terminated_postcodes/:postcode";
        await testMetric(url, expectedMetric);
      });

      it("normalises /places/:code", async () => {
        const url = "/places/foobar";
        const expectedMetric = "/places/:code";
        await testMetric(url, expectedMetric);
      });

      it("normalises /PLACES/:code", async () => {
        const url = "/PLACES/foobar";
        const expectedMetric = "/places/:code";
        await testMetric(url, expectedMetric);
      });

      it("does not generate metrics for unexpected paths", async () => {
        const url = "/bogus";
        const expectedMetric = "other";
        await testMetric(url, expectedMetric);
      });
    });
  });
});
