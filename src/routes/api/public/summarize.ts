import { createFileRoute } from "@tanstack/react-router";
import { buildBlockSystemPrompt, buildBlockUserMessage } from "@/lib/server/prompt";
import { z } from "zod";
import { canGenerateMaterial } from "@/lib/lesson-directory";
import { MATERIAL_BLOCK_ORDER, MATERIAL_SECTIONS } from "@/lib/summary-types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-3.1-flash-lite";
const CONNECT_TIMEOUT_MS = 30_000;
const BLOCK_TIMEOUT_MS = 180_000;
const TOTAL_TIMEOUT_MS = 480_000;

const BLOCK_IDS = MATERIAL_SECTIONS.map((s) => s.id) as [string, ...string[]];

const requestSchema = z.object({
  images: z.array(z.never()).max(0).optional(),
  settings: z.object({
    format: z.literal("bundle"),
    detail: z.enum(["brief", "medium", "detailed"]),
    level: z.enum(["simple", "study", "deep"]),
    focus: z.string().max(2000),
    lessonNumber: z.number().int().min(1).max(300).optional(),
    courseId: z.string().regex(/^[a-z]+-\d{1,2}$/).optional(),
  }),
  block: z.enum(BLOCK_IDS).optional(),
  existingBlocks: z.record(z.enum(BLOCK_IDS), z.string().max(100_000)).optional(),
  blockRequest: z.string().max(2000).optional(),
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
              const { settings, block, existingBlocks } = body;
              if (!canGenerateMaterial(0, settings.lessonNumber, settings.courseId)) {
                send({ error: "Выберите тему урока" });
                controller.close();
                return;
              }
              send({ status: "processing" });

              const started = Date.now();

              /** Генерирует один блок, стримит дельты и возвращает полный текст. */
              const generateBlock = async (
                blockId: string,
                contextBlocks: Record<string, string>,
              ): Promise<string> => {
                send({ blockStart: blockId });
                const abort = new AbortController();
                const connectTimer = setTimeout(() => abort.abort(), CONNECT_TIMEOUT_MS);
                const blockTimer = setTimeout(() => abort.abort(), BLOCK_TIMEOUT_MS);

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
                      { role: "system", content: buildBlockSystemPrompt(settings, blockId) },
                      {
                        role: "user",
                        content: [
                          {
                            type: "text",
                            text: buildBlockUserMessage(settings, blockId, contextBlocks),
                          },
                        ],
                      },
                    ],
                  }),
                  signal: abort.signal,
                });
                clearTimeout(connectTimer);

                if (!aiResponse.ok || !aiResponse.body) {
                  const errText = await aiResponse.text();
                  console.error("[summarize] OpenRouter error", aiResponse.status, errText);
                  clearTimeout(blockTimer);
                  throw new Error(`Ошибка AI (${aiResponse.status}). Попробуйте снова.`);
                }

                const reader = aiResponse.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let text = "";
                while (true) {
                  if (Date.now() - started > TOTAL_TIMEOUT_MS) {
                    throw new Error("Превышено время ожидания");
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
                      if (delta) {
                        text += delta;
                        send({ block: blockId, content: delta });
                      }
                    } catch {
                      /* skip */
                    }
                  }
                }
                clearTimeout(blockTimer);
                send({ blockDone: blockId });
                return text;
              };

              if (block) {
                // Перегенерация одного блока: остальные передаются как контекст.
                const context: Record<string, string> = {};
                for (const [id, text] of Object.entries(existingBlocks ?? {})) {
                  if (id !== block && text) context[id] = text;
                }
                await generateBlock(block, context);
              } else {
                // Полный комплект: конспект → памятка → повторение → пример ДЗ,
                // каждый следующий блок получает предыдущие как контекст.
                const generated: Record<string, string> = {};
                for (const blockId of MATERIAL_BLOCK_ORDER) {
                  generated[blockId] = await generateBlock(blockId, { ...generated });
                }
              }

              send({ done: true });
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (e) {
              const message = e instanceof Error ? e.message : "Ошибка генерации";
              send({
                error: /abort/i.test(message)
                  ? "Не удалось дождаться ответа AI. Повторите запрос позже."
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
