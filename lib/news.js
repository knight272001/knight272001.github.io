// Daily news lives in src/_data/news/YYYY-MM-DD.json:
//   { "date": "YYYY-MM-DD", "items": [{ "category", "title", "source", "url" }] }
// Files are create-only. Pages and the homepage link read this directory at build time.

const fs = require("fs");
const path = require("path");

const NEWS_DIR = path.join(__dirname, "..", "src", "_data", "news");

function newsGroups(items) {
  const groups = [];
  const byCategory = new Map();
  for (const item of items) {
    let group = byCategory.get(item.category);
    if (!group) {
      group = { category: item.category, items: [] };
      byCategory.set(item.category, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

function loadNewsDays(directory = NEWS_DIR) {
  if (!fs.existsSync(directory)) return [];

  const days = [];
  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith(".json")) continue;
    const fileDate = name.slice(0, -".json".length);
    const filePath = path.join(directory, name);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`${filePath} 不是合法的 JSON：${error.message}`);
    }
    if (!raw || raw.date !== fileDate || !Array.isArray(raw.items)) {
      throw new Error(`${filePath} 必須是 { "date": "${fileDate}", "items": [...] }`);
    }
    raw.items.forEach((item, index) => {
      const ok =
        item &&
        typeof item.category === "string" &&
        item.category.trim() !== "" &&
        typeof item.title === "string" &&
        item.title.trim() !== "" &&
        typeof item.source === "string" &&
        item.source.trim() !== "" &&
        typeof item.url === "string" &&
        item.url.trim() !== "";
      if (!ok) {
        throw new Error(`${filePath} 的第 ${index + 1} 則缺少 category、title、source 或 url`);
      }
    });
    days.push({
      date: raw.date,
      items: raw.items,
      groups: newsGroups(raw.items),
    });
  }

  days.sort((a, b) => b.date.localeCompare(a.date));
  return days;
}

module.exports = {
  NEWS_DIR,
  newsGroups,
  loadNewsDays,
};
