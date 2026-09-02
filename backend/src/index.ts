import express from "express";
import cors from "cors";
import { apiRouter } from "./api/routes";
import { initDb } from "./database";
import { SchedulerService } from "./services/SchedulerService";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize DB schema (if not exists)
initDb();

// Start background scheduler
SchedulerService.start(10000);

app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
