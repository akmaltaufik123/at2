# ATEBooster Deployment Guide

This directory contains the Cloudflare Worker that proxies API calls to the PadooInsta SMM Panel API.

## Architecture

- **Static HTML** (`/booster/index.html`) - Served from GitHub Pages
- **API Proxy** (Cloudflare Worker) - Intercepts `/booster/api*` requests and proxies to PadooInsta

## Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set the API Key Secret

```bash
cd deploy/booster-path
wrangler secret put PADOONSTA_API_KEY
```

When prompted, enter your PadooInsta API key.

### 4. Deploy the Worker

```bash
wrangler deploy
```

### 5. Verify Deployment

Visit `https://akmaltaufikenterprise.my/booster/` to see the SMM Panel.

Test the API:
```bash
curl https://akmaltaufikenterprise.my/booster/api/services
```

## Local Development

To test locally:

```bash
wrangler dev
```

Then visit `http://localhost:8787/booster/api/services`

## Security Notes

- The PadooInsta API key is stored as a Cloudflare secret and never exposed to clients
- All API calls go through the worker, which adds the key server-side
- CORS is enabled for cross-origin requests from the main site

## Updating the API Key

```bash
cd deploy/booster-path
wrangler secret put PADOONSTA_API_KEY
```

No redeployment needed - secrets are updated immediately.
