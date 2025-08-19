import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
    const body = await readBody(event) as any
    const dbName = body?.db
    if (!dbName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing db in body' })
    }

    try {
        const client = getClient()
        const db = client.db(dbName)
        const collections = await db.listCollections().toArray()

        const out: any = { db: dbName, collections: [] }

        for (const collInfo of collections) {
            const name = collInfo.name
            const coll = db.collection(name)
            const docs = await coll.find().toArray()
            const indexes = await coll.indexes()
            out.collections.push({ name, indexes, docs })
        }

        const backupsDir = path.join(process.cwd(), 'server', 'backups')
        await fs.promises.mkdir(backupsDir, { recursive: true })
        const filename = `${dbName}-backup-${Date.now()}.json`
        const filePath = path.join(backupsDir, filename)
        await fs.promises.writeFile(filePath, JSON.stringify(out), 'utf-8')

        return { success: true, filename }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
