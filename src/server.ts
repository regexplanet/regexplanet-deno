async function serveStaticFile(
  path: string,
  contentType: string,
): Promise<(req: Request) => Response> {
  const data = await Deno.readFile(path);
  return (_req: Request) => {
    return new Response(data, {
      headers: {
        "content-type": contentType,
      },
    });
  };
}

const routeMap = new Map([
  ["/", root],
  ["/robots.txt", await serveStaticFile("static/robots.txt", "text/css")],
  ["/favicon.ico", await serveStaticFile("static/favicon.ico", "image/x-icon")],
  [
    "/favicon.svg",
    await serveStaticFile("static/favicon.svg", "image/svg+xml"),
  ],
  ["/status.json", status],
]);

function handleJsonp(req: Request, data: object): Response {
  const url = new URL(req.url, `http://${req.headers.get("host")}`);
  const str = JSON.stringify(data);
  const callback = url.searchParams.get("callback");
  if (callback && callback != "") {
    return new Response(`${callback}(${JSON.stringify(data)});`, {
      headers: { "content-type": "application/javascript" },
    });
  }
  return new Response(str, {
    headers: {
      "content-type": "application/json",
    },
  });
}

function handler(req: Request): Response {
  const url = new URL(req.url, `http://${req.headers.get("host")}`);
  const path = url.pathname;
  const fn = routeMap.get(path);
  if (fn) {
    return fn(req);
  }
  console.log(`WARNING: Not Found: ${path}`);
  return new Response("Not Found", { status: 404 });
}

function root(_req: Request): Response {
  return new Response("Running!");
}

function status(req: Request): Response {
  const data = {
    success: true,
    version: `${Deno.version.deno} (v8 ${Deno.version.v8})`,
    timestamp: new Date().toISOString(),
    lastmod: Deno.env.get("LASTMOD") || "(not set)",
    commit: Deno.env.get("COMMIT") || "(not set)",
    tech: `Deno ${Deno.version.deno}`,
  };
  return handleJsonp(req, data);
}

function main() {
  const port = parseInt(Deno.env.get("PORT") || "4000");
  const hostname = Deno.env.get("HOSTNAME") || "localhost";

  Deno.addSignalListener("SIGINT", () => {
    console.log("INFO: received SIGINT, stopping");
    Deno.exit();
  });

  Deno.addSignalListener("SIGTERM", () => {
    console.log("INFO: received SIGINT, stopping");
    Deno.exit();
  });

  Deno.serve({
    hostname,
    onListen({ port, hostname }) {
      console.log(`INFO: listening on http://${hostname}:${port}`);
    },
    port,
  }, handler);
}

main();
