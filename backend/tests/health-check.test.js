import assert from "node:assert/strict";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import app from "../src/app.js";

describe("Production Health Check Endpoints", () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("GET /health returns HTTP 200 with healthy JSON response", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, {
      success: true,
      message: "Cinevo API is running",
    });
  });

  it("GET /api/health returns HTTP 200 with healthy JSON response", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, {
      success: true,
      message: "Cinevo API is running",
    });
  });
});
