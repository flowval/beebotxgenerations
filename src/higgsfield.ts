const BASE_URL = "https://platform.higgsfield.ai";

export type HiggsfieldInput = Record<string, unknown>;

export type HiggsfieldStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw"
  | string;

export interface HiggsfieldResponse {
  status: HiggsfieldStatus;
  request_id: string;
  status_url: string;
  cancel_url: string;
  images?: Array<{ url: string; [key: string]: unknown }>;
  video?: { url: string; [key: string]: unknown };
  error?: string;
  [key: string]: unknown;
}

export interface GenerateOptions {
  model: string;
  input: HiggsfieldInput;
  webhookUrl?: string;
  wait?: boolean;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

function getApiKey(): string {
  const key = process.env.HF_KEY;
  if (!key) {
    throw new Error(
      "Missing HF_KEY. Set it to your Higgsfield API key:secret in the server environment."
    );
  }
  return key;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Key ${getApiKey()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function normalizeModelPath(model: string): string {
  const clean = model.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) throw new Error("Higgsfield model_id cannot be empty.");
  return clean;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });

  const bodyText = await response.text();
  let body: unknown;
  try {
    body = bodyText ? JSON.parse(bodyText) : undefined;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(
      `Higgsfield API ${response.status} ${response.statusText}: ${detail}`
    );
  }

  return body as T;
}

/** Submit any Higgsfield model with its model-specific input schema. */
export async function submit(
  options: GenerateOptions
): Promise<HiggsfieldResponse> {
  const modelPath = normalizeModelPath(options.model);
  const url = new URL(`${BASE_URL}/${modelPath}`);

  if (options.webhookUrl) {
    url.searchParams.set("hf_webhook", options.webhookUrl);
  }

  return requestJson<HiggsfieldResponse>(url.toString(), {
    method: "POST",
    body: JSON.stringify(options.input),
  });
}

/** Fetch the latest state for an existing request. */
export async function getStatus(
  requestId: string
): Promise<HiggsfieldResponse> {
  if (!requestId?.trim()) throw new Error("request_id is required.");

  return requestJson<HiggsfieldResponse>(
    `${BASE_URL}/requests/${encodeURIComponent(requestId)}/status`,
    { method: "GET" }
  );
}

/** Cancel a request while it is still queued. */
export async function cancel(requestId: string): Promise<HiggsfieldResponse> {
  if (!requestId?.trim()) throw new Error("request_id is required.");

  return requestJson<HiggsfieldResponse>(
    `${BASE_URL}/requests/${encodeURIComponent(requestId)}/cancel`,
    { method: "POST" }
  );
}

/** Submit and optionally wait for a final result. */
export async function generate(
  options: GenerateOptions
): Promise<HiggsfieldResponse> {
  const initial = await submit(options);

  if (
    options.wait === false ||
    initial.status === "completed" ||
    (initial.status !== "queued" && initial.status !== "in_progress")
  ) {
    return initial;
  }

  const pollIntervalMs =
    options.pollIntervalMs ?? Number(process.env.HF_POLL_INTERVAL_MS ?? 2000);
  const pollTimeoutMs =
    options.pollTimeoutMs ?? Number(process.env.HF_POLL_TIMEOUT_MS ?? 900000);

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 250) {
    throw new Error("pollIntervalMs must be at least 250ms.");
  }
  if (!Number.isFinite(pollTimeoutMs) || pollTimeoutMs <= 0) {
    throw new Error("pollTimeoutMs must be greater than 0.");
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < pollTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const latest = await getStatus(initial.request_id);

    if (latest.status !== "queued" && latest.status !== "in_progress") {
      return latest;
    }
  }

  throw new Error(
    `Timed out waiting for Higgsfield request ${initial.request_id} after ${pollTimeoutMs}ms.`
  );
}
