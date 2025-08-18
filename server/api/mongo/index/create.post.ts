import { getClient } from '../../../utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, indexSpec, options = {} } = (body as any) || {}

    if (!dbName || !collName || !indexSpec) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db, collection, or indexSpec in body' })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)
        const res = await collection.createIndex(indexSpec, options)
        return { success: true, indexName: res }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
