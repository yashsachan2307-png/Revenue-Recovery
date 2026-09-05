import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { apiRouter } from "./api/routes";
import { initDb } from "./database";
import { SchedulerService } from "./services/SchedulerService";

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs in demo
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '1mb' }));

// Initialize DB schema (if not exists)
initDb();

// Start background scheduler
SchedulerService.start(10000);

import path from 'path';
import { db } from './database';
import { seedDatabase } from './database/seed';

// Check if database needs seeding (for ephemeral deployments)
try {
  const row = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (row.count === 0) {
    console.log('Database appears empty. Seeding synthetic data...');
    seedDatabase();
  }
} catch (e) {
  console.log('Error checking database state, might need initialization.');
}

app.use("/api", apiLimiter, apiRouter);

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
