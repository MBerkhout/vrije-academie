const assert = require("node:assert/strict")
const { resolveCluster, clamp } = require("./pm2-sizing.cjs")

assert.equal(clamp(5, 2, 4), 4)

const sizing = resolveCluster(__dirname + "/../frontend", "frontend")
assert.ok(sizing.instances >= 2)
assert.ok(sizing.max_memory_restart)
assert.ok(sizing.nodeOptions.includes("max-old-space-size"))

console.log("pm2-sizing.test.cjs OK")
