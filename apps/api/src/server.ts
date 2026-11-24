import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app.js";

const port = Number(process.env.PORT || 4000);
const httpServer = createServer(app);
new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true } });

httpServer.listen(port, () => console.log(`ProjectProof API listening on http://localhost:${port}`));
