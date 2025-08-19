import { getClient } from '@@/server/utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { from: fromName, to: toName } = (body as any) || {}

    if (!fromName || !toName) {
        throw createError({ statusCode: 400, statusMessage: 'Missing from or to in body' })
    }

    try {
        const client = getClient()
        const srcDb = client.db(fromName)
        const dstDb = client.db(toName)

        // MongoDB doesn't support renaming a database directly.
        // Implement by copying all collections from source to destination, then dropping source.
        const collections = await srcDb.listCollections().toArray()

        for (const collInfo of collections) {
            const name = collInfo.name
            // copy data
            const srcColl = srcDb.collection(name)
            const dstColl = dstDb.collection(name)
            const docs = await srcColl.find().toArray()
            if (docs.length > 0) {
                await dstColl.insertMany(docs)
            } else {
                // ensure collection exists
                await dstDb.createCollection(name)
            }
            // copy indexes
            const indexes = await srcColl.indexes()
            for (const idx of indexes) {
                if (idx.name === '_id_') continue
                const key = idx.key
                const opts: any = { name: idx.name }
                // avoid duplicate index errors by catching
                try {
                    await dstColl.createIndex(key, opts)
                } catch (e) {
                    // ignore
                }
            }
        }

        // drop source database
        await client.db(fromName).dropDatabase()

        return { success: true, from: fromName, to: toName }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
