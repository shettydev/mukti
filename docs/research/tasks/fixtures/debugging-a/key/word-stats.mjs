/**
 * Reference solution. Normalise case before splitting, so capital letters are
 * part of words rather than separators.
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
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 0);
}

function byCountThenWord([wordA, countA], [wordB, countB]) {
  if (countA !== countB) {
    return countB - countA;
  }
  return wordA < wordB ? -1 : wordA > wordB ? 1 : 0;
}
