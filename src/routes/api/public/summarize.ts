import { createFileRoute } from "@tanstack/react-router";
import { buildGenerationUserMessage, buildSystemPrompt } from "@/lib/server/prompt";
import { z } from "zod";
import { canGenerateMaterial } from "@/lib/lesson-directory";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const CONNECT_TIMEOUT_MS = 30_000;
const TOTAL_TIMEOUT_MS = 180_000;
const MAX_IMAGES = 40;

const requestSchema = z.object({
  images: z.array(z.string().max(6_000_000)).max(MAX_IMAGES).optional(),
  settings: z.object({
    format: z.enum(["notes", "cheatsheet", "table", "qa"]),
    detail: z.enum(["brief", "medium", "detailed"]),
    level: z.enum(["simple", "study", "deep"]),
    focus: z.string().max(2000),
    lessonNumber: z.number().int().min(1).max(170).optional(),
  }),
  existingContent: z.string().max(200_000).optional(),
  refinement: z.enum(["shorter", "examples", "simpler", "quiz"]).optional(),
});

export const Route = createFileRoute("/api/public/summarize")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "OPENROUTER_API_KEY не настроен" }, { status: 500 });
        }
        const origin = request.headers.get("Origin");

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const send = (data: Record<string, unknown>) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            send({ status: "connected" });

            try {
              let body: z.infer<typeof requestSchema>;
              try {
                body = requestSchema.parse(await request.json());
              } catch {
                send({ error: "Некорректные параметры запроса" });
                controller.close();
                return;
              }
              const { images, settings, existingContent, refinement } = body;
              if (!canGenerateMaterial(images?.length ?? 0, settings.lessonNumber) && !existingContent) {
                send({ error: "Выберите тему урока или загрузите страницы" });
                controller.close();
                return;
              }
              if ((images?.length ?? 0) > MAX_IMAGES) {
                send({ error: `Слишком много страниц (максимум ${MAX_IMAGES})` });
                controller.close();
                return;
              }
              send({ status: "processing" });

              const systemPrompt = buildSystemPrompt(
                settings,
                images?.length ?? 0,
                refinement,
                existingContent,
              );
              const userContent: Array<Record<string, unknown>> = [
                {
                  type: "text",
                  text: buildGenerationUserMessage(settings, existingContent, refinement),
                },
                ...(images ?? []).map((url) => ({ type: "image_url", image_url: { url } })),
              ];

              const started = Date.now();
              const abort = new AbortController();
              const connectTimer = setTimeout(() => abort.abort(), CONNECT_TIMEOUT_MS);
              const totalTimer = setTimeout(() => abort.abort(), TOTAL_TIMEOUT_MS);

              const aiResponse = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": origin ?? "https://teach-summary.lovable.app",
                  "X-Title": "Konspekt",
                },
                body: JSON.stringify({
                  model: MODEL,
                  stream: true,
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent },
                  ],
                }),
                signal: abort.signal,
              });
              clearTimeout(connectTimer);

              if (!aiResponse.ok || !aiResponse.body) {
                const errText = await aiResponse.text();
                console.error("[summarize] OpenRouter error", aiResponse.status, errText);
                send({ error: `Ошибка AI (${aiResponse.status}). Попробуйте снова.` });
                clearTimeout(totalTimer);
                controller.close();
                return;
              }

              const reader = aiResponse.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              while (true) {
                if (Date.now() - started > TOTAL_TIMEOUT_MS) {
                  send({ error: "Превышено время ожидания" });
                  break;
                }
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
                    if (delta) send({ content: delta });
                  } catch {
                    /* skip */
                  }
                }
              }
              send({ done: true });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              clearTimeout(totalTimer);
              controller.close();
            } catch (e) {
              const message = e instanceof Error ? e.message : "Ошибка генерации";
              send({
                error: /abort/i.test(message)
                  ? "Не удалось дождаться ответа AI. Попробуйте включить сильное сжатие, уменьшить число страниц или убрать тяжёлые цветные изображения."
                  : message,
              });
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
