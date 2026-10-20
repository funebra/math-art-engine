# Funebra Google Photos → ImageBN import service (prototype)

This service adds a user-selected Google Photos import path for the existing static Math-Art Engine. It is a separate Cloudflare Worker using private KV namespaces and a private R2 bucket. It does not change `PlotBN` or the fixed F-0011 `RegistryBN`.

## Flow

`Google Photos Picker → short-lived Worker session → R2 source asset → ImageBN configuration → exported JSON`

The worker requests only `photospicker.mediaitems.readonly`, accepts exactly one selected photo per import, downloads it while the Picker `baseUrl` is valid, calculates SHA-256, writes the bytes to R2, and requests deletion of the Picker session. If Google does not confirm deletion, the session remains subject to Google's expiry. The browser receives an asset record and authenticated content path; it never receives the Google base URL or Google bearer token. A delete-only control key is returned once and kept locally by the engine so users can remove a stored asset even after the short-lived Google session expires. That key is not included in BN configuration exports.

## Required setup

1. Choose a custom domain you control for the app's OAuth identity and Worker callback (for example, `photos-api.<your-domain>/oauth/callback`). Google requires verification of domains used for the OAuth homepage, privacy policy, redirect URIs, and JavaScript origins. Host the app homepage and privacy policy on the same verified domain; the repository's shared `github.io` and default `workers.dev` hostnames are not substitutes for a domain you own. Enable the Google Photos Picker API and configure the consent screen for the Picker scope.
2. Create a Google OAuth 2.0 **Web application** client and register `https://photos-api.<your-verified-domain>/oauth/callback` as its redirect URI.
2. Create three private Workers KV namespaces (`FLOWS`, `TOKENS`, `PICKERS`) and one private R2 bucket.
3. Copy `wrangler.toml.example` to `wrangler.toml`, fill in the resource IDs, and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `FRONTEND_URL` in the Worker environment. Keep the client secret out of this repository.
4. Deploy the Worker. In the engine’s Google Photos → ImageBN panel, set its HTTPS Worker URL, then connect and select one photo.
5. Add a verification URL and user-facing disclosure to the Google OAuth consent configuration before asking other people to authorize the app.
6. Review `privacy.html` and verify the formal controller identity, legal basis, processor terms, data locations, retention, and data-rights/contact details before enabling external users. The policy is a prototype document, not a completed legal review.

## Endpoints

- `GET /auth/start`: begin OAuth; callback returns a one-time code in the engine URL fragment.
- `POST /api/auth/exchange`: exchange the one-time code for a short-lived app session token.
- `POST /api/picker-sessions`: create a Google Picker session.
- `GET /api/picker-sessions/{id}`: poll selection status.
- `POST /api/picker-sessions/{id}/import`: import exactly one selected photo to R2.
- `GET /api/assets/{id}` and `GET /api/assets/{id}/content`: read metadata or bytes for the current short-lived session.
- `DELETE /api/assets/{id}`: delete the durable image asset.

## BN data handling

`google_photos_bn_core.mjs` samples the image on a configurable pixel grid and creates a separately keyed `funebra-image-bn-config-v0.1`. Image configurations store source pixels, transform metadata, provenance, and sequential `bnN` point IDs. IDs start at `bn9`, leaving F-0011’s historical `bn0`–`bn8` set unchanged. The existing F-0011 registry is intentionally not loaded or modified.

The current browser adapter exports the configuration JSON. It does not write into the locked F-0011 export or the existing parametric PlotBN controls.

## Notes

- Google OAuth access tokens are held in KV until their TTL expires, no later than 55 minutes after authorization; they are not deleted immediately after import. The browser session token is held in `sessionStorage`. Cloudflare documents encryption at rest for R2 objects and Workers KV values.
- R2 objects are private; API reads require the active app session that performed the import. The object itself is retained until deleted. A future user-account and asset-access flow is needed to retrieve stored assets from a later browser session.
- The Worker enforces a 25 MiB image limit and a single-photo import. The frontend caps each point configuration at 20,000 points.
- Before connecting production accounts, confirm that the complete end use complies with Google’s Photos API User Data and Developer Policy. Do not create face clusters or a general-purpose photo-gallery substitute.
