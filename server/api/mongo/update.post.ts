import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'
import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, filter, update, upsert = false } = (body as any) || {}

    if (!dbName || !collName || !filter || !update) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing db, collection, filter, or update in body'
        })
    }

    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)

        // Parse filter and update if they're strings
        let parsedFilter = filter
        let parsedUpdate = update

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

        if (typeof update === 'string') {
            try {
                parsedUpdate = JSON.parse(update)
            } catch (err) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Invalid JSON format for update'
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

        // Remove _id from update operations to prevent immutable field error
        if (parsedUpdate.$set && parsedUpdate.$set._id) {
            delete parsedUpdate.$set._id
        }
        if (parsedUpdate._id) {
            delete parsedUpdate._id
        }

        // Ensure we have something to update
        if (parsedUpdate.$set && Object.keys(parsedUpdate.$set).length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No valid fields to update'
            })
        }

        const result = await collection.updateOne(parsedFilter, parsedUpdate, { upsert })

        return {
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId,
            message: result.modifiedCount > 0 ? 'Document updated successfully' : 'No document was modified'
        }
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: err?.message || String(err)
        })
    }
})
