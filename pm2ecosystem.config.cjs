module.exports = {
    apps: [
        {
            name: "Mongo",
            port: "4659",
            exec_mode: "cluster",
            instances: "max",
            script: "./.output/server/index.mjs",
        }
    ]
}
