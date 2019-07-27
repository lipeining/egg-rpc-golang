'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const { router, controller } = app;
    router.get('/', controller.home.index);
    router.get('/golang-rpc', controller.home.goRpc);
    router.get('/egg-stand-rpc', controller.home.eggStandRpc);

    router.get('/zoo', controller.zoo.index);
    router.get('/zoo/add', controller.zoo.add);
    router.get('/zoo/remove', controller.zoo.remove);
};