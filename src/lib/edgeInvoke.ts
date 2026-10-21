import {
  buildSupabaseHeaders,
  getSupabaseConfig,
} from "@/integrations/supabase/client";
import type { SummarizeRequest } from "@/lib/summary-types";

export interface StreamChunk {
  content?: string;
  error?: string;
  done?: boolean;
}

type EdgeFunctionName = "summarize" | "feedback-proxy";

function getFunctionUrl(functionName: EdgeFunctionName): string {
  const { url, configured, configError } = getSupabaseConfig();
  if (!configured) {
    throw new Error(
      configError ??
        "Supabase не настроен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.",
    );
  }

  if (!import.meta.env.DEV) {
    return functionName === "feedback-proxy"
      ? "/api/feedback"
      : `/api/${functionName}`;
  }

  return `${url}/functions/v1/${functionName}`;
}

async function fetchEdgeFunction(
  functionName: EdgeFunctionName,
  init: RequestInit,
): Promise<Response> {
  const directUrl = (() => {
    const { url, configured } = getSupabaseConfig();
    if (!configured) return null;
    return `${url}/functions/v1/${functionName}`;
  })();

  const primaryUrl = getFunctionUrl(functionName);

  try {
    const response = await fetch(primaryUrl, init);
    if (response.ok || !directUrl || primaryUrl === directUrl) {
      return response;
    }

    // Same-origin proxy can fail on Render; fall back to direct Supabase call.
    if (response.status >= 500 || response.status === 404) {
      return fetch(directUrl, init);
    }

    return response;
  } catch (error) {
    if (directUrl && primaryUrl !== directUrl) {
      try {
        return await fetch(directUrl, init);
      } catch {
        // Fall through to the shared network error below.
      }
    }

    throw toNetworkError(error);
  }
}

function toNetworkError(error: unknown): Error {
  const message = error instanceof Error ? error.message : "Сетевая ошибка";
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return new Error(
      "Не удалось подключиться к серверу генерации. " +
        "Проверьте интернет, что проект Supabase не на паузе, и попробуйте снова.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

function formatHttpError(status: number, body: string): string {
  if (status === 502 || status === 503 || status === 504) {
    return (
      "Сервер генерации временно недоступен. " +
      "Если ошибка повторяется, проверьте в Supabase Dashboard, что проект не на паузе, " +
      "и попробуйте снова через пару минут."
    );
  }
  return body || `Ошибка сервера: ${status}`;
}

export async function invokeSummarizeStream(
  body: SummarizeRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const init: RequestInit = {
    method: "POST",
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(body),
  };
  if (signal) {
    init.signal = signal;
  }

  const response = await fetchEdgeFunction("summarize", init);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(formatHttpError(response.status, errText));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const preview = (await response.clone().text()).slice(0, 200);
    throw new Error(
      preview ||
        "Сервер вернул непотоковый ответ. Проверьте, что проект Supabase активен.",
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Сервер не вернул поток данных");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload) as StreamChunk & {
          status?: string;
        };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) onChunk(parsed.content);
        if (parsed.done) return;
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export async function sendFeedback(payload: {
  rating: number;
  message: string;
}): Promise<void> {
  const { configured } = getSupabaseConfig();
  if (!configured) return;

  const response = await fetchEdgeFunction("feedback-proxy", {
    method: "POST",
    headers: buildSupabaseHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось отправить отзыв");
  }
}
