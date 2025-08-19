import { MongoClient, MongoClientOptions } from 'mongodb'

// Simple singleton Mongo client manager for Nitro server
let client: MongoClient | null = null

// 检测可用的压缩器
function getAvailableCompressors(): ('snappy' | 'zlib')[] {
    const compressors: ('snappy' | 'zlib')[] = ['zlib'] // zlib 总是可用的

    try {
        // 尝试加载 snappy
        require.resolve('snappy')
        compressors.unshift('snappy') // snappy 优先级更高
        console.log('Snappy compression available')
    } catch (error) {
        console.log('Snappy compression not available, using zlib only')
    }

    return compressors
}

// 优化的连接配置
function getDefaultOptions(): MongoClientOptions {
    return {
        // 连接池配置
        maxPoolSize: 10, // 最大连接数
        minPoolSize: 2,  // 最小连接数
        maxIdleTimeMS: 30000, // 空闲连接超时

        // 服务器选择和监控
        serverSelectionTimeoutMS: 5000, // 服务器选择超时
        socketTimeoutMS: 45000, // Socket超时
        connectTimeoutMS: 10000, // 连接超时

        // 心跳和监控
        heartbeatFrequencyMS: 10000, // 心跳频率

        // 读取配置（大数据导出优化）
        readPreference: 'secondaryPreferred', // 优先从副本读取
        readConcern: { level: 'local' }, // 本地读取一致性

        // 写入配置
        writeConcern: { w: 'majority', j: true },

        // 压缩（动态检测可用压缩器）
        compressors: getAvailableCompressors(),

        // 重试配置
        retryWrites: true,
        retryReads: true,

        // 应用名称，便于监控
        appName: 'MongoNuxt-Export'
    }
}

export async function connect(uri: string, options?: MongoClientOptions) {
    // If there's an existing client, close it first so a new URI takes effect
    if (client) {
        try {
            await client.close()
        } catch (err) {
            // ignore errors when closing previous client
            console.warn('Error closing previous MongoDB client:', err)
        }
        client = null
    }

    // 合并默认配置和用户配置
    const defaultOptions = getDefaultOptions()
    const finalOptions = { ...defaultOptions, ...options }

    client = new MongoClient(uri, finalOptions)

    try {
        await client.connect()

        // 验证连接
        await client.db('admin').command({ ping: 1 })
        console.log('MongoDB connected successfully')

        return client
    } catch (error) {
        console.error('MongoDB connection failed:', error)
        client = null
        throw error
    }
}

export function getClient() {
    if (!client) throw new Error('Mongo client not connected')
    return client
}

export async function closeClient() {
    if (client) {
        try {
            await client.close()
            console.log('MongoDB client closed')
        } catch (error) {
            console.error('Error closing MongoDB client:', error)
        }
        client = null
    }
}

// 健康检查函数
export async function isConnected(): Promise<boolean> {
    if (!client) return false

    try {
        await client.db('admin').command({ ping: 1 })
        return true
    } catch {
        return false
    }
}

// 获取连接状态
export function getConnectionStatus() {
    if (!client) return 'disconnected'

    // MongoDB驱动没有直接的状态检查，我们可以检查拓扑
    try {
        const topology = (client as any).topology
        if (topology && topology.isConnected && topology.isConnected()) {
            return 'connected'
        }
        return 'connecting'
    } catch {
        return 'unknown'
    }
}
