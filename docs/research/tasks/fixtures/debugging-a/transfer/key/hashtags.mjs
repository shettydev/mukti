/** Reference solution. Match case-insensitively, then lowercase the tag. */
export function hashtags(post) {
  const seen = [];
  for (const [, tag] of post.matchAll(/#([a-z]+)/gi)) {
    const lower = tag.toLowerCase();
    if (!seen.includes(lower)) {
      seen.push(lower);
    }
  }
  return seen;
}
