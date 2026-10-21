import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import "katex/dist/katex.min.css";

const KonspektApp = lazy(() => import("@/app/KonspektApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Конспект — материалы к урокам математики" },
      {
        name: "description",
        content: "Опорные конспекты, памятки, домашние задания и повторение по темам математики 6 класса в соответствии со школьной программой РФ.",
      },
      { property: "og:title", content: "Конспект — материалы к урокам математики" },
      {
        property: "og:description",
        content: "Полный комплект материалов по теме математики 6 класса с формулами Word и настройками перегенерации.",
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
