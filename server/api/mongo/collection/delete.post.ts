import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, collection: collName } = (body as any) || {}

    if (!dbName || !collName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db or collection in body' })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)
        const res = await db.collection(collName).drop()
        return { success: true, result: res }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
