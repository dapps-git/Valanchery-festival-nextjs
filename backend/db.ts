import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI || ''

const options = {
  maxPoolSize: 5,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 10000,
}

// Global connection pool reused across serverless invocations
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

export async function connectDB(): Promise<Db> {
  const uri = process.env.MONGODB_URI || ''
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }

  try {
    const client = await globalWithMongo._mongoClientPromise
    return client.db('FESTIVAL')
  } catch (err) {
    globalWithMongo._mongoClientPromise = undefined
    throw err
  }
}

export default connectDB
