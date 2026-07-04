const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  ResourceNotFoundError,
  ValidationError,
  createSeriesStore,
  isSafeId
} = require("./series-store");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "dist");
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const store = createSeriesStore({ dataDir: DATA_DIR });

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message, details) {
  sendJson(res, statusCode, { error: message, details });
}

async function readRequestBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new ValidationError("Request body is too large");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

async function handleApi(req, res, url) {
  const method = req.method || "GET";
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (method === "GET" && url.pathname === "/api/series") {
      return sendJson(res, 200, { series: await store.listSeries() });
    }

    if (method === "POST" && url.pathname === "/api/series") {
      return sendJson(res, 201, { series: await store.createSeries(await readRequestBody(req)) });
    }

    if (method === "POST" && url.pathname === "/api/series/import") {
      return sendJson(res, 201, { series: await store.importSeries(await readRequestBody(req)) });
    }

    if (parts.length >= 3 && parts[0] === "api" && parts[1] === "series") {
      const id = parts[2];
      if (!isSafeId(id)) {
        return sendError(res, 400, "Invalid series id");
      }

      if (method === "GET" && parts.length === 3) {
        return sendJson(res, 200, { series: await store.getSeries(id) });
      }

      if (method === "POST" && parts.length === 4 && parts[3] === "categories") {
        return sendJson(res, 201, await store.addCategory(id, await readRequestBody(req)));
      }

      if (method === "PATCH" && parts.length === 5 && parts[3] === "categories") {
        return sendJson(res, 200, await store.updateCategory(id, parts[4], await readRequestBody(req)));
      }

      if (method === "DELETE" && parts.length === 5 && parts[3] === "categories") {
        return sendJson(res, 200, await store.deleteCategory(id, parts[4]));
      }

      if (method === "POST" && parts.length === 4 && parts[3] === "entries") {
        return sendJson(res, 201, await store.addEntry(id, await readRequestBody(req)));
      }

      if (method === "DELETE" && parts.length === 5 && parts[3] === "entries") {
        return sendJson(res, 200, await store.deleteEntry(id, parts[4]));
      }

      if (method === "POST" && parts.length === 4 && parts[3] === "water-usage") {
        return sendJson(res, 201, await store.addWaterUsage(id, await readRequestBody(req)));
      }
    }

    return sendError(res, 404, "Route not found");
  } catch (error) {
    if (error instanceof ValidationError) {
      const status = /already exists/.test(error.message) ? 409 : 400;
      return sendError(res, status, error.message, error.details);
    }
    if (error instanceof ResourceNotFoundError || error.code === "ENOENT") {
      return sendError(res, 404, error.message || "Resource not found");
    }
    console.error(error);
    return sendError(res, 500, "Unexpected server error");
  }
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendError(res, 405, "Method not allowed");
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  const relative = path.relative(PUBLIC_DIR, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return sendError(res, 403, "Forbidden");
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(req.method === "HEAD" ? undefined : file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendError(
        res,
        404,
        "Frontend build was not found. Run npm run build, or use npm run dev for development."
      );
    }
    throw error;
  }
}

store
  .ensureDirectories()
  .then(() => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) {
        handleApi(req, res, url);
        return;
      }
      serveStatic(req, res, url).catch((error) => {
        console.error(error);
        sendError(res, 500, "Unexpected server error");
      });
    });

    server.listen(PORT, HOST, () => {
      console.log(`Harvest tracker API running at http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
