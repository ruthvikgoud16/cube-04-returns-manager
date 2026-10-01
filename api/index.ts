import type { IncomingMessage, ServerResponse } from "http";
import { createRuntimeApp } from "../src/api/server";

const app = createRuntimeApp();

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await app.ready();
  app.server.emit("request", request, response);
}
