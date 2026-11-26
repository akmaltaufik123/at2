/**
 * ATEBooster private upstream proxy.
 * B1 is the legacy supplier. B2 is an optional additional white-label supplier.
 * Never put supplier API keys or the admin access token in public HTML.
 */
const SUPPLIERS = {
  B1: { endpoint: 'https://padooinsta.com/api/v2', secret: 'PADOONSTA_API_KEY' },
  B2: { endpoint: 'https://ezkify.com/api/v2', secret: 'EZKIFY_API_KEY' },
};
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const ALLOWED_ACTIONS = new Set(['services','balance','add','status','refill','refill_status','cancel']);
const ORDER_FIELDS = [
  'link','quantity','comments','runs','interval','usernames','hashtags','hashtag',
  'username','media','answer_number','min','max','posts','old_posts','delay',
  'expiry','country'
];
const respond = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

function identifier(value) {
  const str = String(value ?? '').trim();
  if (/^ATE-B2-[0-9]+$/.test(str)) return { supplier: 'B2', id: str.slice(7) };
  if (/^[0-9]+$/.test(str)) return { supplier: 'B1', id: str };
  throw new Error('Invalid service or order reference');
}
function references(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  if (!list.length || list.length > 100) throw new Error('Provide 1 to 100 references');
  const ids = list.map(identifier);
  if (ids.some(v => v.supplier !== ids[0].supplier)) {
    throw new Error('Use separate requests for different order sources');
  }
  return { supplier: ids[0].supplier, values: ids.map(v => v.id).join(',') };
}
function hasAdminToken(request, env) {
  const expected = env.ATEBOOSTER_ADMIN_TOKEN;
  const supplied = request.headers.get('Authorization') || '';
  if (!expected || !supplied.startsWith('Bearer ')) return false;
  const value = supplied.slice(7);
  if (value.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < value.length; i++) difference |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
async function upstream(env, supplier, params) {
  const config = SUPPLIERS[supplier];
  const key = env[config.secret];
  if (!key) throw new Error('Source not configured');
  if (!ALLOWED_ACTIONS.has(params.action)) throw new Error('Unsupported action');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key, ...params }).toString(),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Source HTTP error');
    const data = await response.json();
    if (data && data.error) throw new Error('Source rejected request');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
