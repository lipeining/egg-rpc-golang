// Don't modified this file, it's auto created by egg-rpc-generator

'use strict';

const path = require('path');

/* eslint-disable */
/* istanbul ignore next */
module.exports = app => {
  const consumer = app.rpcClient.createConsumer({
    interfaceName: 'com.localhost.egg.rpc.stand.EggStandService',
    targetAppName: 'egg-rpc-stand',
    version: '1.0',
    group: 'SOFA',
    proxyName: 'EggStandService',
    responseTimeout: 5000,
  });

  if (!consumer) {
    // `app.config['egg-rpc-stand.rpc.service.enable'] = false` will disable this consumer
    return;
  }

  app.beforeStart(async() => {
    await consumer.ready();
  });

  class EggStandService extends app.Proxy {
    constructor(ctx) {
      super(ctx, consumer);
    }

    async multi(req) {
      return await consumer.invoke('multi', [ req ], { 
        ctx: this.ctx,
      });
    }
  }

  return EggStandService;
};
/* eslint-enable */
