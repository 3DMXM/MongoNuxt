import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { db: dbName, from: fromName, to: toName, dropTarget = false } = (body as any) || {}

    if (!dbName || !fromName || !toName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db, from or to in body' })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)

        // Check whether target collection exists
        const existing = await db.listCollections({ name: toName }).toArray()
        const targetExists = existing && existing.length > 0

        if (targetExists) {
            if (dropTarget) {
                // Drop the existing target before renaming
                await db.collection(toName).drop()
            } else {
                throw createError({ statusCode: 409, statusMessage: 'Target namespace exists' })
            }
        }

        // Perform rename
        await db.collection(fromName).rename(toName)
        return { success: true, from: fromName, to: toName }
    } catch (err: any) {
        // Map common errors to clearer status codes
        const msg = err?.message || String(err)
        if (msg && msg.toLowerCase().includes('ns not found')) {
            throw createError({ statusCode: 404, statusMessage: 'Source collection not found' })
        }
        if (msg && msg.toLowerCase().includes('target namespace exists')) {
            throw createError({ statusCode: 409, statusMessage: msg })
        }
        throw createError({ statusCode: 500, statusMessage: msg })
    }
})
