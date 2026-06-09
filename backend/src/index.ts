import express from "express";
import config from "./config/config.js";
import app from "./app.js";
const port = config.port;

app.get("/", (req, res) => {
  res.send("Hello World");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
