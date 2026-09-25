# BeebotX Generations

Server-side TypeScript foundation for Higgsfield API generation.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   ```
   HF_CREDENTIALS=KEY_ID:KEY_SECRET
   ```

3. Build:

   ```bash
   npm run build
   ```

## Model-agnostic API

The integration deliberately accepts a Higgsfield model ID plus a model-specific input object:

```ts
import { generate } from "./src/higgsfield.js";

const result = await generate({
  model: "bytedance/seedance-2.5/text-to-video",
  input: {
    prompt: "A cinematic scene at sunset",
    duration: 5,
    resolution: "720p",
    aspect_ratio: "16:9",
    output_format: "mp4",
    generate_audio: true
  }
});

console.log(result.status, result.request_id, result.video?.url);
```

Use the model-specific Higgsfield API reference for the exact fields supported by each model. The wrapper does not hard-code a model catalog, so adding another model does not require a code change.

## Security

The official Higgsfield TypeScript SDK is server-side only. Never expose `HF_CREDENTIALS` in browser code or commit it to Git.

For production workloads, a webhook can be supplied instead of relying only on polling. Persist the returned `request_id` if the application needs durable job tracking.
