import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fairproject';
  
  if (!client) {
    client = new MongoClient(uri, {
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    await client.connect();
  }

  const dbName = process.env.DB_NAME || 'fairproject';
  cachedDb = client.db(dbName);

  console.log(`✅ Connected to MongoDB: ${dbName}`);
  
  return cachedDb;
}

export async function getDB(): Promise<Db> {
  if (!cachedDb) {
    return await connectDB();
  }
  return cachedDb;
}

// Vercel Serverless용 함수 (alias)
export const connectToDatabase = connectDB;

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    cachedDb = null;
    console.log('MongoDB connection closed');
  }
}
