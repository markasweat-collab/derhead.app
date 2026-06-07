type Env = {
  ASSETS: Fetcher;
  API_ORIGIN?: string;
};

const DEFAULT_API_ORIGIN = "https://derhead-api.mark-a-sweat.workers.dev";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.derhead.app") {
      url.hostname = "derhead.app";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith("/api/")) {
      return proxyApiRequest(request, url, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function proxyApiRequest(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const apiPath = url.pathname.slice("/api".length) || "/";
  const allowed =
    apiPath === "/health" ||
    apiPath.startsWith("/v1/waitlist") ||
    apiPath.startsWith("/v1/status") ||
    apiPath.startsWith("/v1/info") ||
    apiPath.startsWith("/v1/services");

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = env.API_ORIGIN ?? DEFAULT_API_ORIGIN;
  const target = new URL(apiPath + url.search, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");

  return fetch(target.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });
}
