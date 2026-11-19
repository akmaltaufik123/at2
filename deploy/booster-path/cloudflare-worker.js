/**
 * ATEBooster Cloudflare Worker
 * Proxies API calls to PadooInsta SMM Panel API
 * Protects the API key from client-side exposure
 */

const API_URL = 'https://padooinsta.com/api/v2';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // GET /booster/api/services - Fetch all services
      if (path.endsWith('/api/services') && request.method === 'GET') {
        const data = await proxyToApi(env.PADOONSTA_API_KEY, { action: 'services' });
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // GET /booster/api/balance - Check balance
      if (path.endsWith('/api/balance') && request.method === 'GET') {
        const data = await proxyToApi(env.PADOONSTA_API_KEY, { action: 'balance' });
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // POST /booster/api/order - Place new order
      if (path.endsWith('/api/order') && request.method === 'POST') {
        const body = await request.json();
        const params = {
          action: 'add',
          service: body.service,
          link: body.link,
          quantity: body.quantity,
        };
        if (body.comments) params.comments = body.comments;
        if (body.runs) params.runs = body.runs;
        if (body.interval) params.interval = body.interval;

        const data = await proxyToApi(env.PADOONSTA_API_KEY, params);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // POST /booster/api/status - Check order status
      if (path.endsWith('/api/status') && request.method === 'POST') {
        const body = await request.json();
        const params = { action: 'status' };
        if (body.order) params.order = body.order;
        if (body.orders) params.orders = body.orders;

        const data = await proxyToApi(env.PADOONSTA_API_KEY, params);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // POST /booster/api/refill - Request refill
      if (path.endsWith('/api/refill') && request.method === 'POST') {
        const body = await request.json();
        const params = { action: 'refill' };
        if (body.order) params.order = body.order;
        if (body.orders) params.orders = body.orders;

        const data = await proxyToApi(env.PADOONSTA_API_KEY, params);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // POST /booster/api/cancel - Cancel orders
      if (path.endsWith('/api/cancel') && request.method === 'POST') {
        const body = await request.json();
        const data = await proxyToApi(env.PADOONSTA_API_KEY, {
          action: 'cancel',
          orders: body.orders,
        });
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      // 404 for unknown paths
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

/**
 * Proxy request to PadooInsta API
 */
async function proxyToApi(apiKey, params) {
  const body = new URLSearchParams({ key: apiKey, ...params });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return response.json();
}
