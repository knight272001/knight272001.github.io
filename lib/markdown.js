const { createRequire } = require("module");

function loadMarkdownIt() {
  const requireFromEleventy = createRequire(require.resolve("@11ty/eleventy"));
  return requireFromEleventy("markdown-it");
}

function soloImage(inline) {
  const children = inline?.children || [];
  const significant = children.filter((token) => {
    if (token.type === "softbreak") return false;
    if (token.type === "text" && token.content.trim() === "") return false;
    return true;
  });
  if (significant.length !== 1 || significant[0].type !== "image") return null;
  return significant[0];
}

function hoistCaptionedImages(state) {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].type !== "paragraph_open") continue;
    const inline = tokens[i + 1];
    const close = tokens[i + 2];
    if (!inline || inline.type !== "inline" || !close || close.type !== "paragraph_close") continue;
    const image = soloImage(inline);
    if (!image) continue;
    const title = image.attrGet("title");
    if (!title || !title.trim()) continue;
    tokens.splice(i, 3, image);
  }
}

function createMarkdown() {
  const MarkdownIt = loadMarkdownIt();
  const md = MarkdownIt({
    html: true,
    breaks: false,
    linkify: false,
    typographer: false,
  });

  md.core.ruler.after("inline", "solo_image_figures", hoistCaptionedImages);

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const caption = (token.attrGet("title") || "").trim();
    const alt = self.renderInlineAsText(token.children || [], options, env);
    const altIndex = token.attrIndex("alt");
    if (altIndex < 0) token.attrPush(["alt", alt]);
    else token.attrs[altIndex][1] = alt;

    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");

    if (caption) {
      const titleIndex = token.attrIndex("title");
      if (titleIndex >= 0) token.attrs.splice(titleIndex, 1);
      const img = `<img${self.renderAttrs(token)}>`;
      return `<figure>${img}<figcaption>${md.utils.escapeHtml(caption)}</figcaption></figure>`;
    }

    return `<img${self.renderAttrs(token)}>`;
  };

  return md;
}

module.exports = {
  createMarkdown,
};
