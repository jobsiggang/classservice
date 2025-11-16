import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fairproject';
  
  if (!client) {
    // Railway 및 프로덕션 환경을 위한 MongoDB 연결 옵션
    const options: any = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    };

    // MongoDB Atlas (mongodb+srv://) 사용 시 TLS 자동 활성화
    if (uri.startsWith('mongodb+srv://')) {
      // TLS는 자동으로 활성화되므로 명시적 설정 불필요
      // Railway 환경에서는 기본 TLS 설정 사용
    } else if (uri.startsWith('mongodb://') && process.env.NODE_ENV === 'production') {
      // 프로덕션 환경에서 일반 mongodb:// URI 사용 시만 TLS 활성화
      options.tls = true;
    }

    client = new MongoClient(uri, options);
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
