/**
 * Returns the `k` most frequent words in `text`, most frequent first, as
 * `[word, count]` pairs.
 *
 * A word is a run of the letters a to z. Words are compared ignoring case and
 * returned in lowercase. Ties are broken alphabetically.
 */
export function topWords(text, k) {
  const counts = new Map();
  for (const word of tokenize(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts].sort(byCountThenWord).slice(0, k);
}

function tokenize(text) {
  return text
    .split(/[^a-z]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
}

function byCountThenWord([wordA, countA], [wordB, countB]) {
  if (countA !== countB) {
    return countB - countA;
  }
  return wordA < wordB ? -1 : wordA > wordB ? 1 : 0;
}
