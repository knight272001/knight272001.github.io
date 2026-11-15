const fs = require("fs");
const path = require("path");

const SLUG = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

function normalizeSlug(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return typeof value === "string" ? value.trim() : value;
}

let matter;

function loadMatter() {
  if (matter) return matter;
  try {
    matter = require("gray-matter");
  } catch {
    const { createRequire } = require("module");
    matter = createRequire(require.resolve("@11ty/eleventy"))("gray-matter");
  }
  return matter;
}

function readRaw(inputPath) {
  const parse = loadMatter();
  try {
    return parse(fs.readFileSync(inputPath, "utf8")).data;
  } catch (error) {
    throw new Error(`${inputPath} 的 frontmatter 解析失敗：${error.message}`);
  }
}

function membersState(value, source) {
  if (value === undefined || value === false) return "public";
  if (value === true) return "hidden";
  throw new Error(`${source} 的 members 只能寫 true 或 false，不要加引號`);
}

function isDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isTagList(tags) {
  if (tags == null) return false;
  if (typeof tags === "string") return tags.trim() !== "";
  return Array.isArray(tags) && tags.every((tag) => typeof tag === "string" && tag.trim() !== "");
}

function assertNoEscapedQuotes(inputPath) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!front) {
    throw new Error(`${inputPath} 缺少 frontmatter`);
  }
  if (front[1].includes('\\"')) {
    throw new Error(
      `${inputPath} 的 frontmatter 含有 \\"。雙引號請放進單引號裡，例如 title: '他說 "不"'`
    );
  }
}

function fieldsFor(data) {
  const inputPath = data.page?.inputPath || (data.inputPath && fs.existsSync(data.inputPath) ? data.inputPath : "");
  if (inputPath && fs.existsSync(inputPath)) return readRaw(inputPath);
  return data.data || data;
}

function validateParsed(fields, source) {
  membersState(fields.members, source);

  for (const key of ["title", "excerpt"]) {
    if (typeof fields[key] !== "string" || fields[key].trim() === "") {
      throw new Error(`${source} 缺少 frontmatter：${key}`);
    }
  }

  const slug = normalizeSlug(fields.slug);
  if (typeof slug !== "string" || slug === "" || !SLUG.test(slug)) {
    throw new Error(`${source} 的 slug 只能用英數和連字號，現在是「${fields.slug}」`);
  }

  if (!isDate(fields.date)) {
    throw new Error(`${source} 的 date 請用 YYYY-MM-DD`);
  }

  if (!isTagList(fields.tags)) {
    throw new Error(`${source} 的 tags 請寫成清單`);
  }

  if (typeof source === "string" && source.endsWith(".md")) {
    const base = path.basename(source, ".md");
    if (base !== slug) {
      throw new Error(`${source} 檔名要和 slug 相同，現在 slug 是「${slug}」`);
    }
  }
}

function validatePost(data) {
  const inputPath = data.page?.inputPath;
  if (inputPath) assertNoEscapedQuotes(inputPath);
  const fields = fieldsFor(data);
  validateParsed(fields, inputPath || data.slug || "文章");
}

function isHidden(data) {
  const fields = fieldsFor(data);
  const source = data.page?.inputPath || data.inputPath || data.slug || "文章";
  return membersState(fields.members, source) === "hidden";
}

function isContentMarkdown(inputPath) {
  return /(?:^|\/)content\/(?:exclusives|digests)\/[^/]+\.md$/.test(
    String(inputPath || "").replaceAll("\\", "/")
  );
}

function byDateDesc(a, b) {
  const delta = new Date(b.date).getTime() - new Date(a.date).getTime();
  if (delta !== 0 && !Number.isNaN(delta)) return delta;
  return String(b.inputPath).localeCompare(String(a.inputPath));
}

function onlyPublic(items, { unique = false } = {}) {
  const visible = [];
  const seen = new Map();

  for (const item of items) {
    const fields = fieldsFor(item);
    const source = item.inputPath || "文章";
    if (membersState(fields.members, source) === "hidden") continue;
    if (item.url === false) continue;

    if (unique) {
      const slug = normalizeSlug(fields.slug || item.data?.slug);
      if (seen.has(slug)) {
        throw new Error(`slug「${slug}」重複：\n${seen.get(slug)}\n${item.inputPath}`);
      }
      seen.set(slug, item.inputPath);
    }

    visible.push(item);
  }

  return visible.sort(byDateDesc);
}

function publicSlug(data) {
  return normalizeSlug(fieldsFor(data).slug);
}

module.exports = {
  membersState,
  readRaw,
  validatePost,
  isHidden,
  isContentMarkdown,
  onlyPublic,
  publicSlug,
};
