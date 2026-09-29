import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import worker from "./cloudflare-worker.js";
import {
  ATE_ENTERPRISE_LOGO,
  injectRootOverride,
  injectAppOverride,
  maybeInjectUi,
  shouldInjectRoot,
  shouldInjectApp,
} from "./gateway-ui-overrides.js";

const ZONE = "https://akmaltaufikenterprise.my";

function startOrigin(handler) {
  const seen = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      seen.push({ method: req.method, url: req.url });
      try {
        await handler(req, res, seen);
      } catch {
        try {
          res.writeHead(500);
          res.end("stub failure");
        } catch {}
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, seen, port: server.address().port }),
    );
  });
}

const stopOrigin = (o) => new Promise((r) => o.server.close(r));
const envFor = (o) => ({ GATEWAY_ORIGIN: `http://127.0.0.1:${o.port}` });

const ROOT_SAMPLE = `<html><head><style>.ate-theme{color:red}</style></head><body class="ate-theme">` +
  `<div class="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-md">ATE</div>` +
  `<span>Akmal Taufik Enterprise ATEGateway</span></body></html>`;

const APP_SAMPLE = `<html><head></head><body>` +
  `<link rel="icon" href="https://apikey.fun/logo.png">` +
  `<div class="sidebar-header"><div class="sidebar-logo">A</div><div>ATEGateway</div></div>` +
  `</body></html>`;

test("root markers trigger injection, stub HTML does not", () => {
  assert.equal(maybeInjectUi("/gateway/", "<html>site</html>"), null);
  assert.equal(shouldInjectRoot("<html>site</html>"), false);
  assert.equal(shouldInjectRoot(ROOT_SAMPLE), true);
  assert.equal(shouldInjectApp("<html>site</html>"), false);
  assert.equal(shouldInjectApp(APP_SAMPLE), true);
});

test("root override: white bg, black instead of red, enterprise logo, jQuery transitions", () => {
  const out = injectRootOverride(ROOT_SAMPLE);
  assert.ok(out.includes('id="ate-root-override"'), "missing root style");
  assert.ok(out.includes("background:#ffffff"), "background must be white");
  assert.ok(out.includes("#111827"), "red must become black");
  assert.ok(out.includes(ATE_ENTERPRISE_LOGO), "enterprise logo missing");
  assert.ok(!out.includes(">ATE</div>"), "ATE box logo must be replaced");
  assert.ok(out.includes("code.jquery.com/jquery-3.7.1.min.js"), "jQuery missing");
  assert.ok(out.includes('id="ate-root-transitions"'), "transition script missing");
  assert.ok(out.includes("switchView"), "view transition wrapper missing");
  assert.ok(out.includes("fadeTo") || out.includes("fadeIn"), "fade transition missing");
  assert.ok(
    out.includes("prefers-reduced-motion"),
    "must respect reduced motion",
  );
});

test("app override: raining binaries bg, enterprise logo, transitions", () => {
  const out = injectAppOverride(APP_SAMPLE);
  assert.ok(out.includes('id="ate-app-override"'), "missing app style");
  assert.ok(out.includes('id="ate-rain-bg"'), "rain background layer missing");
  assert.ok(out.includes("/assets/rain.mp4"), "must reuse main-site rain video");
  assert.ok(out.includes('id="ate-binary-rain"'), "binary rain canvas missing");
  assert.ok(out.includes(ATE_ENTERPRISE_LOGO), "enterprise logo missing");
  assert.ok(!out.includes('<div class="sidebar-logo">A</div>'), "A logo must be replaced");
  assert.ok(!out.includes("https://apikey.fun/logo.png"), "old favicon must be replaced");
  assert.ok(out.includes("code.jquery.com/jquery-3.7.1.min.js"), "jQuery missing");
  assert.ok(out.includes('id="ate-app-transitions"'), "transition script missing");
  assert.ok(out.includes("ate-binary-rain"), "binary rain JS missing");
  assert.ok(out.includes("sidebar-link"), "sidebar transition missing");
});

test("worker: GET /gateway/ with real markers gets transformed, prefix preserved", async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(ROOT_SAMPLE);
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/?x=1`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].url, "/gateway/?x=1");
    const body = await r.text();
    assert.ok(body.includes('id="ate-root-override"'));
    assert.ok(body.includes(ATE_ENTERPRISE_LOGO));
    assert.ok(body.includes("jquery-3.7.1.min.js"));
  } finally {
    await stopOrigin(o);
  }
});

test("worker: GET /gateway/app gets rain bg + logo, prefix preserved", async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(APP_SAMPLE);
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].url, "/gateway/app");
    const body = await r.text();
    assert.ok(body.includes('id="ate-rain-bg"'));
    assert.ok(body.includes("/assets/rain.mp4"));
    assert.ok(body.includes(ATE_ENTERPRISE_LOGO));
  } finally {
    await stopOrigin(o);
  }
});

test("worker: API JSON and JS assets pass through untouched (no injection)", async () => {
  const o = await startOrigin((req, res) => {
    if (req.url.startsWith("/v1/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"object":"list"}');
    } else {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end("console.log(1)");
    }
  });
  try {
    const r1 = await worker.fetch(new Request(`${ZONE}/gateway/v1/models`), envFor(o));
    assert.equal(await r1.text(), '{"object":"list"}');
    const r2 = await worker.fetch(
      new Request(`${ZONE}/gateway/app/assets/main.js`),
      envFor(o),
    );
    assert.equal(await r2.text(), "console.log(1)");
  } finally {
    await stopOrigin(o);
  }
});
