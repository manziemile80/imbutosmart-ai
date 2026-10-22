// Keeps only the parts of an answer that quote figures the digest actually
// holds. A model asked to write a plan will sometimes add an application rate,
// a spacing or a price that is nowhere in the data, and a farmer may act on
// it. Those sentences are dropped; the rest of the answer is kept.

const LIST_MARKER = /^\s*(?:[-*•]|\d+[.)])\s*/;

function allowedNumbers(digest: string): Set<string> {
  const allowed = new Set<string>();
  const add = (raw: string) => {
    allowed.add(raw);
    allowed.add(raw.replace(",", "."));
    const numeric = Number(raw.replace(",", "."));
    if (!Number.isFinite(numeric)) return;
    allowed.add(String(Math.round(numeric * 100)));
    allowed.add(String(Math.round(numeric / 100)));
    allowed.add(numeric.toFixed(2));
  };
  for (const raw of digest.match(/\d+(?:[.,]\d+)?/g) ?? []) add(raw);
  return allowed;
}

export function groundToDigest(answer: string, digest: string): string {
  if (!answer.trim()) return answer;
  const allowed = allowedNumbers(digest);
  const kept = answer
    .split("\n")
    .map((line) => line.replace(LIST_MARKER, "").trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => {
      const numbers = line.match(/\d+(?:[.,]\d+)?/g) ?? [];
      return numbers.every(
        (number) => allowed.has(number) || allowed.has(number.replace(",", ".")),
      );
    });
  return kept.join("\n");
}
