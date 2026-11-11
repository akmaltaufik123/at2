(function () {
  var header = document.querySelector("[data-responsive-nav]");
  if (!header) return;

  var button = header.querySelector(".nav-toggle");
  var menu = document.getElementById(button.getAttribute("aria-controls"));
  var smallScreen = window.matchMedia("(max-width: 1200px)");

  function setOpen(open) {
    button.setAttribute("aria-expanded", String(open));
  }

  function isOpen() {
    return smallScreen.matches && button.getAttribute("aria-expanded") === "true";
  }

  button.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  document.addEventListener("click", function (event) {
    if (!isOpen()) return;
    if (!header.contains(event.target) || event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });

  smallScreen.addEventListener("change", function () {
    setOpen(false);
    if (smallScreen.matches && menu.contains(document.activeElement)) {
      button.focus();
    }
  });

  header.classList.add("nav-ready");
})();
