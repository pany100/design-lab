import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { handleCreateBooking } from "./bookings/controllers/bookingController.ts";

const PORT = Number(process.env.PORT ?? 3000);

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) return undefined;
  return JSON.parse(raw);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/bookings") {
      const body = await readJsonBody(req);
      const result = await handleCreateBooking(body);
      sendJson(res, result.status, result.body);
      return;
    }
    sendJson(res, 404, { error: "not_found" });
  } catch (err) {
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    console.error(err);
    sendJson(res, 500, { error: "internal_error" });
  }
});

server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
