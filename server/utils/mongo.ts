import { MongoClient } from 'mongodb'

// Simple singleton Mongo client manager for Nitro server
let client: MongoClient | null = null

export async function connect(uri: string) {
    // If there's an existing client, close it first so a new URI takes effect
    if (client) {
        try {
            await client.close()
        } catch (err) {
            // ignore errors when closing previous client
        }
        client = null
    }

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
