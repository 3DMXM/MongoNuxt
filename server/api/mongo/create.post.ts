import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'
import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, document } = (body as any) || {}

    if (!dbName || !collName || !document) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing db, collection, or document in body'
        })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)

        // Parse document if it's a string
        let parsedDocument = document
        if (typeof document === 'string') {
            try {
                parsedDocument = JSON.parse(document)
            } catch (err) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Invalid JSON format for document'
                })
            }
        }

        const result = await collection.insertOne(parsedDocument)

        return {
            success: true,
            insertedId: result.insertedId,
            message: 'Document created successfully'
        }
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: err?.message || String(err)
        })
    }
})
