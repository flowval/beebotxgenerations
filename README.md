# BeebotX Generations

Model-agnostic server-side TypeScript integration for the Higgsfield REST API.

## Current Higgsfield SDK status

Higgsfield's official Client Libraries page currently lists JavaScript/TypeScript SDK support as "Coming Soon." For TypeScript applications, this project therefore uses Higgsfield's documented REST API directly.

## Setup

Create a local `.env` file:

```env
HF_KEY=YOUR_KEY:YOUR_SECRET
HF_WEBHOOK_URL=
HF_POLL_INTERVAL_MS=2000
HF_POLL_TIMEOUT_MS=900000
```

The repository's `.gitignore` excludes `.env`.

## Use any Higgsfield model

Each model has a unique `model_id`. The client accepts the model ID and passes the model-specific input object through unchanged.

```ts
import { generate } from "./higgsfield.js";

const result = await generate({
  model: "higgsfield-ai/soul/standard",
  input: {
    prompt: "A cinematic futuristic city at sunset",
    aspect_ratio: "16:9",
    resolution: "2K"
  }
});

console.log(result.status);
console.log(result.images?.[0]?.url);
console.log(result.video?.url);
```

To use another model, replace `model` and provide the fields required by that model's API reference. No client-code change is required.

## Async jobs

Use `submit()` with `wait: false` when you want to persist and manage the request yourself:

```ts
import { submit, getStatus, cancel } from "./higgsfield.js";

const queued = await submit({
  model: "higgsfield-ai/soul/standard",
  input: {
    prompt: "A cinematic futuristic city at sunset",
    aspect_ratio: "16:9",
    resolution: "2K"
  },
  wait: false
});

console.log(queued.request_id);

const status = await getStatus(queued.request_id);

if (status.status === "queued") {
  await cancel(queued.request_id);
}
```

Higgsfield documents these endpoints:

- `POST https://platform.higgsfield.ai/{model_id}`
- `GET https://platform.higgsfield.ai/requests/{request_id}/status`
- `POST https://platform.higgsfield.ai/requests/{request_id}/cancel`

## Webhooks

Pass `webhookUrl` to `submit()` or `generate()`. Higgsfield sends final `completed`, `failed`, or `nsfw` notifications to that public HTTPS endpoint.

Use `request_id` for idempotency because webhook delivery may be retried.

## Security

Keep `HF_KEY` server-side only. Never put it in browser code, frontend bundles, logs, screenshots, or Git commits.
