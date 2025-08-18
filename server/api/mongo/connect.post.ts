import { connect } from '../../utils/mongo'
import { readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const uri = (body as any)?.uri
    if (!uri) {
        throw createError({ statusCode: 400, statusMessage: 'Missing uri in body' })
    }
    try {
        await connect(uri)
        return { success: true }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
