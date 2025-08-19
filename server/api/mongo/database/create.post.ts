import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName } = (body as any) || {}

    if (!dbName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db in body' })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)
        // MongoDB doesn't have a direct create-database command. Creating a collection will materialize the database.
        const coll = await db.createCollection('__init')
        // drop the init collection to leave an empty database (optional)
        await db.collection('__init').drop()
        return { success: true, db: dbName }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
