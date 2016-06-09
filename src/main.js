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

function updateUserEvents(userId, userEvents, eventId) {
  cache.set(userId, userEvents, function (err, success) {
    if (!err && success) {
      console.log('success');
      worker.pushEvent(userId, eventId, userEvents[eventId]);
    }
  });
}

api.get('/triggerEvent', function (req, res) {
  var userId = req.query.userId;
  var eventId = req.query.eventId;
  if (typeof userId === 'undefined' || typeof eventId === 'undefined') {
    res.statusCode = 401;
    res.end();
  } else {
    cache.get(userId, function (err, userEvents) {
      if (typeof userEvents === 'undefined') {
        userEvents = {};
      }
      userEvents[eventId] = status.TRIGGERED;
      updateUserEvents(userId, userEvents, eventId);
      res.statusCode = 200;
      res.end('OK');
    });
  }
});

api.get('/pollingEvent', function (req, res) {
  var userId = req.query.userId;
  var eventId = req.query.eventId;
  if (typeof userId === 'undefined' || typeof eventId === 'undefined') {
    res.statusCode = 401;
    res.end();
  } else {
    cache.get(userId, function (err, userEvents) {
      if (err) {
        res.statusCode = 500;
        res.end();
      } else {
        if (typeof userEvents !== 'undefined' && typeof userEvents[eventId] !== 'undefined') {
          console.log('cache found it');
          if (userEvents[eventId] == status.NOT_TRIGGERED_YET || userEvents[eventId] == status.POPED) {
            res.statusCode = 200;
            res.end(status.NOT_TRIGGERED_YET.toString());
          } else {
            userEvents[eventId] = status.POPED;
            updateUserEvents(userId, userEvents, eventId);
            res.statusCode = 200;
            res.end(status.TRIGGERED.toString());
          }
        }
        else {
          console.log('cache didnt found it, going to redis');
          if (typeof userEvents === 'undefined') {
            userEvents = {};
          }
          if (typeof userEvents[eventId] === 'undefined') {
            userEvents[eventId] = status.NOT_TRIGGERED_YET;
          }
          return worker.popEvent(userId, eventId).then(function(redisStatus) {
            console.log('redisStatus', redisStatus);
            if (redisStatus === false) {
              updateUserEvents(userId, userEvents, eventId);
              res.statusCode = 200;
              res.end(status.NOT_TRIGGERED_YET.toString());
            } else {
              if (redisStatus == status.NOT_TRIGGERED_YET || redisStatus == status.POPED) {
                userEvents[eventId] = redisStatus;
                cache.set(userId, userEvents, function () {
                  console.log('cache is set');
                  res.statusCode = 200;
                  res.end(status.NOT_TRIGGERED_YET.toString());
                });
              } else {
                userEvents[eventId] = status.POPED;
                updateUserEvents(userId, userEvents, eventId);
                res.statusCode = 200;
                res.end(status.TRIGGERED.toString());
              }
            }
          });
        }
      }
    });
  }
});

api.listen(config.HTTP_PORT || 12311);