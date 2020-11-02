const http = require("http");
const path = require("path");
const fs = require("fs");
const qs = require("querystring");
const { parse } = require("url");

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
const templateDir = path.join(__dirname, "templates");

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
          console.log("Endpoint found", testPath);
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

  if (["assets", "templates"].includes(basePath)) {
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

  // Frontend route
  const metadata = { data: {} };
  let response = false;

  const fullPath = path.join(
    routeDir,
    `${pathname}${pathname.substr(-1, 1) === "/" ? "index" : ""}.html`
  );
  if (fs.existsSync(fullPath)) {
    metadata.path = fullPath;
    response = fs.readFileSync(fullPath).toString().replace("%slug%", "index");
  } else {
    const parts = pathname.split("/");
    const match = [];
    while (!response && parts.length) {
      const testPath = path.join(routeDir, parts.join("/"), "[slug].html");
      if (fs.existsSync(testPath)) {
        metadata.path = path.join(parts.join("/"), "[slug].html");
        metadata.match = match.reverse().join("/");
        response = fs
          .readFileSync(testPath)
          .toString()
          .replace(/%slug%/g, match.join("/"));
      } else {
        match.push(parts.pop());
      }
    }
  }

  // Load templates
  response = response.replace(/<!-- @template (.*) -->/g, (full, template) => {
    const templatePath = path.join(templateDir, `${template}.html`);
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath).toString();
    }
    return "";
  });

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
    response = fs
      .readFileSync(path.join(__dirname, "layout.html"))
      .toString()
      .replace("%body%", response)
      .replace(
        "%head%",
        `<script>window.route = ${JSON.stringify(metadata)}</script>`
      )
      .replace("%title%", "");
    return reply(response);
  }

  return reply("Not Found", "text/html", 404);
});
server.listen(3000);
console.log("Listening");

function get(obj, key, fallback = "") {
  console.log("Getting key", key);
  return key
    .replace(/\[/g, ".")
    .replace(/]/g, "")
    .split(".")
    .filter(Boolean)
    .every((step) => !(step && (obj = obj[step]) === undefined))
    ? obj
    : fallback;
}
