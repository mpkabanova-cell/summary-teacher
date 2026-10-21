import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = (await request.json()) as { rating?: unknown; message?: unknown };
          const rating = Number(payload.rating);
          const message = String(payload.message ?? "").slice(0, 4000);
          console.log("[feedback]", JSON.stringify({ rating, message }));
          return Response.json({ ok: true });
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
      },
    },
  },
});
