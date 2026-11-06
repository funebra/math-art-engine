# Geometry98 AI Worker

This Worker is the server-side authentication and scene-plan relay for the Geometry98 AI prototype. It is a draft integration for the plabsfill.com deployment, not a live service.

## Request flow

- Continue with ChatGPT starts OpenID Connect authorization code sign-in with PKCE.
- The callback validates state, nonce, issuer, audience, expiry, and the ID token signature. It stores only a short-lived signed session cookie; provider access and refresh tokens are not retained.
- A signed-in user can submit a prompt to /api/geometry98/scene. That user action is the only path that calls the paid Responses API.
- The model is constrained to a JSON artificial.value envelope for circle, cube, or sphere. The Worker validates it again before returning it.
- The engine client should preview and compile the typed plan itself. Never evaluate model text as JavaScript or HTML.
- Prompts are not persisted. The Durable Object stores monthly settled/reserved usage and short rate-limit counters.

## Deployment configuration

Use the custom domain https://ai.plabsfill.com. This keeps the Worker and https://plabsfill.com on the same site for secure cookies while still requiring the page's explicit credentialed CORS request.

Register an OpenAI sign-in client and add this exact redirect URI:

    https://ai.plabsfill.com/auth/openai/callback

The client ID belongs in Worker configuration. If the registered client is confidential, set its client secret as a Worker secret; otherwise use the registered public-client method with PKCE. Never put either the API key or client secret in index.htm.

Set these Cloudflare Worker secrets using the Cloudflare dashboard or wrangler secret put:

- OPENAI_API_KEY — FUNEBRA API project key.
- SESSION_ENCRYPTION_SECRET — generate a random secret with at least 32 bytes of entropy.
- OPENAI_OAUTH_CLIENT_SECRET — only if required by the registered OAuth client.

Set OPENAI_OAUTH_CLIENT_ID as a Worker variable. Configure OPENAI_MODEL and both model price variables before enabling /api/geometry98/scene:

- OPENAI_INPUT_MICRO_USD_PER_1M
- OPENAI_OUTPUT_MICRO_USD_PER_1M

Each price variable is an integer number of micro-US dollars per one million tokens. Copy the current prices for the selected model from the provider's pricing page when configuring the Worker. The variables are deliberately blank in wrangler.jsonc; the Worker fails closed until they are set.

The monthly cap defaults to 5000000 micro-US dollars (US$5) and is clamped so a configuration cannot raise it above US$5. The account-wide SQLite Durable Object reserves the maximum configured request amount before calling the API, then reconciles against returned token usage. The configured token prices must be conservative and kept current. This is an application-side usage guard; it cannot override provider billing or guarantee an invoice total if the configured model price is wrong, usage is not returned, or the provider changes pricing. Keep a provider-side budget alert in place as a second control.

## Routes

| Route | Purpose |
|---|---|
| GET /health | Readiness and missing configuration names; does not disclose secret values. |
| GET /auth/openai/start | Begins ChatGPT sign-in. |
| GET /auth/openai/callback | Validates sign-in and creates the session cookie. |
| GET /api/auth/status | Reports whether the browser session is signed in. |
| POST /api/auth/logout | Clears the session cookie. |
| GET /api/usage | Returns the current UTC-month meter for a signed-in user. |
| POST /api/geometry98/scene | Reserves budget, calls the model, validates the scene plan, and settles usage. |

The page should send credentials: include to the API and use the exact APP_ORIGIN value. Do not enable the page's chat form until /health is ready and a login round trip plus status check succeed.

## Still required before deployment

1. Register the OpenAI sign-in client and configure its exact callback URI.
2. Configure the Cloudflare account, zone, custom Worker domain, Durable Object migration, OAuth client ID, API key, session secret, selected model, and current token prices.
3. Add the Geometry98 page01 login/chat UI and deterministic client compiler in engine/geometry98/index.htm. The current page has not been changed by this branch.
4. Confirm the client preview/apply/undo flow and export path against the actual Geometry98 controls. Login must not call the model; submitting a shape prompt does.
5. Review privacy notice and provider-side budget alerts before making the paid route available.

No Worker has been deployed and no paid API request has been made by this draft.
