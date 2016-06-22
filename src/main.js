/**
 * Created by Assaf on 6/5/2016.
 */
var P = require('autoresolve');
var express = require('express');
var config = require(P('config/config')).config;
var worker = require(P('src/worker.js'));
var nodeCache = require('node-cache');
var cache = new nodeCache({stdTTL: 600, checkperiod: 120});
var status = {NOT_TRIGGERED_YET: 0, TRIGGERED: 1, POPED:2};
var api = express();

//cors enabling
api.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

api.use(function(req, res, next) {
  var data='';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data += chunk;
  });

  req.on('end', function() {
    req.body = data;
    next();
  });
});

function updateUserEvents(userId, userEvents) {
  console.log('updateuserEvents', userEvents, typeof userEvents);
  cache.set(userId, userEvents, function (err, success) {
    if (!err && success) {
      console.log('success');
      worker.pushEvent(userId, userEvents);
    }
  });
}

api.post('/triggerEvent', function (req, res) {
  var userId = req.query.userId;
  var eventId = req.query.eventId;
  var eventData = req.body;
  try {
    eventData = JSON.parse(req.body);
  } catch (e) {
    res.end('illegal request body');
  }
  if (typeof userId === 'undefined' || typeof eventId === 'undefined') {
    res.statusCode = 401;
    res.end();
  } else {
    cache.get(userId, function (err, userEvents) {
      if (typeof userEvents === 'undefined') {
        userEvents = {};
      }
      userEvents[eventId] = {
        status: status.TRIGGERED,
        data: eventData
      };
      updateUserEvents(userId, userEvents);
      res.statusCode = 200;
      res.end('OK');
    });
  }
});

api.get('/pollingEvent', function (req, res) {
  var userId = req.query.userId;
  if (typeof userId === 'undefined') {
    res.statusCode = 401;
    res.end();
  } else {
    cache.get(userId, function (err, userEvents) {
      if (err) {
        res.statusCode = 500;
        res.end();
      } else {
        //cache found it
        if (typeof userEvents !== 'undefined') {
          console.log('cache found it');
          var result = JSON.parse(JSON.stringify(userEvents));
          for (var eventId in userEvents) {
            if (userEvents.hasOwnProperty(eventId)) {
              if (userEvents[eventId].status == status.TRIGGERED) {
                userEvents[eventId].status = status.POPED;
                userEvents[eventId].data = '';
              }
            }
            updateUserEvents(userId, userEvents);
          }
          res.end(JSON.stringify(result));
        } else {
          return worker.popEvent(userId).then(function(eventsObject) {
            console.log('eventObject', Object.keys(eventsObject).length);
            //redis found nothing
            if (Object.keys(eventsObject).length === 0) {
              updateUserEvents(userId, eventsObject);
              res.statusCode = 200;
              res.end(JSON.stringify(eventsObject));
            } else {
              console.log('redis found it');
              var result = JSON.parse(JSON.stringify(eventsObject));
              for (var eventId in eventsObject) {
                if (eventsObject.hasOwnProperty(eventId)) {
                  eventsObject[eventId] = JSON.parse(eventsObject[eventId]);
                  result[eventId] = JSON.parse(result[eventId]);
                  console.log(eventsObject, typeof eventsObject, eventsObject[eventId], typeof eventsObject[eventId]);
                  if (eventsObject[eventId].status == status.TRIGGERED) {
                    eventsObject[eventId].status = status.POPED;
                    eventsObject[eventId].data = '';
                  }
                }
              }
              updateUserEvents(userId, eventsObject);
              res.end(JSON.stringify(result));
            }
          });
        }
      }
    });
  }
});

api.listen(config.HTTP_PORT || 12311);