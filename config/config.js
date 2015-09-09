/* global process */

var env = process.env.NODE_ENV || 'production';

var config = {
  development: {
    port: 18080,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  },

  production: {
    port: 18080,
    qyh: {
        corpId: process.env.QYH_CORPID,
        secret: process.env.QYH_SECRET
    },
    profile: {
        token: process.env.PROFILE_TOKEN,
        aesKey: process.env.PROFILE_AESKEY,
        agentId: process.env.PROFILE_AGENTID
    },
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || 6379
    }
  }
};

module.exports = config[env];
