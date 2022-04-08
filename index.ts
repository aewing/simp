import qs from "querystring";
import { parse } from "url";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

const { path } = import.meta;

const mime = {
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

const routeDir = "./routes";
const templateDir = "./templates";

Bun.serve({
  port: 3000,
  async fetch(request: Request) {
    const { url, headers, json } = request;
    const { pathname, query, hash } = parse(url);
    const params = qs.parse(query);

    console.info(`${request.method} ${pathname}`);

    const reply = (
      response,
      contentType = "text/html",
      code = 200,
      headers = {}
    ) => {
      const res = new Response(response, {
        headers: {
          "Content-Type": contentType,
          ...headers,
        },
        status: code,
      });
      return res;
    };

    const endpoint = async (pathname, req) => {
      // Backend route
      const fullPath = join(routeDir, `${pathname}.ts`);
      let route = false;
      if (existsSync(fullPath)) {
        route = await import(`./${fullPath}`);
      } else {
        const parts = pathname.split("/").slice(0, -1);
        while (!route && parts.length) {
          const testPath = join(routeDir, parts.join("/"), "[slug].json.ts");
          if (existsSync(testPath)) {
            route = await import(`./${testPath}`);
          } else {
            parts.pop();
          }
        }
      }

      if (route[req.method.toLowerCase()]) {
        return route[req.method.toLowerCase()](req);
      }

      return { status: 404, body: { error: "Not Found" } };
    };

    const [_, basePath] = pathname.split("/");
    const ext = pathname.indexOf(".") !== -1 ? pathname.split(".").pop() : null;

    if (["assets", "templates"].includes(basePath)) {
      return new Response(Bun.file(`./${pathname.substring(1)}`));
    }

    if (ext === "json") {
      const {
        status = 200,
        body = {},
        headers = {},
      } = await endpoint(pathname, request);
      return reply(JSON.stringify(body), "application/json", status, headers);
    } else if (ext && ext !== "html") {
      return reply("Not Found", "text/html", 404);
    }

    // Frontend route
    const metadata = { data: {}, path: undefined, match: undefined };
    let response = "";

    const fullPath = join(
      routeDir,
      `${pathname}${pathname.substr(-1, 1) === "/" ? "index" : ""}${".html"}`
    );
    if (existsSync(fullPath)) {
      metadata.path = fullPath;
      response = readFileSync(fullPath, "utf-8").replace("%slug%", "index");
    } else {
      const parts = pathname.split("/");
      const match = [];
      while (!response && parts.length) {
        const testPath = join(routeDir, parts.join("/"), "[slug].html");
        if (existsSync(testPath)) {
          metadata.path = join(parts.join("/"), "[slug].html");
          metadata.match = match.reverse().join("/");
          response = readFileSync(testPath, "utf-8").replace(
            /%slug%/g,
            match.join("/")
          );
        } else {
          match.push(parts.pop());
        }
      }
    }

    // Load templates
    response = response.replace(
      /<!-- @template (.*) -->/g,
      (full, template) => {
        const templatePath = join(templateDir, `${template}${".html"}`);
        if (existsSync(templatePath)) {
          return readFileSync(templatePath, "utf-8");
        }
        return "";
      }
    );

    // Preload data
    const dataPromises = [];
    response.replace(
      /<!-- @data ([a-zA-Z]+) (.*) -->/g,
      (full, name, pathname) => {
        dataPromises.push(
          endpoint(pathname, {
            method: "GET",
            body: {},
            headers: {},
          }).then(({ body }) => [name, body])
        );
        return "";
      }
    );

    await Promise.all(dataPromises).then((results) =>
      results.map(([name, data]) => {
        metadata.data[name] = data;
      })
    );

    response = response.replace(/{{(.*)}}/g, (full, key) => {
      return get(metadata.data, key.trim());
    });

    if (response) {
      const layout = readFileSync("layout.html", "utf8");
      response = layout
        .replace("%body%", response)
        .replace(
          "%head%",
          `<script>window.route = ${JSON.stringify(metadata)}</script>`
        )
        .replace("%title%", "");
      return reply(response, "text/html", 200);
    }

    return reply("Not Found", "text/html", 404);
  },
});

function get(obj, key, fallback = "") {
  return key
    .replace(/\[/g, ".")
    .replace(/]/g, "")
    .split(".")
    .filter(Boolean)
    .every((step) => !(step && (obj = obj[step]) === undefined))
    ? obj
    : fallback;
}
