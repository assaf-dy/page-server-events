var P = require('autoresolve');
var redis = require(P('src/redis.js'));

exports.pushEvent = function (userId, eventObject) {
  for (var eventId in eventObject) {
    if (eventObject.hasOwnProperty(eventId)) {
      redis.saveUserEvents(userId, eventId, JSON.stringify(eventObject[eventId]));
    }
  }
};

exports.popEvent = function (userId) {
  return redis.getUserEvents(userId).then(function(eventsObject) {
    console.log('worker got ' + JSON.stringify(eventsObject));
    return eventsObject;
  });
};