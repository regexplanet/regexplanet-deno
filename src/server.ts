// deno-lint-ignore-file require-await
import { runTest, type TestInput } from "@regexplanet/common";

async function serveStaticFile(
  path: string,
  contentType: string,
) {
  const data = await Deno.readFile(path);
  return async (_req: Request):Promise<Response> => {
    return new Response(data, {
      headers: {
        "content-type": contentType,
      },
    });
  };
}

const routeMap: Map<string, (req: Request) => Promise<Response>> = new Map([
    ["/", root],
            ["/robots.txt", await serveStaticFile("static/robots.txt", "text/css")],
        [
            "/favicon.ico",
            await serveStaticFile("static/favicon.ico", "image/x-icon"),
        ],
        [
            "/favicon.svg",
            await serveStaticFile("static/favicon.svg", "image/svg+xml"),
        ],
        ["/status.json", status],

    ["/test.json", testJson],
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Max-Age": "604800",
    },
  });
}

async function handler(req: Request) {
  const url = new URL(req.url, `http://${req.headers.get("host")}`);
  const path = url.pathname;
  const fn = routeMap.get(path);
  if (fn) {
    return fn(req);
  }
  console.log(`WARNING: Not Found: ${path}`);
  if (path.endsWith(".json")) {
    return handleJsonp(req, {
        success: false,
        code: "ENOTFOUND",
        message: "404 File not found" ,
        statusCode: 404,
        path,
    });
  }
  return new Response(`404: ${path} not found`, { status: 404 });
}

async function root(_req: Request): Promise<Response> {
  return new Response(`Running Deno v${Deno.version.deno}`);
}

async function status(req: Request): Promise<Response> {
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

async function testJson(req: Request) {
  let testInput: TestInput;

  if (req.method === "POST") {
      if (req.headers.get("content-type") === "application/json") {
          testInput = await req.json();
      } else {
          const data = await req.formData();
          console.log("formData", data);

          testInput = {
              engine: "deno",
              regex: data.get("regex") as string,
              replacement: data.get("replacement") as string,
              options: data.getAll("option") as string[],
              inputs: data.getAll("input") as string[],
          };
      }
  } else {
      const searchParams = new URL(req.url).searchParams;
      testInput = {
          engine: searchParams.get("engine") || "deno",
          regex: searchParams.get("regex") || "",
          replacement: searchParams.get("replacement") || "",
          options: searchParams.getAll("option") as string[],
          inputs: searchParams.getAll("input") as string[],
      };
      console.log("searchParams", searchParams);
  }

  console.log("testInput", testInput);

  const retVal = await runTest(testInput);

  console.log("testOutput", retVal);

  return handleJsonp(req, retVal);
}

function main() {
  const port = parseInt(Deno.env.get("PORT") || "5000");
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
