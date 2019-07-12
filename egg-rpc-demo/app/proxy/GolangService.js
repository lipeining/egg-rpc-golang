// Don't modified this file, it's auto created by egg-rpc-generator

'use strict';

const path = require('path');

/* eslint-disable */
/* istanbul ignore next */
module.exports = app => {
  const consumer = app.rpcClient.createConsumer({
    interfaceName: 'com.localhost.golang.rpc.test.GolangService',
    targetAppName: 'golang-rpc-demo',
    version: '1.0',
    group: 'SOFA',
    proxyName: 'GolangService',
    responseTimeout: 5000,
  });

  if (!consumer) {
    // `app.config['golang-rpc-demo.rpc.service.enable'] = false` will disable this consumer
    return;
  }

  app.beforeStart(async() => {
    await consumer.ready();
  });

  class GolangService extends app.Proxy {
    constructor(ctx) {
      super(ctx, consumer);
    }

    async echoObj(req) {
      return await consumer.invoke('echoObj', [ req ], { 
        ctx: this.ctx,
      });
    }
  }

  return GolangService;
};
/* eslint-enable */
