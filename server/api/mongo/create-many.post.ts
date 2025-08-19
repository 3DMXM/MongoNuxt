import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, documents } = (body as any) || {}

    if (!dbName || !collName || !documents) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db, collection, or documents in body' })
    }

    // documents can be an array or a JSON string
    let docs = documents
    if (typeof documents === 'string') {
        try {
            docs = JSON.parse(documents)
        } catch (err) {
            // try NDJSON: split by lines
            try {
                const lines = (documents as string).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
                docs = lines.map(l => JSON.parse(l))
            } catch (e) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid JSON format for documents' })
            }
        }
    }

    if (!Array.isArray(docs) || docs.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'documents must be a non-empty array' })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)

        const result = await collection.insertMany(docs)

        return {
            success: true,
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds
        }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
