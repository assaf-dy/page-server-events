var P = require('autoresolve');
var config = require(P('config/config')).config;
var Redis = require('ioredis');
var _ = require('lodash');
var redis = new Redis({
  port: config.redis.port,
  host: config.redis.host,
  db: config.redis.db
});

//simple concat in the meantime
function makeKey() {
  var result = '';
  _.forEach(arguments, function(arg) {
    result += arg + ':';
  });
  return result.substring(0, result.length - 1);
}

exports.getUserEvents = function (userId) {
  return redis.hgetall(userId);
};

exports.saveUserEvents = function (userId, eventId, eventData) {
  redis.hset(userId, eventId, eventData);
};