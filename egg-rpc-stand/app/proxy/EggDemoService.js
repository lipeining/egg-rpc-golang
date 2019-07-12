// Don't modified this file, it's auto created by egg-rpc-generator

'use strict';

const path = require('path');

/* eslint-disable */
/* istanbul ignore next */
module.exports = app => {
  const consumer = app.rpcClient.createConsumer({
    interfaceName: 'com.localhost.egg.rpc.demo.EggDemoService',
    targetAppName: 'egg-rpc-demo',
    version: '1.0',
    group: 'SOFA',
    proxyName: 'EggDemoService',
    responseTimeout: 5000,
  });

  if (!consumer) {
    // `app.config['egg-rpc-demo.rpc.service.enable'] = false` will disable this consumer
    return;
  }

  app.beforeStart(async() => {
    await consumer.ready();
  });

  class EggDemoService extends app.Proxy {
    constructor(ctx) {
      super(ctx, consumer);
    }

    async sum(req) {
      return await consumer.invoke('sum', [ req ], { 
        ctx: this.ctx,
      });
    }
  }

  return EggDemoService;
};
/* eslint-enable */
