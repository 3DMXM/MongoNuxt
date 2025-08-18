import { getClient } from '../../utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName, filter, limit } = (body as any) || {}
    if (!dbName || !collName) throw createError({ statusCode: 400, statusMessage: 'Missing db or collection in body' })
    try {
        const client = getClient()
        const collection = client.db(dbName).collection(collName)
        const parsedFilter = filter ?? {}
        const docs = await collection.find(parsedFilter).limit(Number(limit || 20)).toArray()
        return { docs }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
