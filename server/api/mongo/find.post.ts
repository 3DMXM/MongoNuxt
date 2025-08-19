import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'
import { ObjectId } from 'mongodb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, filter, limit, page, pageSize } = (body as any) || {}
    if (!dbName || !collName) throw createError({ statusCode: 400, statusMessage: 'Missing db or collection in body' })
    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)
        // Parse filter if it's a string
        let parsedFilter = filter ?? {}
        if (typeof filter === 'string') {
            try {
                parsedFilter = JSON.parse(filter)
            } catch (err) {
                throw createError({ statusCode: 400, statusMessage: 'Invalid JSON format for filter' })
            }
        }

        // Convert _id string to ObjectId if present
        if (parsedFilter._id && typeof parsedFilter._id === 'string') {
            try {
                parsedFilter._id = new ObjectId(parsedFilter._id)
            } catch (err) {
                // keep as string if invalid ObjectId
            }
        }

        // Determine skip & limit for pagination. Support legacy 'limit' param.
        let _limit = Number(limit || pageSize || 20)
        let _page = Number(page || 1)
        if (_limit <= 0) _limit = 20
        if (_page <= 0) _page = 1
        const skip = (_page - 1) * _limit

        const docs = await collection.find(parsedFilter).skip(skip).limit(_limit).toArray()
        // also return the total count for the given filter so UI can show accurate totals
        const count = await collection.countDocuments(parsedFilter)
        return { docs, count }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
