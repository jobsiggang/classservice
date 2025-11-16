import { MongoClient, Db } from 'mongodb';

let cachedDb: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fairproject';
  
  // 디버깅: URI 형식 확인 (비밀번호는 숨김)
  const maskedUri = uri.replace(/:[^:@]+@/, ':****@');
  console.log(`🔗 Connecting to MongoDB: ${maskedUri}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!client) {
    // MongoDB Atlas 전용 연결 옵션
    const options: any = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
    };

    // mongodb+srv는 TLS를 자동으로 활성화하므로 추가 설정 불필요
    console.log(`⚙️  Connection options:`, JSON.stringify(options, null, 2));

    try {
      client = new MongoClient(uri, options);
      console.log(`🔌 Attempting to connect...`);
      await client.connect();
      console.log(`✅ MongoDB client connected successfully`);
    } catch (error) {
      console.error(`❌ MongoDB connection failed:`, error);
      throw error;
    }
  }

  const dbName = process.env.DB_NAME || 'fairproject';
  cachedDb = client.db(dbName);

  console.log(`✅ Connected to MongoDB database: ${dbName}`);
  
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
