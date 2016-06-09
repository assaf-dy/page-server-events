var P = require('autoresolve');
var redis = require(P('src/redis.js'));

exports.pushEvent = function (userId, eventId, status) {
  redis.saveUserEvents(userId, eventId, status);
};

exports.popEvent = function (userId, eventId) {
  return redis.getUserEvents(userId, eventId).then(function(status) {
    console.log('worker got ' + status);
    if (typeof status === 'undefined' || status === null) {
      return false;
    } else {
      return status;
    }
  });
};