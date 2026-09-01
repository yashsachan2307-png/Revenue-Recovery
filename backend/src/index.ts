import express from "express";
import cors from "cors";
import { router } from "./api/routes";
import { initDb } from "./database";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize DB schema (if not exists)
initDb();

app.use("/api", router);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
