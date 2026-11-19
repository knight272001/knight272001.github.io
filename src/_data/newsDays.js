const { loadNewsDays } = require("../../lib/news");

// Newest day first. The homepage link and /news/ both use newsDays[0].
module.exports = () => loadNewsDays();
