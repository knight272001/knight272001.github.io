(function () {
  var root = document.documentElement;
  var button = document.querySelector("[data-theme-toggle]");
  if (!button) return;

  function preferred() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function current() {
    return root.getAttribute("data-theme") || preferred();
  }

  function paint(theme) {
    var nextLabel = theme === "dark" ? "淺色" : "深色";
    button.textContent = nextLabel;
    button.setAttribute("aria-label", theme === "dark" ? "改用淺色" : "改用深色");

    var metas = document.querySelectorAll('meta[name="theme-color"]');
    metas.forEach(function (meta, index) {
      if (index === 0) {
        meta.removeAttribute("media");
        meta.setAttribute("content", theme === "dark" ? "#141210" : "#f6f1e7");
      } else {
        meta.remove();
      }
    });
  }

  paint(current());

  button.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (error) {}
    paint(next);
  });
})();
