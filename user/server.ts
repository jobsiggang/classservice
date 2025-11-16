// User Service Server
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './index';
import { errorHandler } from '../shared/middleware/errorHandler';
import { connectDB } from '../shared/utils/mongodb';

dotenv.config();

const app = express();
const PORT = process.env.USER_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:3000'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'User Service' });
});

app.use('/api/user', userRoutes);

// Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`👥 User Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start User Service:', error);
    process.exit(1);
  }
};

startServer();

export default app;
