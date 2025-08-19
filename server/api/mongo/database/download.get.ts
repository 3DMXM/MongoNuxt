import { getQuery, setHeader, createError } from 'h3'
import fs from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
    const q = getQuery(event) as any
    const filename = q?.filename
    if (!filename) {
        throw createError({ statusCode: 400, statusMessage: 'Missing filename query parameter' })
    }

    const backupsDir = path.join(process.cwd(), 'server', 'backups')
    const filePath = path.join(backupsDir, path.basename(filename))

    try {
        const exists = await fs.promises.stat(filePath).then(() => true).catch(() => false)
        if (!exists) throw createError({ statusCode: 404, statusMessage: 'Backup not found' })

        const buf = await fs.promises.readFile(filePath)
        setHeader(event, 'Content-Type', 'application/json')
        setHeader(event, 'Content-Disposition', `attachment; filename="${path.basename(filename)}"`)
        return buf
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
