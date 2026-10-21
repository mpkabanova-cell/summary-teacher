import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import "katex/dist/katex.min.css";

const KonspektApp = lazy(() => import("@/app/KonspektApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Конспект — AI-помощник для учебников" },
      {
        name: "description",
        content: "Загрузите фото или PDF страниц учебника и получите структурированный конспект на русском.",
      },
      { property: "og:title", content: "Конспект — AI-помощник для учебников" },
      {
        property: "og:description",
        content: "Фото или PDF страниц учебника → структурированный конспект с формулами.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const fallback = <div className="min-h-screen bg-background" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <KonspektApp />
      </Suspense>
    </ClientOnly>
  );
}
