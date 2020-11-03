const http = require("http");
const path = require("path");
const fs = require("fs");
const qs = require("querystring");
const { parse } = require("url");
require("svelte/register");

const mime = {
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

const routeDir = path.join(__dirname, "routes");

const server = http.createServer(async (req, res) => {
  const { pathname, query, hash } = parse(req.url);
  const params = qs.parse(query);

  const reply = (response, contentType = "text/html", code = 200) => {
    res.writeHead(code, { "Content-Type": contentType });
    res.write(response);
    return res.end();
  };

  const endpoint = async (pathname, req) => {
    // Backend route
    const fullPath = path.join(routeDir, `${pathname}.js`);
    let route = false;
    if (fs.existsSync(fullPath)) {
      route = require(fullPath);
    } else {
      const parts = pathname.split("/").slice(0, -1);
      while (!route && parts.length) {
        const testPath = path.join(routeDir, parts.join("/"), "[slug].json.js");
        if (fs.existsSync(testPath)) {
          route = require(testPath);
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

  if (["assets"].includes(basePath)) {
    const filename = path.join(__dirname, pathname);
    if (fs.existsSync(filename)) {
      const response = fs.readFileSync(filename);
      return reply(response, mime[ext] || "text/plain", 200);
    } else {
      return reply(`Not Found: ${filename}`, "text/html", 404);
    }
  }

  if (ext === "json") {
    const { status = 200, body = {}, headers = {} } = await endpoint(
      pathname,
      req
    );
    res.writeHead(status, headers);
    return res.end(JSON.stringify(body));
  } else if (ext && ext !== "html") {
    console.error("Not found:", pathname);
    return reply("Not Found", "text/html", 404);
  }

  let Route;
  let filename;
  const metadata = { data: {}, pathname, slug: null };
  const fullPath = path.join(
    routeDir,
    `${pathname}${pathname.substr(-1, 1) === "/" ? "index" : ""}.svelte`
  );
  if (fs.existsSync(fullPath)) {
    filename = fullPath;
    metadata.slug = "index";
    Route = require(fullPath);
  } else {
    const parts = pathname.split("/");
    const match = [];
    while (!Route && parts.length) {
      const testPath = path.join(routeDir, parts.join("/"), "[slug].svelte");
      if (fs.existsSync(testPath)) {
        filename = testPath;
        metadata.match = match.reverse().join("/");
        metadata.slug = match.join("/");
        Route = require(testPath);
      } else {
        match.push(parts.pop());
      }
    }
  }

  if (!Route) {
    return reply("Not Found", "text/html", 404);
  }

  fetch = (pathname) => ({
    json: () => endpoint(pathname, { method: "GET" }).then((res) => res.body),
  });

  const data = Route.preload
    ? await Route.preload({ pathname, params, query, hash, ...metadata })
    : {};
  const rendered = Route.default.render({
    ...data,
    meta: metadata,
  });

  return reply(
    fs
      .readFileSync("layout.html")
      .toString()
      .replace("%body%", rendered.html)
      .replace(
        "%head%",
        `<style type="text/css">${rendered.css.code}</style> ${rendered.head}`
      )
  );
});
server.listen(process.env.PORT || 3000);
console.log("Simp listening on http://localhost:3000");
