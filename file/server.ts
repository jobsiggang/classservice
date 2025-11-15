// File Service Server
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import fileRoutes from './index';
import { errorHandler } from '../shared/middleware/errorHandler';
import { connectDB } from '../shared/utils/mongodb';

dotenv.config();

const app = express();
const PORT = process.env.FILE_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'File Service' });
});

app.use('/api/file', fileRoutes);

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`📁 File Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start File Service:', error);
    process.exit(1);
  }
};

startServer();

export default app;
