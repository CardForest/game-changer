'use strict';

var chai = require("chai");
chai.use(require("chai-as-promised"));
var assert = chai.assert; // jshint ignore:line

describe('game-changer sane socket', function () {
  var client = require('../lib/sane-socket/client');
  var server = require('../lib/sane-socket/server');

  before(function() {
    return server.start().then(function(){
      server.addMessageHandler('ping', function(data, cb) {
        this.emit('pong');
        cb({payload: 'pong'});
      });
      return client.start();
    });
  });

  after(function() {
    return client.stop().then(function(){
       return server.stop();
    });
  });

  it('can do ping-pong with ack', function () {
    return assert.eventually.equal(client.send('ping'), 'pong');
  });

  it('can do ping-pong with listener', function (done) {
    client.on('pong', function () {done();});
    client.send('ping');
  });
});
