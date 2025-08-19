import { defineStore } from 'pinia'

export const useMongoStore = defineStore('mongo', {
    state: () => ({
        uri: '',
        connected: false,
        databases: [] as Array<any>,
        collections: [] as string[],
        docs: [] as Array<any>,
        docCount: 0,
        pageSize: 20,
        currentPage: 1,
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
        async createDatabase(db: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/database/create', { method: 'POST', body: { db } })
            // refresh database list
            await this.listDatabases()
            return res
        },
        async deleteDatabase(db: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/database/delete', { method: 'POST', body: { db } })
            // refresh database list and clear active selections if needed
            await this.listDatabases()
            if (this.activeDb === db) {
                this.activeDb = null
                this.collections = []
                this.activeCollection = null
                this.docs = []
            }
            return res
        },
        async renameDatabase(from: string, to: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/database/rename', { method: 'POST', body: { from, to } })
            // refresh database list
            await this.listDatabases()
            if (this.activeDb === from) {
                this.activeDb = to
            }
            return res
        },
        async listCollections(db: string) {
            this.activeDb = db
            const res = await (globalThis as any).$fetch(`/api/mongo/collections?db=${encodeURIComponent(db)}`)
            this.collections = (res as any).collections || []
            // Reset docs when switching databases
            this.docs = []
            this.docCount = 0
            this.activeCollection = null
            return this.collections
        },
        async createCollection(db: string, collection: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/collection/create', { method: 'POST', body: { db, collection } })
            // refresh collection list
            await this.listCollections(db)
            return res
        },

        async deleteCollection(db: string, collection: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/collection/delete', { method: 'POST', body: { db, collection } })
            // refresh collection list
            await this.listCollections(db)
            return res
        },

        async renameCollection(db: string, from: string, to: string, dropTarget = false) {
            const res = await (globalThis as any).$fetch('/api/mongo/collection/rename', { method: 'POST', body: { db, from, to, dropTarget } })
            // refresh collection list
            await this.listCollections(db)
            return res
        },
        // find supports legacy (limit) and new pagination (page, pageSize)
        async find(db: string, collection: string, filter: any = {}, arg4?: number, arg5?: number) {
            this.activeDb = db
            this.activeCollection = collection

            let page = 1
            let pageSize = this.pageSize || 20

            if (typeof arg4 === 'number' && typeof arg5 === 'number') {
                page = Math.max(1, Math.floor(arg4))
                pageSize = Math.max(1, Math.floor(arg5))
            } else if (typeof arg4 === 'number' && typeof arg5 === 'undefined') {
                // legacy: arg4 was limit -> treat as pageSize and page=1
                page = 1
                pageSize = Math.max(1, Math.floor(arg4))
            }

            // update store pagination state
            this.currentPage = page
            this.pageSize = pageSize

            const res = await (globalThis as any).$fetch('/api/mongo/find', { method: 'POST', body: { db, collection, filter, page, pageSize } })
            this.docs = (res as any).docs || []
            // set total document count returned by the server
            this.docCount = typeof (res as any).count === 'number' ? (res as any).count : (this.docs || []).length
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
        async createIndex(db: string, collection: string, indexSpec: any, options: any = {}) {
            const res = await (globalThis as any).$fetch('/api/mongo/index/create', { method: 'POST', body: { db, collection, indexSpec, options } })
            return res
        },

        async updateIndex(db: string, collection: string, indexName: string, newIndexSpec: any, options: any = {}) {
            const res = await (globalThis as any).$fetch('/api/mongo/index/update', { method: 'POST', body: { db, collection, indexName, newIndexSpec, options } })
            return res
        },

        async deleteIndex(db: string, collection: string, indexName: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/index/delete', { method: 'POST', body: { db, collection, indexName } })
            return res
        },
        async refreshDocuments() {
            if (this.activeDb && this.activeCollection) {
                return await this.find(this.activeDb, this.activeCollection, {}, 20)
            }
        },
        async disconnect() {
            // Ask server to close its Mongo client to allow reconnecting to another URI
            try {
                await (globalThis as any).$fetch('/api/mongo/disconnect', { method: 'POST' })
            } catch (err) {
                // ignore server errors; still clear local state
            }

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
