'use strict';

require('../promise');

var log = console.log.bind(console); // TODO use a logging lib

var sio = require('socket.io');
var http = require('http');

var io;

var resolveStop;
var rejectStop;
function removeStopDeferred() {
  resolveStop = null;
  rejectStop = null;
}

var messageHandlers = {};
module.exports = {
  addMessageHandler: function(message, handler){
    io.sockets.sockets.forEach(function(socket) {
      socket.on(message, handler);
    });
    messageHandlers[message] = handler;
  },
  start: function() {
    return new Promise(function(resolve, reject) {
      var srv = http.createServer(function(req, res){
        res.writeHead(404);
        res.end();
      });
      srv.listen(9000, function () {
        log('server: start');

        io = sio(this);

        io.on('connection', function(socket){
          for (var key in messageHandlers) {
            socket.on(key, messageHandlers[key]);
          }
        });
        resolve();
      });
      srv.on('error', function (err) {
        if (rejectStop) {
          rejectStop(err);
        }
        removeStopDeferred();

        reject(err);
      });
      srv.on('close', function () {
        log('server: stop');

        if (resolveStop) {
          resolveStop();
        }
        removeStopDeferred();
      });
    });
  },
  stop: function() {
    return new Promise(function(resolve, reject) {
      resolveStop = resolve;
      rejectStop = reject;

      io.close();
    });
  }
};
