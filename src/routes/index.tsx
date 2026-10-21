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
        content: "Выберите тему математики 6 класса или загрузите страницы учебника и получите конспект по школьной программе РФ.",
      },
      { property: "og:title", content: "Конспект — AI-помощник для учебников" },
      {
        property: "og:description",
        content: "Конспекты по темам математики 6 класса и страницам учебников, с формулами и выбором уровня объяснения.",
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
