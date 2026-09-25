import { config, higgsfield, type V2Response } from "@higgsfield/client/v2";

let configuredCredentials: string | undefined;

function ensureConfigured(): void {
  const credentials = process.env.HF_CREDENTIALS;

  if (!credentials) {
    throw new Error(
      "Missing HF_CREDENTIALS. Set it to KEY_ID:KEY_SECRET in the server environment."
    );
  }

  if (credentials !== configuredCredentials) {
    config({ credentials });
    configuredCredentials = credentials;
  }
}

export type HiggsfieldInput = Record<string, unknown>;

export interface GenerateOptions {
  /** Higgsfield model/endpoint ID, e.g. bytedance/seedance-2.5/text-to-video. */
  model: string;
  /** Model-specific request fields. The API accepts different schemas per model. */
  input: HiggsfieldInput;
  /** Optional public HTTPS webhook. If omitted, the SDK polls automatically. */
  webhookUrl?: string;
  /** When false, return after submission instead of waiting for completion. */
  withPolling?: boolean;
}

/**
 * Submit any Higgsfield model using its model ID and model-specific input.
 *
 * This intentionally does not restrict model IDs or input fields so the
 * application can use new Higgsfield models without changing this wrapper.
 */
export async function generate(
  options: GenerateOptions
): Promise<V2Response> {
  ensureConfigured();

  return higgsfield.subscribe(options.model, {
    input: options.input,
    withPolling: options.withPolling ?? true,
    ...(options.webhookUrl
      ? {
          webhook: {
            url: options.webhookUrl,
            secret: process.env.HF_WEBHOOK_SECRET ?? "",
          },
        }
      : {}),
  });
}
