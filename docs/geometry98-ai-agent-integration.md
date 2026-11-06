# Geometry98 in-engine AI agent — integration plan

**Status:** design plus Worker scaffold prepared in the draft PR. No OAuth client, Cloudflare secrets, live page integration, Worker deployment, or paid API call is configured.

## Goal

Let a Geometry98 user enter a request such as “draw a circle” or “make a rotating cube” in an in-engine chat panel. The agent translates the request into a reviewable scene plan that Geometry98 can preview and apply through its own point/formula engine.

This extends the user's proposed artificial.value idea into a real AI-to-engine bridge. artificial.value should be the typed, versioned scene-patch envelope, not an API key or an executable-code field.

## Proposed interaction

1. User enters a natural-language shape request.
2. The page sends the prompt and a minimal engine capability description to a same-origin or configured server endpoint.
3. The server asks the selected model for a constrained JSON scene plan.
4. The browser validates the plan against a strict schema and displays a plain-language summary.
5. User chooses **Preview**. Geometry98 compiles the plan into the existing engine's supported point/formula controls.
6. User chooses **Apply** to replace the current scene. The agent records a restorable pre-apply checkpoint and offers Undo.
7. User can save/export the resulting scene using Geometry98's existing export path.

The model never returns JavaScript for direct evaluation. The deterministic client compiler owns formula generation and projection.

## artificial.value envelope

Initial proposal:

```json
{
  "type": "funebra.geometry98.artificial-value",
  "version": 1,
  "intent": "create",
  "scene": {
    "kind": "cube",
    "parameters": { "size": 120, "radius": 60, "centerX": 400, "centerY": 300, "centerZ": 0 },
    "sampling": { "mode": "edges", "points": 120 },
    "style": { "color": "#00c853", "glyph": "dot" },
    "motion": { "enabled": true, "rotateX": 0.006, "rotateY": 0.01, "rotateZ": 0 }
  },
  "explanation": "A centered wireframe cube rotating around the X and Y axes."
}
```

The production schema should use JSON Schema with additionalProperties false, finite-number and length bounds, an allowlist of shape kinds and motion modes, and an explicit maximum point budget. The model may propose only supported primitives and parameters. It must not set arbitrary selectors, URLs, DOM attributes, HTML, or engine code.

## Engine adapter

- Discover and verify the page's actual controls at runtime, including scodeX, scodeY, scodeZ, clor, and itext.
- Compile typed geometry into the engine's existing bn-point/coordinate representation.
- Keep generation, 3D rotation, projection, color, and glyph assignment as separate adapter stages.
- Reuse the engine's point nodes and animation lifecycle; prevent duplicate animation loops.
- If a control is absent or its meaning cannot be verified, block Apply and explain the mismatch.
- Store the proposed artificial.value object alongside the checkpoint so users can inspect, export, restore, and compare it.

## Backend and privacy

The repository's documented demo is static GitHub Pages. A browser-only page cannot keep a provider API key secret. Add a small server-side relay (for example, a serverless function) that:

- stores the model API key as a secret environment variable;
- accepts only the validated prompt and capability summary;
- enforces request-size, rate, and usage limits;
- requests structured output and validates it again before returning;
- returns a clear error when the provider or usage limit is unavailable;
- does not persist prompts by default.

The browser should show when a request will use the configured AI provider and should not send the current scene or conversation history unless needed and clearly disclosed.

## Login and paid activation

**Selected direction:** add a “Continue with ChatGPT” option to page01 for user identity, then enable Geometry98 AI requests through a FUNEBRA-owned, server-side API project. The signed-in user should see the AI feature as available once authentication and service health are confirmed. Sign-in alone must not trigger a model request or create a charge; a chargeable request happens only when the user submits a prompt. OpenAI's website flow requires a registered OAuth client ID, exact callback URL, and backend session handling.

ChatGPT sign-in does not itself provide API inference access or authorize API charges. The server-side FUNEBRA API project supplies inference, and its API usage is billed separately from ChatGPT subscriptions. The API credential must stay in a server secret, never in the page. The requested monthly application-side usage limit is **US$5**. The Worker reserves a conservative maximum request amount against an account-wide monthly meter before calling the model, then reconciles returned token usage. This relies on accurate, current model prices and is not a substitute for provider-side billing controls or budget alerts. Keep the feature disabled if the cap, API credential, current price configuration, or authentication configuration is missing.

## Cost controls

API usage is separate from a ChatGPT subscription. The scaffold applies an account-wide $5 ceiling, reserves usage before each model call, and exposes a UTC-month usage endpoint. It also applies a per-user request rate limit. Configure current token prices for the selected model and add provider-side budget alerts; model price changes or unreported provider usage can make local metering differ from the final invoice. Keep the model configurable so the engine can run local deterministic templates for simple built-in shapes without making an API call.

## Deployment target check

**Confirmed target for this request:** https://plabsfill.com/engine/geometry98/, whose active source file is `engine/geometry98/index.htm` in the pLabs Control Panel File Manager. The `page01` panel in that file currently contains the visitor counter and Play Music control; add the Geometry98 chat/login entry there.

The repository's GitHub Pages demo at https://funebra.github.io/math-art-engine/ is a separate deployment. Do not publish to it as a substitute for the plabsfill.com page. The current plabsfill source file has been inspected in its signed-in File Manager, but not changed.

## Delivery stages

1. **Contract:** finalize shape-plan schema and supported primitives (circle, cube, sphere); include rotation and color.
2. **Client prototype:** add the chat panel, artificial.value preview, validation, Apply, Undo, and error states.
3. **Backend:** deploy the secret-backed relay, configure allowed origins, and set rate/cost limits.
4. **Integration review:** confirm control IDs and projection behavior on the chosen live page; compare generated scenes against saved Geometry98 checkpoints.
5. **Release:** publish only after owner review of the deployment target, API budget, and user-facing data notice.

The PR now includes a Cloudflare Worker scaffold in workers/geometry98-agent: ChatGPT OIDC/PKCE login, signed short-lived session cookie, constrained Responses API output, schema validation, request limits, and SQLite Durable Object usage reservations. The scaffold still requires OAuth registration, secrets, model/prices, and Cloudflare domain configuration. It is not deployed. It does not yet alter engine/geometry98/index.htm or either live Geometry98 page; the client-side page01 login/chat adapter remains an integration stage.