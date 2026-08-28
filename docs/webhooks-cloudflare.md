# Cloudflare + flippincalendar.co.za

The app and all webhooks use the **apex domain** `flippincalendar.co.za`, proxied through Cloudflare to Vercel.

## URLs

| Purpose | URL |
|---------|-----|
| App | `https://flippincalendar.co.za` |
| PayFast ITN | `https://flippincalendar.co.za/api/webhooks/payfast` |
| ElevenLabs | `https://flippincalendar.co.za/api/webhooks/elevenlabs` |

`www.flippincalendar.co.za` also works (redirects handled by Vercel/Cloudflare).

## One-time Cloudflare setup

Enable orange-cloud proxy on apex + www (Clerk CNAMEs stay DNS-only):

```bash
CLOUDFLARE_API_TOKEN=... node scripts/setup-cloudflare-dns.mjs
```

Or in the [Cloudflare DNS dashboard](https://dash.cloudflare.com/):
1. Toggle **Proxied** (orange cloud) on `@` (A → `76.76.21.21`) and `www` (CNAME → Vercel)
2. SSL/TLS → **Full** (not strict until Vercel origin cert is confirmed)

## Vercel env (Production)

```bash
NEXT_PUBLIC_APP_URL=https://flippincalendar.co.za
CLERK_AUTHORIZED_PARTIES=https://flippincalendar.co.za,https://www.flippincalendar.co.za
```

## PayFast

`notify_url` is set automatically per checkout to:
`https://flippincalendar.co.za/api/webhooks/payfast`

No PayFast dashboard change needed.

## ElevenLabs

```bash
node --env-file-if-exists=.env.local scripts/setup-elevenlabs-webhook.mjs
```

Or manually: [ElevenLabs → Webhooks](https://elevenlabs.io/app/agents/settings)
- URL: `https://flippincalendar.co.za/api/webhooks/elevenlabs`
- Events: `post_call_transcription`

## DNS layout

| Record | Target | Proxy |
|--------|--------|-------|
| `@` A | `76.76.21.21` (Vercel) | **Proxied** |
| `www` CNAME | Vercel DNS | **Proxied** |
| `clerk`, `accounts`, DKIM | Clerk | DNS only |
| `*.` | Worker (tenant sites) | Proxied |

## Verify

```bash
curl -I https://flippincalendar.co.za
curl -I https://flippincalendar.co.za/api/webhooks/payfast
```

POST endpoints may return 405 on GET — that is expected.
