import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

function safePath(urlPath) {
  const requested = urlPath === "/" ? "/web/index.html" : urlPath;
  const relative = normalize(decodeURIComponent(requested)).replace(/^([.][.][/\\])+/, "");
  const absolute = join(root, relative);
  return absolute.startsWith(root) ? absolute : null;
}
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    const path = safePath(pathname);
    if (!path || !(await stat(path)).isFile()) throw new Error("not-found");
    const body = await readFile(path);
    response.writeHead(200, {
      "content-type": types.get(extname(path)) ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Representation Router playground: http://127.0.0.1:${port}/`);
});
