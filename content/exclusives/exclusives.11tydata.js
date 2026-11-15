const { isHidden, publicSlug, validatePost } = require("../../lib/posts");

module.exports = {
  layout: "post.njk",
  eleventyComputed: {
    kind: () => "exclusive",
    section: () => "exclusives",
    kicker: () => "長文",
    kickerEn: () => "Exclusive",
    backLabel: () => "全部長文",
  },
  permalink(data) {
    validatePost(data);
    if (isHidden(data)) return false;
    return `/exclusives/${publicSlug(data)}/`;
  },
};