function cleanServices(data, supplier) {
  if (!Array.isArray(data)) throw new Error('Invalid source catalog');
  return data.flatMap(service => {
    const id = String(service?.service ?? '');
    const rate = Number(service?.rate);
    const min = Number(service?.min);
    const max = Number(service?.max);
    if (!/^[0-9]+$/.test(id) || !Number.isFinite(rate) || rate <= 0
      || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) return [];
    const neutral = value => String(value ?? '').replace(/ezkify/ig, 'ATEBooster');
    return [{
      service: supplier === 'B1' ? Number(id) : 'ATE-B2-' + id,
      name: neutral(service.name),
      type: neutral(service.type),
      category: neutral(service.category),
      rate: String(rate), min, max,
      refill: Boolean(service.refill),
      cancel: Boolean(service.cancel)
    }];
  });
}
async function catalog(env) {
  const configured = Object.keys(SUPPLIERS).filter(s => Boolean(env[SUPPLIERS[s].secret]));
  if (!configured.length) return respond({error:'Service catalog is not configured'},503);
  const outcomes = await Promise.allSettled(configured.map(s =>
    upstream(env, s, {action:'services'}).then(list => cleanServices(list,s))
  ));
  const valid = outcomes.filter(o => o.status === 'fulfilled').flatMap(o => o.value);
  if (!outcomes.some(o => o.status === 'fulfilled')) {
    return respond({error:'Service catalog is temporarily unavailable'},502);
  }
  return respond(valid);
}
function asText(value, max = 2000) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Invalid order field');
  const text = String(value);
  if (text.length > max) throw new Error('Order field too long');
  return text;
}
async function routeAction(request, env, name) {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return respond({error:'Invalid request body'},400);
  }
  let supplier = 'B1';
  let params = {};
  if (name === 'add') {
    const ref = identifier(body.service);
    supplier = ref.supplier;
    params = {action:'add',service:ref.id};
    for (const field of ORDER_FIELDS) {
      const val = asText(body[field], field === 'comments' ? 12000 : 2000);
      if (val !== undefined) params[field] = val;
    }
    if (!params.link && !params.username && !params.usernames) {
      return respond({error:'Order target is required'},400);
    }
    if (params.quantity && (!Number.isSafeInteger(Number(params.quantity)) || Number(params.quantity) < 1)) {
      return respond({error:'Invalid quantity'},400);
    }
  } else if (name === 'status' || name === 'refill' || name === 'cancel') {
    const single = body.order !== undefined && body.order !== null && body.order !== '';
    const multiple = body.orders !== undefined && body.orders !== null && body.orders !== '';
    if (single === multiple) return respond({error:'Supply order or orders'},400);
    const ids = single ? identifier(body.order) : references(body.orders);
    supplier = ids.supplier;
    params = {action:name, [single ? 'order' : 'orders']:single ? ids.id : ids.values};
  } else if (name === 'refill_status') {
    const single = body.refill !== undefined && body.refill !== null && body.refill !== '';
    const multiple = body.refills !== undefined && body.refills !== null && body.refills !== '';
    if (single === multiple) return respond({error:'Supply refill or refills'},400);
    const ids = single ? identifier(body.refill) : references(body.refills);
    supplier = ids.supplier;
    params = {action:name, [single ? 'refill' : 'refills']:single ? ids.id : ids.values};
  }
  if (!env[SUPPLIERS[supplier].secret]) return respond({error:'Requested service is not configured'},503);
  const result = await upstream(env,supplier,params);
  if (name === 'add' && result && result.order !== undefined) {
    return respond({ order: supplier === 'B2' ? 'ATE-B2-' + result.order : result.order });
  }
  if (name === 'refill' && result && result.refill !== undefined && !Array.isArray(result)) {
    return respond({ refill: supplier === 'B2' ? 'ATE-B2-' + result.refill : result.refill });
  }
  return respond(result);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') {
      return new Response(null, {status:204,headers:{
        'Allow':'GET, POST, OPTIONS',
        'Access-Control-Allow-Origin':url.origin,
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type, Authorization'
      }});
    }
    try {
      if (path.endsWith('/api/services') && request.method === 'GET') return catalog(env);
      if (path.endsWith('/api/balance') && request.method === 'GET') {
        if (!hasAdminToken(request,env)) return respond({error:'Admin authorization required'},403);
        const supplier = url.searchParams.get('source') === 'B2' ? 'B2' : 'B1';
        return respond(await upstream(env,supplier,{action:'balance'}));
      }
      const actions = {
        '/api/order':'add','/api/status':'status','/api/refill':'refill',
        '/api/refill-status':'refill_status','/api/cancel':'cancel'
      };
      for (const [suffix,action] of Object.entries(actions)) {
        if (path.endsWith(suffix) && request.method === 'POST') {
          // Orders incur real upstream charges. The customer portal only prepares
          // WhatsApp orders; payment and fulfilment must be approved separately.
          if (action !== 'status' && action !== 'refill_status' && !hasAdminToken(request,env)) {
            return respond({error:'Admin authorization required'},403);
          }
          return await routeAction(request,env,action);
        }
      }
      return respond({error:'Not found'},404);
    } catch (error) {
      if (error instanceof SyntaxError) return respond({error:'Invalid JSON'},400);
      if (/Invalid |Order field|Provide |Supply |Use separate requests|Unsupported /.test(error.message)) {
        return respond({error:error.message},400);
      }
      return respond({error:'The service provider is temporarily unavailable'},502);
    }
  }
};
