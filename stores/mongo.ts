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
        // export database as downloadable JSON
        // supports optional onProgress(loaded:number, total:number) callback
        async exportDatabase(db: string, onProgress?: (loaded: number, total: number) => void) {
            const url = `/api/mongo/database/export?db=${encodeURIComponent(db)}`
            const res = await fetch(url)
            if (!res.ok) throw new Error('导出失败')

            // try to stream response body to report progress when possible
            const contentLength = res.headers.get('content-length')
            const total = contentLength ? parseInt(contentLength, 10) : 0

            // if body is not a stream (older fetch polyfills), fallback to blob
            if (!res.body || typeof (res.body as any).getReader !== 'function') {
                const blob = await res.blob()
                return { blob, filename: res.headers.get('content-disposition') }
            }

            const reader = (res.body as ReadableStream<Uint8Array>).getReader()
            const chunks: Uint8Array[] = []
            let loaded = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) {
                    chunks.push(value)
                    loaded += value.length
                    try { if (typeof onProgress === 'function') onProgress(loaded, total) } catch (e) { }
                }
            }

            // concatenate chunks into single Uint8Array
            const totalLen = chunks.reduce((s, c) => s + c.length, 0)
            const all = new Uint8Array(totalLen)
            let offset = 0
            for (const c of chunks) {
                all.set(c, offset)
                offset += c.length
            }
            const blob = new Blob([all.buffer])
            return { blob, filename: res.headers.get('content-disposition') }
        },
        // import database from uploaded file (multipart/form-data)
        // supports progress callback: onProgress(loaded:number, total:number)
        importDatabase(db: string, file: File, onProgress?: (loaded: number, total: number) => void) {
            const url = `/api/mongo/database/import?db=${encodeURIComponent(db)}`
            return new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.open('POST', url)

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const json = xhr.responseText ? JSON.parse(xhr.responseText) : {}
                            resolve(json)
                        } catch (e) {
                            resolve({})
                        }
                    } else {
                        const txt = xhr.responseText || `导入失败: ${xhr.status}`
                        reject(new Error(txt))
                    }
                }

                xhr.onerror = () => reject(new Error('网络错误，上传失败'))

                if (xhr.upload && typeof onProgress === 'function') {
                    xhr.upload.onprogress = (ev: ProgressEvent) => {
                        try { onProgress(ev.loaded, ev.total) } catch (e) { }
                    }
                }

                const fd = new FormData()
                fd.append('file', file)
                xhr.send(fd)
            })
        },
        // create a server-side backup file and return filename
        async backupDatabase(db: string) {
            const res = await (globalThis as any).$fetch('/api/mongo/database/backup', { method: 'POST', body: { db } })
            return res
        },
        // download a previously created backup
        async downloadBackup(filename: string) {
            const url = `/api/mongo/database/download?filename=${encodeURIComponent(filename)}`
            const res = await fetch(url)
            if (!res.ok) throw new Error('下载失败')
            const blob = await res.blob()
            return { blob }
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
