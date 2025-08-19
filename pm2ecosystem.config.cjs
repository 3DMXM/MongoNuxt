module.exports = {
    apps: [
        {
            name: "Mongo",
            port: "4659",
            exec_mode: "fork",
            instances: "max",
            script: "./.output/server/index.mjs",
        }
    ]
}
