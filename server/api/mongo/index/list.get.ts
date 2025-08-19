import { getClient } from '@@/server/utils/mongo'
import { getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const dbName = query?.db as string
    const collName = query?.collection as string

    if (!dbName || !collName) throw createError({ statusCode: 400, statusMessage: 'Missing db or collection query param' })

    try {
        const client = getClient()
        const indexes = await client.db(dbName).collection(collName).indexes()
        return { indexes }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
