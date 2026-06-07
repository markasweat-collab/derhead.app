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
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!(form instanceof HTMLFormElement)) return;

      const emailInput = form.querySelector('input[name="email"]');
      const honeypot = form.querySelector('input[name="company"]');
      const status = form.querySelector(".form-status");
      const submitButton = form.querySelector('button[type="submit"]');

      const email =
        emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
      if (!email) return;

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }

      if (status instanceof HTMLElement) {
        status.hidden = true;
        status.textContent = "";
        status.classList.remove("form-status--error", "form-status--success");
      }

      try {
        const response = await fetch("/api/v1/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            company:
              honeypot instanceof HTMLInputElement ? honeypot.value : "",
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not join waitlist");
        }

        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.classList.add("form-status--success");
          status.textContent =
            payload.message ?? "You're on the list. We'll be in touch.";
        }

        form.reset();
      } catch (error) {
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.classList.add("form-status--error");
          status.textContent =
            error instanceof Error
              ? error.message
              : "Something went wrong. Try again.";
        }
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
        }
      }
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
})();
