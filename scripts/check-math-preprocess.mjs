import { createServer } from "vite";

const cases = [
  {
    name: "rational exponent uses frac",
    input: "$3^{5/4} : 3^{1/4} = 3^{(5/4)-(1/4)}$",
    expected:
      "$3^{\\frac{5}{4}} : 3^{\\frac{1}{4}} = 3^{(\\frac{5}{4})-(\\frac{1}{4})}$",
  },
];

const server = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const { preprocessSummaryContent } = await server.ssrLoadModule(
    "/src/lib/math-preprocess.ts",
  );

  for (const item of cases) {
    const actual = preprocessSummaryContent(item.input);
    if (actual !== item.expected) {
      throw new Error(
        `${item.name}: unexpected preprocessing\nExpected:\n${item.expected}\nActual:\n${actual}`,
      );
    }
  }

  console.log(`Math preprocess checks passed (${cases.length} cases).`);
} finally {
  await server.close();
}
