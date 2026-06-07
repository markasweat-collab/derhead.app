/**
 * App dashboard — token auth against /api/v1/* proxy.
 */
(function () {
  const TOKEN_KEY = "derhead.apiToken";
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const signOutButton = document.getElementById("sign-out");
  const servicesBody = document.getElementById("services-body");
  const apiStatus = document.getElementById("api-status");
  const mcpStatus = document.getElementById("mcp-status");
  const tokenStatus = document.getElementById("token-status");
  const serverCount = document.getElementById("server-count");
  const lastCheck = document.getElementById("last-check");

  if (!loginView || !dashboardView) {
    return;
  }

  const previewMode = new URLSearchParams(location.search).get("preview") === "1";

  if (previewMode) {
    showDashboard();
    setPreviewData();
    return;
  }

  const savedToken = sessionStorage.getItem(TOKEN_KEY);
  if (savedToken) {
    validateToken(savedToken).then((valid) => {
      if (valid) {
        showDashboard();
        loadDashboard(savedToken);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    });
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(loginForm instanceof HTMLFormElement)) return;

    const tokenInput = loginForm.querySelector('input[name="token"]');
    const token =
      tokenInput instanceof HTMLInputElement ? tokenInput.value.trim() : "";
    if (!token) return;

    setLoginError("");
    const valid = await validateToken(token);
    if (!valid) {
      setLoginError("Invalid API token. Check the value and try again.");
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, token);
    showDashboard();
    loadDashboard(token);
  });

  signOutButton?.addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    dashboardView.hidden = true;
    loginView.hidden = false;
    if (loginForm instanceof HTMLFormElement) {
      loginForm.reset();
    }
    setLoginError("");
  });

  async function validateToken(token) {
    try {
      const response = await fetch("/api/v1/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function loadDashboard(token) {
    try {
      const [statusResponse, servicesResponse] = await Promise.all([
        fetch("/api/v1/status", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/v1/services", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statusResponse.ok || !servicesResponse.ok) {
        setLoginError("Session expired. Sign in again.");
        sessionStorage.removeItem(TOKEN_KEY);
        dashboardView.hidden = true;
        loginView.hidden = false;
        return;
      }

      const servicesPayload = await servicesResponse.json();
      const services = Array.isArray(servicesPayload.services)
        ? servicesPayload.services
        : [];

      const api = services.find((service) => service.id === "api");
      const mcp = services.find((service) => service.id === "mcp");
      const checkedAt = new Date();

      setMetric(apiStatus, serviceOnlineLabel(api?.status), api?.status === "healthy");
      setMetric(mcpStatus, serviceOnlineLabel(mcp?.status), mcp?.status === "healthy");
      setMetric(tokenStatus, "configured", true);
      setMetric(
        serverCount,
        String(mcp?.status === "healthy" ? 1 : 0),
        mcp?.status === "healthy",
      );
      setMetric(
        lastCheck,
        formatTimestamp(checkedAt),
        true,
        true,
      );

      if (servicesBody) {
        servicesBody.innerHTML = "";
        for (const service of services) {
          const row = document.createElement("tr");
          const pillClass =
            service.status === "healthy"
              ? "status-pill--ok"
              : service.status === "degraded"
                ? "status-pill--warn"
                : "status-pill--locked";
          row.innerHTML = `
            <td>${escapeHtml(service.name)}</td>
            <td>${escapeHtml(service.domain)}</td>
            <td><span class="status-pill ${pillClass}">${escapeHtml(formatStatus(service.status))}</span></td>
            <td>${escapeHtml(service.auth)}</td>
          `;
          servicesBody.appendChild(row);
        }
      }
    } catch {
      setLoginError("Could not load dashboard. Try again in a moment.");
    }
  }

  function serviceOnlineLabel(status) {
    if (status === "healthy") return "online";
    if (status === "degraded") return "degraded";
    return "offline";
  }

  function formatTimestamp(date) {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function setMetric(element, text, ok, muted = false) {
    if (!element) return;
    element.textContent = text;
    element.className = "dashboard-value";
    if (muted) {
      element.classList.add("dashboard-value--muted");
    } else if (ok) {
      element.classList.add("dashboard-value--ok");
    } else {
      element.classList.add("dashboard-value--warn");
    }
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
  }

  function setLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message;
    loginError.hidden = !message;
  }

  function setPreviewData() {
    setMetric(apiStatus, "online", true);
    setMetric(mcpStatus, "online", true);
    setMetric(tokenStatus, "configured", true);
    setMetric(serverCount, "1", true);
    setMetric(lastCheck, formatTimestamp(new Date()), true, true);

    if (servicesBody) {
      servicesBody.innerHTML = `
        <tr><td>derhead-mcp</td><td>mcp.derhead.app</td><td><span class="status-pill status-pill--ok">Healthy</span></td><td>Bearer token</td></tr>
        <tr><td>derhead-api</td><td>api.derhead.app</td><td><span class="status-pill status-pill--ok">Healthy</span></td><td>Bearer token</td></tr>
        <tr><td>derhead-web</td><td>derhead.app</td><td><span class="status-pill status-pill--ok">Healthy</span></td><td>Public (static)</td></tr>
      `;
    }
  }

  function formatStatus(status) {
    if (status === "healthy") return "Healthy";
    if (status === "degraded") return "Degraded";
    return "Unreachable";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
