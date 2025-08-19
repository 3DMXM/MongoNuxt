import { getClient } from '@@/server/utils/mongo'
import { createError, getQuery } from 'h3'
import Busboy from 'busboy'
import streamJsonPkg from 'stream-json'
const { parser } = streamJsonPkg
import pickPkg from 'stream-json/filters/Pick'
const { pick } = pickPkg
import streamArrayPkg from 'stream-json/streamers/StreamArray'
const { streamArray } = streamArrayPkg
import chainPkg from 'stream-chain'
const { chain } = (chainPkg as any)
import { Writable, PassThrough } from 'stream'
import { createGunzip } from 'zlib'

// helper: read multipart and return file stream for field 'file'
function getFileStreamFromEvent(event: any): Promise<{ stream: NodeJS.ReadableStream, filename?: string, mime?: string }> {
    return new Promise((resolve, reject) => {
        const headers = event.node.req.headers
        const bb = new (Busboy as any)({ headers })
        let resolved = false

        bb.on('file', (fieldname: any, file: any, filename: any, encoding: any, mimetype: any) => {
            if (fieldname === 'file' && !resolved) {
                resolved = true
                resolve({ stream: file, filename, mime: mimetype })
            } else {
                // drain other files
                file.resume()
            }
        })

        bb.on('error', (err: any) => {
            if (!resolved) reject(err)
        })

        bb.on('finish', () => {
            if (!resolved) reject(new Error('No file field'))
        })

        // pipe request into busboy
        event.node.req.pipe(bb)
    })
}

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const dbName = q?.db
    if (!dbName) throw createError({ statusCode: 400, statusMessage: 'Missing db query parameter' })

    const client = getClient()
    const db = client.db(dbName)

    try {
        const fileObj = await getFileStreamFromEvent(event)
        let inputStream: NodeJS.ReadableStream = (fileObj.stream as any)
        const filename = fileObj.filename || ''
        const mimetype = fileObj.mime || ''

        // if file looks gzipped by filename or mime, wrap with gunzip
        if (mimetype === 'application/gzip' || filename.endsWith('.gz') || filename.endsWith('.gzip')) {
            const gunzip = createGunzip()
            const pass = new PassThrough()
            inputStream.pipe(gunzip).pipe(pass)
            inputStream = pass
        }

        // chain: input -> parser -> pick collections -> streamArray
        const pipeline = chain([
            inputStream,
            parser(),
            pick({ filter: 'collections' }),
            streamArray()
        ])

        pipeline.on('data', async (data: any) => {
            pipeline.pause()
            try {
                const coll = data.value
                const name = coll.name
                const exists = await db.listCollections({ name }).hasNext()
                if (exists) await db.collection(name).drop()
                await db.createCollection(name)

                const docs = coll.docs || []
                const batchSize = 500
                for (let i = 0; i < docs.length; i += batchSize) {
                    const chunk = docs.slice(i, i + batchSize)
                    if (chunk.length > 0) await db.collection(name).insertMany(chunk)
                }

                const indexes = coll.indexes || []
                for (const idx of indexes) {
                    if (idx.name === '_id_') continue
                    try { await db.collection(name).createIndex(idx.key, { name: idx.name }) } catch (e) { }
                }
            } catch (err) {
                pipeline.destroy(err as any)
            } finally {
                pipeline.resume()
            }
        })

        await new Promise<void>((resolve, reject) => {
            pipeline.on('end', () => resolve())
            pipeline.on('error', (e: any) => reject(e))
        })

        return { success: true }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
