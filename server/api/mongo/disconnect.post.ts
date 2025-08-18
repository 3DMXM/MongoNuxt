import { closeClient } from '../../utils/mongo'
import { createError } from 'h3'

export default defineEventHandler(async () => {
    try {
        await closeClient()
        return { success: true }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err?.message || String(err) })
    }
})
