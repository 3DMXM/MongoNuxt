import { getClient } from '../../utils/mongo'
import { createError } from 'h3'

export default defineEventHandler(async () => {
    try {
        const client = getClient()
        const admin = client.db().admin()
        const res = await admin.listDatabases()
        return { databases: res.databases }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
