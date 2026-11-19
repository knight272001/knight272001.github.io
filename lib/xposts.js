// src/_data/xposts.json is a JSON array. Each item is:
//   { "id": string, "text": string, "url": "https://…", "created_at": ISO-8601 UTC }
// An empty array renders no ticker. See README「X 貼文跑馬燈」.

const MAX_POSTS = 10;
const MAX_TEXT = 120;
const SEGMENT_CHARS = 72;

function truncate(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join("").trimEnd()}…`;
}

function normalize(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const text = typeof item.text === "string" ? item.text.replace(/\s+/g, " ").trim() : "";
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const created = typeof item.created_at === "string" ? Date.parse(item.created_at) : Number.NaN;
      if (!text || !/^https?:\/\/\S+$/i.test(url) || !Number.isFinite(created)) return null;
      return {
        id: item.id == null ? "" : String(item.id),
        text: truncate(text, MAX_TEXT),
        url,
        created,
        index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.created - a.created || a.index - b.index)
    .slice(0, MAX_POSTS)
    .map(({ id, text, url }) => ({ id, text, url }));
}

function tickerModel(items) {
  const posts = normalize(items);
  if (posts.length === 0) return { posts, segment: [], duration: 0 };

  const chars = posts.reduce((sum, post) => sum + Array.from(post.text).length, 0);
  const repeats = Math.min(6, Math.max(1, Math.ceil(SEGMENT_CHARS / Math.max(chars, 1))));
  const segment = [];
  for (let copy = 0; copy < repeats; copy += 1) {
    for (const post of posts) {
      segment.push({ id: post.id, text: post.text, url: post.url, repeat: copy > 0 });
    }
  }

  const duration = Math.min(120, Math.max(24, Math.round((chars * repeats) / 5)));
  return { posts, segment, duration };
}

module.exports = {
  MAX_POSTS,
  MAX_TEXT,
  tickerModel,
};
