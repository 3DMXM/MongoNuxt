import { getClient } from '../../utils/mongo'
import { readBody, createError } from 'h3'
import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, filter } = (body as any) || {}

    if (!dbName || !collName || !filter) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing db, collection, or filter in body'
        })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)

        // Parse filter if it's a string
        let parsedFilter = filter
        if (typeof filter === 'string') {
            try {
                parsedFilter = JSON.parse(filter)
            } catch (err) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Invalid JSON format for filter'
                })
            }
        }

        // Convert _id string to ObjectId if present in filter
        if (parsedFilter._id && typeof parsedFilter._id === 'string') {
            try {
                parsedFilter._id = new ObjectId(parsedFilter._id)
            } catch (err) {
                // If it's not a valid ObjectId, keep it as string
            }
        }

        const doc = await collection.findOne(parsedFilter)

        return {
            success: true,
            document: doc
        }
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: err?.message || String(err)
        })
    }
})
