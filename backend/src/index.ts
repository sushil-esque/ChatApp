import app from "./app.js";
import config from "./config/config.js";
import http from "http";
import { initSocket } from "./socket.js";
const port = config.port;

const server = http.createServer(app);

//init socket
initSocket(server);


//increase timeout
server.keepAliveTimeout = 65000
server.headersTimeout = 66000

app.get("/", (req, res) => {
  res.send("Hello World");
});
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
