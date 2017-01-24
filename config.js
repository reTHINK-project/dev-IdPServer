var config = {}

config.node = {}
config.node.port = "localhost" 
config.node.port = process.env.NODE_PORT || 8080
config.redis = {}
config.redis.host = process.env.REDIS_PORT_6379_TCP_ADDR || "redis"
config.redis.port = process.env.REDIS_PORT_6379_TCP_PORT || 6379

config.iss = "energyq.idp.rethink.orange-labs.fr"

module.exports = config
