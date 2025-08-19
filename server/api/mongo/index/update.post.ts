import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, indexName, newIndexSpec, options = {} } = (body as any) || {}

    if (!dbName || !collName || !indexName || !newIndexSpec) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db, collection, indexName, or newIndexSpec in body' })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)
        // MongoDB does not provide a direct rename/modify index API; emulate by dropping and creating
        await collection.dropIndex(indexName)
        const res = await collection.createIndex(newIndexSpec, options)
        return { success: true, indexName: res }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
