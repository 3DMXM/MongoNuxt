import { MongoClient } from 'mongodb'

// Simple singleton Mongo client manager for Nitro server
let client: MongoClient | null = null

export async function connect(uri: string) {
    if (client) return client
    client = new MongoClient(uri)
    await client.connect()
    return client
}

export function getClient() {
    if (!client) throw new Error('Mongo client not connected')
    return client
}

export async function closeClient() {
    if (client) await client.close()
    client = null
}
