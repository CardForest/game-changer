'use strict';

require('../promise');

global.location = {
  protocol: 'http:',
  host: 'localhost:9000',
  hostname: 'localhost'
};
var socket = require('socket.io-client')({reconnection: false, autoConnect: false});

var log = console.log.bind(console); // TODO use a logging lib

var promiseStart;
var resolveStart;
var rejectStart;
function finalizeStartDeferred(err, socket) {
  if (err) {
    if (rejectStart) {
      rejectStart(err);
    }
  } else {
    if (resolveStart) {
      resolveStart(socket);
    }
  }

  promiseStart = null;
  resolveStart = null;
  rejectStart = null;
}

var promiseStop;
var resolveStop;
var rejectStop;
function clearStopDeferred() {
  resolveStop = null;
  promiseStop = null;
  rejectStop = null;
}
function finalizeStopDeferred(err) {
  if (err) {
    if (rejectStop) {rejectStop(err);}
    clearStopDeferred();
  } else {
    if (resolveStop) {
      setTimeout(function () {
        resolveStop();
        clearStopDeferred();
      }, 500);
    }
  }
}

var promiseSend;
var rejectSend;
function finalizeSendDeferred(err) {
  if (rejectSend) {
    if (!err instanceof Error) {
      err = Error(err);
    }
    rejectSend(err);
  }
  rejectSend = null;
  promiseSend = null;
}

socket.io.on('connect_error', function (error) {
  log('manager-connect_error: ' + error);
  finalizeStartDeferred(error);
});

socket.on('error', function(error) {
  log('socket-error: ' + error);
  error = Error(error);

  finalizeStartDeferred(error);
  finalizeStopDeferred(error);
  finalizeSendDeferred(error);

  socket.disconnect();
});

socket.on('disconnect', function(reason) {
  log('socket-disconnect: ' + reason);
  finalizeStartDeferred();
  finalizeStopDeferred();
  finalizeSendDeferred(reason);
});

socket.on('connect', function() {
  log('socket-connect');

  finalizeStartDeferred(null, socket);
});

module.exports = {
  start: function () {
    if (socket.connected) {
      return Promise.resolve(socket);
    }
    if (promiseStart) {
      return promiseStart;
    }

    return promiseStart = new Promise(function(resolve, reject) {
      resolveStart = resolve;
      rejectStart = reject;

      socket.connect();
    });
  },
  stop: function() {
    if (!socket.connected) {
      return Promise.resolve();
    }
    if (promiseStop) {
      return promiseStop;
    }
    return promiseStop = new Promise(function(resolve, reject) {
      resolveStop = resolve;
      rejectStop = reject;

      socket.close();
    });
  },
  on: function(msg, cb) {
    socket.on(msg, cb);
  },
  send: function (msg, params) {
    return this.start().then(function (socket) {
      if (promiseSend) {
        return Promise.reject(Error('another message is still in progress'));
      } else {
        return promiseSend = new Promise(function (resolve, reject) {
          rejectSend = reject;
          socket.emit(msg, params, function (ack) {
            promiseSend = null;
            rejectSend = null;
            if (!ack) {
              reject(Error('no ack'));
            } else if (ack.error) {
              reject(ack.error);
            } else {
              resolve(ack.payload);
            }
          });
        });
      }
    });
  }
};

