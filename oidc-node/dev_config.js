var config = {}

config.node = {}
config.node.host = "localhost"
config.node.port = process.env.NODE_PORT || 3001
config.redis = {}
config.redis.host = "localhost"
config.redis.port = 6379


module.exports = config
