/**
 * Shared site chrome — keep nav/footer in sync across pages.
 */
(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      siteNav.classList.toggle("is-open", !isOpen);
    });

    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
      });
    });
  }

  document.querySelectorAll(".waitlist-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = form.querySelector('input[type="email"]')?.value;
      if (!email) return;

      const subject = encodeURIComponent("Waitlist request");
      const body = encodeURIComponent(
        `Please add me to the derhead.app waitlist.\n\nEmail: ${email}`,
      );
      window.location.href = `mailto:hello@derhead.app?subject=${subject}&body=${body}`;
    });
  });

  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      item?.classList.toggle("is-open", !expanded);
    });
  });

  const loginView = document.getElementById("login-view");
  const dashboardPreview = document.getElementById("dashboard-preview");
  if (
    loginView &&
    dashboardPreview &&
    new URLSearchParams(location.search).get("preview") === "1"
  ) {
    loginView.hidden = true;
    dashboardPreview.hidden = false;
  }
})();
