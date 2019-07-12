'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    router.get('/', controller.home.index);
    router.get('/golang-rpc', controller.home.goRpc);
    router.get('/egg-stand-rpc', controller.home.eggStandRpc);
};