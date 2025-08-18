import { getClient } from '../../utils/mongo'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const dbName = query?.db as string
    if (!dbName) throw createError({ statusCode: 400, statusMessage: 'Missing db query param' })
    try {
        const client = getClient()
        const db = client.db(dbName)
        const cols = await db.listCollections().toArray()
        return { collections: cols.map(c => c.name) }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
