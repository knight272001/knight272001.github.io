const { isHidden, publicSlug, validatePost } = require("../../lib/posts");

module.exports = {
  layout: "post.njk",
  eleventyComputed: {
    kind: () => "digest",
    section: () => "digests",
    kicker: () => "每日 Digest",
    kickerEn: () => "",
    backLabel: () => "全部 Digest",
  },
  permalink(data) {
    validatePost(data);
    if (isHidden(data)) return false;
    return `/digests/${publicSlug(data)}/`;
  },
};
