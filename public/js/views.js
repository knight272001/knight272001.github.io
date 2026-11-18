(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.document) api.start(root.document, root.fetch.bind(root), root.location);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var endpoint = "https://silverrebel71.goatcounter.com/counter/";

  function parseViewCount(value) {
    if (typeof value !== "string") return null;
    var digits = value.replace(/[\s,]/g, "");
    if (!/^\d+$/.test(digits)) return null;
    return digits;
  }

  function counterUrl(path) {
    return endpoint + encodeURIComponent(path) + ".json";
  }

  function show(el, count) {
    var slot = el.querySelector("[data-views-count]");
    if (!slot) return;
    slot.textContent = count;
    el.hidden = false;
  }

  function start(doc, fetchImpl, loc) {
    if (!doc || !fetchImpl) return;
    var nodes = doc.querySelectorAll("[data-views]");
    Array.prototype.forEach.call(nodes, function (el) {
      var kind = el.getAttribute("data-views");
      var path = kind === "total" ? "TOTAL" : loc && loc.pathname;
      if (!path) return;
      fetchImpl(counterUrl(path), { credentials: "omit" })
        .then(function (response) {
          if (!response || !response.ok) throw new Error("no count");
          return response.json();
        })
        .then(function (data) {
          var count = parseViewCount(data && data.count);
          if (count == null) return;
          show(el, count);
        })
        .catch(function () {});
    });
  }

  return {
    parseViewCount: parseViewCount,
    counterUrl: counterUrl,
    start: start,
  };
});
