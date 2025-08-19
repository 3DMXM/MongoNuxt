import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, indexName } = (body as any) || {}

    if (!dbName || !collName || !indexName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db, collection, or indexName in body' })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)
        const res = await collection.dropIndex(indexName)
        return { success: true, result: res }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
