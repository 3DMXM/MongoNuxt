import { defineStore } from 'pinia'

export const useMongoStore = defineStore('mongo', {
    state: () => ({
        uri: '',
        connected: false,
        databases: [] as Array<any>,
        collections: [] as string[],
        docs: [] as Array<any>,
        activeDb: '' as string | null,
        activeCollection: '' as string | null
    }),
    actions: {
        async connect(uri: string) {
            this.uri = uri
            const res = await (globalThis as any).$fetch('/api/mongo/connect', { method: 'POST', body: { uri } })
            this.connected = !!(res as any).success
            return res
        },
        async listDatabases() {
            const res = await (globalThis as any).$fetch('/api/mongo/list')
            this.databases = (res as any).databases || []
            return this.databases
        },
        async listCollections(db: string) {
            this.activeDb = db
            const res = await (globalThis as any).$fetch(`/api/mongo/collections?db=${encodeURIComponent(db)}`)
            this.collections = (res as any).collections || []
            // Reset docs when switching databases
            this.docs = []
            this.activeCollection = null
            return this.collections
        },
        async find(db: string, collection: string, filter = {}, limit = 20) {
            this.activeDb = db
            this.activeCollection = collection
            const res = await (globalThis as any).$fetch('/api/mongo/find', { method: 'POST', body: { db, collection, filter, limit } })
            this.docs = (res as any).docs || []
            return this.docs
        },
        async findOne(db: string, collection: string, filter: any) {
            const res = await (globalThis as any).$fetch('/api/mongo/findone', { method: 'POST', body: { db, collection, filter } })
            return (res as any).document
        },
        async createDocument(db: string, collection: string, document: any) {
            const res = await (globalThis as any).$fetch('/api/mongo/create', { method: 'POST', body: { db, collection, document } })
            return res
        },
        async updateDocument(db: string, collection: string, filter: any, update: any, upsert = false) {
            const res = await (globalThis as any).$fetch('/api/mongo/update', { method: 'POST', body: { db, collection, filter, update, upsert } })
            return res
        },
        async deleteDocument(db: string, collection: string, filter: any, deleteMany = false) {
            const res = await (globalThis as any).$fetch('/api/mongo/delete', { method: 'POST', body: { db, collection, filter, deleteMany } })
            return res
        },
        async refreshDocuments() {
            if (this.activeDb && this.activeCollection) {
                return await this.find(this.activeDb, this.activeCollection, {}, 20)
            }
        },
        disconnect() {
            this.uri = ''
            this.connected = false
            this.databases = []
            this.collections = []
            this.docs = []
            this.activeDb = null
            this.activeCollection = null
        }
    }
})
