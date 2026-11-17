const { formatDisplay, formatIso, formatRss } = require("./lib/dates");
const { createMarkdown } = require("./lib/markdown");
const { absoluteUrl, isContentMarkdown, isHidden, onlyPublic, validatePost } = require("./lib/posts");

module.exports = function (eleventyConfig) {
  eleventyConfig.setLibrary("md", createMarkdown());

  // members: true 必須從每個公開出口消失。
  // preprocessor 不處理檔案；permalink false 不寫 HTML；公開集合再濾一次。
  eleventyConfig.addPreprocessor("members-only", "md", (data) => {
    const inputPath = data.page?.inputPath;
    if (!isContentMarkdown(inputPath)) return;
    validatePost(data);
    if (isHidden(data)) return false;
  });

  eleventyConfig.addCollection("publicExclusives", (api) =>
    onlyPublic(api.getFilteredByGlob("content/exclusives/*.md"), { unique: true })
  );

  eleventyConfig.addCollection("publicDigests", (api) =>
    onlyPublic(api.getFilteredByGlob("content/digests/*.md"), { unique: true })
  );

  eleventyConfig.addCollection("publicPosts", (api) =>
    onlyPublic([
      ...api.getFilteredByGlob("content/exclusives/*.md"),
      ...api.getFilteredByGlob("content/digests/*.md"),
    ])
  );

  eleventyConfig.addFilter("displayDate", formatDisplay);
  eleventyConfig.addFilter("isoDate", formatIso);
  eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
  eleventyConfig.addFilter("rssDate", (value) => {
    if (value == null || value === "") return formatRss(new Date());
    return formatRss(value);
  });
  eleventyConfig.addFilter("year", () => String(new Date().getUTCFullYear()));

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({ public: "." });
  eleventyConfig.addWatchTarget("public");
  eleventyConfig.ignores.add("README.md");

  return {
    dir: {
      input: ".",
      includes: "src/_includes",
      data: "src/_data",
      output: "_site",
    },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
};
