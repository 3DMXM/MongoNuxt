import { getClient } from '../../../utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName } = (body as any) || {}

    if (!dbName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db in body' })
    }

    try {
        const client = getClient()
        // Dropping a database
        const res = await client.db(dbName).dropDatabase()
        return { success: true, result: res }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
