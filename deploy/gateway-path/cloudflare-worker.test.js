import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import worker from './cloudflare-worker.js';

// Tests for the Cloudflare Worker fronting https://akmaltaufikenterprise.my/gateway*.
// A local stub stands in for GATEWAY_ORIGIN; no external network is touched
// except the explicit non-gateway passthrough test, which stubs global fetch.
const ZONE = 'https://akmaltaufikenterprise.my';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Starts a stub origin. handler(req, { seen }) may respond directly and
// should record what it received into seen (method/url/headers/body).
function startOrigin(handler) {
  const seen = [];
  const server = http.createServer(async (req, res) => {
    const body = await readBody(req).catch(() => Buffer.alloc(0));
    seen.push({
      method: req.method,
      url: req.url,
      headers: { ...req.headers },
      body,
    });
    try {
      await handler(req, res, seen);
    } catch {
      try {
        res.writeHead(500);
        res.end('stub failure');
      } catch { /* client gone */ }
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, seen, port: server.address().port }));
  });
}

function stopOrigin(o) {
  return new Promise((r) => o.server.close(r));
}

const envFor = (o) => ({ GATEWAY_ORIGIN: `http://127.0.0.1:${o.port}` });

test('1. GET /gateway/v1/models strips prefix and forwards auth', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"object":"list"}');
  });
  try {
    const r = await worker.fetch(
      new Request(`${ZONE}/gateway/v1/models`, { headers: { Authorization: 'Bearer ate_test123' } }),
      envFor(o),
    );
    assert.equal(r.status, 200);
    assert.equal(await r.text(), '{"object":"list"}');
    assert.equal(o.seen.length, 1);
    assert.equal(o.seen[0].method, 'GET');
    assert.equal(o.seen[0].url, '/v1/models');
    assert.equal(o.seen[0].headers.authorization, 'Bearer ate_test123');
    assert.equal(o.seen[0].headers['x-forwarded-prefix'], '/gateway');
    assert.equal(o.seen[0].headers['x-forwarded-host'], 'akmaltaufikenterprise.my');
    assert.ok(!('cookie' in o.seen[0].headers));
  } finally {
    await stopOrigin(o);
  }
});

test('2. POST chat body passes through byte-identical', async () => {
  const payload = JSON.stringify({ model: 'gpt-6-astra', messages: [{ role: 'user', content: 'Hi' }], stream: false });
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"id":"x"}');
  });
  try {
    const r = await worker.fetch(
      new Request(`${ZONE}/gateway/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ate_test123' },
        body: payload,
      }),
      envFor(o),
    );
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].method, 'POST');
    assert.equal(o.seen[0].url, '/v1/chat/completions');
    assert.equal(o.seen[0].body.toString('utf8'), payload);
    assert.equal(o.seen[0].headers['content-type'], 'application/json');
  } finally {
    await stopOrigin(o);
  }
});

test('3. query strings preserved verbatim', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  try {
    await worker.fetch(new Request(`${ZONE}/gateway/v1/account/usage/daily?days=30&x=a%20b`), envFor(o));
    assert.equal(o.seen[0].url, '/v1/account/usage/daily?days=30&x=a%20b');
  } finally {
    await stopOrigin(o);
  }
});

test('5+6. Authorization forwarded intact, Cookie removed', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });
  try {
    await worker.fetch(
      new Request(`${ZONE}/gateway/v1/models`, { headers: { Authorization: 'Bearer ate_exact_value', Cookie: 'sess=abc' } }),
      envFor(o),
    );
    assert.equal(o.seen[0].headers.authorization, 'Bearer ate_exact_value');
    assert.ok(!('cookie' in o.seen[0].headers));
  } finally {
    await stopOrigin(o);
  }
});

test('7. Set-Cookie stripped from upstream responses, body kept', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': ['a=1', 'b=2'] });
    res.end('{"ok":true}');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/v1/models`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('set-cookie'), null);
    assert.equal(await r.text(), '{"ok":true}');
  } finally {
    await stopOrigin(o);
  }
});

