const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const waitlistForm = document.querySelector(".waitlist-form");

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

if (waitlistForm) {
  waitlistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = waitlistForm.querySelector("#email")?.value;
    if (!email) return;

    const subject = encodeURIComponent("Waitlist request");
    const body = encodeURIComponent(`Please add me to the derhead.app waitlist.\n\nEmail: ${email}`);
    window.location.href = `mailto:hello@derhead.app?subject=${subject}&body=${body}`;
  });
}