test('15. SSE event stream passes through unbuffered and unaltered', async () => {
  const o = await startOrigin(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('retry: 5000\n\n');
    await new Promise((r) => setTimeout(r, 150));
    res.write('event: snapshot\ndata: {"a":1}\n\n');
    await new Promise((r) => setTimeout(r, 150));
    res.write(': heartbeat\n\n');
    res.end();
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/v1/account/usage/stream`), envFor(o));
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') || '', /text\/event-stream/);
    const text = await r.text();
    assert.ok(text.includes('event: snapshot\ndata: {"a":1}'));
    assert.ok(text.includes(': heartbeat'));
  } finally {
    await stopOrigin(o);
  }
});

test('14. upstream error statuses and bodies pass through untouched', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end('{"error":{"type":"upstream_error"}}');
  });
  try {
    const r = await worker.fetch(
      new Request(`${ZONE}/gateway/v1/chat/completions`, { method: 'POST', body: '{}' }),
      envFor(o),
    );
    assert.equal(r.status, 429);
    assert.equal(await r.text(), '{"error":{"type":"upstream_error"}}');
  } finally {
    await stopOrigin(o);
  }
});

test('8. unreachable origin yields generic 502 with no internals', async () => {
  const closedPort = await new Promise((resolve) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
  const r = await worker.fetch(
    new Request(`${ZONE}/gateway/v1/models`),
    { GATEWAY_ORIGIN: `http://127.0.0.1:${closedPort}` },
  );
  assert.equal(r.status, 502);
  const body = await r.json();
  assert.equal(body.error.type, 'upstream_error');
  const blob = JSON.stringify(body);
  assert.ok(!blob.includes('railway'));
  assert.ok(!blob.includes('127.0.0.1'));
  assert.ok(!blob.includes(String(closedPort)));
});

test('12. missing or non-http origin yields generic 502, never throws', async () => {
  for (const env of [{}, { GATEWAY_ORIGIN: '' }, { GATEWAY_ORIGIN: 'ftp://x/y' }]) {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/v1/models`), env);
    assert.equal(r.status, 502);
    const body = await r.json();
    assert.equal(body.error.type, 'upstream_error');
  }
});

test('8b. upstream timeout (25s) yields generic 502', async () => {
  const o = await startOrigin(async (req, res) => {
    await new Promise((r) => setTimeout(r, 30000));
    try {
      res.writeHead(200);
      res.end('too late');
    } catch { /* worker already gave up */ }
  });
  try {
    const start = Date.now();
    const r = await worker.fetch(new Request(`${ZONE}/gateway/v1/models`), envFor(o));
    const elapsed = Date.now() - start;
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error.type, 'upstream_error');
    assert.ok(elapsed >= 24000 && elapsed < 30000, `expected ~25s timeout, got ${elapsed}ms`);
  } finally {
    await stopOrigin(o);
  }
});

test('11+12. non-gateway and /gatewayfoo paths pass through untouched', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200);
    res.end('must not be contacted');
  });
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input.url || input));
    return new Response('pages-ok', { status: 200 });
  };
  try {
    const r1 = await worker.fetch(new Request(`${ZONE}/other/page`), envFor(o));
    assert.equal(await r1.text(), 'pages-ok');
    const r2 = await worker.fetch(new Request(`${ZONE}/gatewayfoo/bar`), envFor(o));
    assert.equal(await r2.text(), 'pages-ok');
    assert.deepEqual(calls, [`${ZONE}/other/page`, `${ZONE}/gatewayfoo/bar`]);
    assert.equal(o.seen.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    await stopOrigin(o);
  }
});

test('13. exact /gateway redirects to /gateway/', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200);
    res.end('must not be contacted');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway`), envFor(o));
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), `${ZONE}/gateway/`);
    assert.equal(o.seen.length, 0);
  } finally {
    await stopOrigin(o);
  }
});

test('A. /gateway/ preserves prefix to origin /gateway/ (no redirect loop)', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html>site</html>');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/?x=1&y=2`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(await r.text(), '<html>site</html>');
    assert.equal(o.seen.length, 1);
    assert.equal(o.seen[0].url, '/gateway/?x=1&y=2');
  } finally {
    await stopOrigin(o);
  }
});

test('C. /gateway/app preserves prefix to origin /gateway/app (portal contract)', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('portal');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'portal');
    assert.equal(o.seen[0].url, '/gateway/app');
  } finally {
    await stopOrigin(o);
  }
});

test('D. /gateway/app/ preserves prefix (portal trailing slash)', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('portal');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app/`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].url, '/gateway/app/');
  } finally {
    await stopOrigin(o);
  }
});

test('E. /gateway/app/assets/main.js preserves prefix (portal nested path)', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end('console.log(1)');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app/assets/main.js`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'console.log(1)');
    assert.equal(o.seen[0].url, '/gateway/app/assets/main.js');
  } finally {
    await stopOrigin(o);
  }
});

test('F. /gateway/app?foo=bar preserves prefix and query', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('portal');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app?foo=bar`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].url, '/gateway/app?foo=bar');
  } finally {
    await stopOrigin(o);
  }
});

test('G. /gateway/app/assets/main.js?v=123 preserves prefix and query', async () => {
  const o = await startOrigin((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end('console.log(1)');
  });
  try {
    const r = await worker.fetch(new Request(`${ZONE}/gateway/app/assets/main.js?v=123`), envFor(o));
    assert.equal(r.status, 200);
    assert.equal(o.seen[0].url, '/gateway/app/assets/main.js?v=123');
  } finally {
    await stopOrigin(o);
  }
});
