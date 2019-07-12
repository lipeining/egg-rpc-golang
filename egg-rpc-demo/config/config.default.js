/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
    /**
     * built-in config
     * @type {Egg.EggAppConfig}
     **/
    const config = exports = {};

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1562233166725_8896';

    // add your middleware config here
    config.middleware = [];

    // add your user config here
    const userConfig = {
        // myAppName: 'egg',
    };
    config.cluster = {
        listen: {
            port: 7001,
            hostname: '127.0.0.1',
        }
    };
    config.rpc = {
        registry: {
            address: '127.0.0.1:2181', // configure your real zk address
        },
        client: {
            responseTimeout: 5000,
        },
        server: {
            // 我们提供的rpc服务,提供的定义在app.baseDir/proto中
            // EggService.proto 的package 需要对应吧
            namespace: 'com.localhost.egg.rpc.demo',
            port: 12200,
        },
    };
    // 硬负载
    // config['golang-rpc-demo.rpc.service.url'] = '';
    // config['egg-rpc-stand.rpc.service.url'] = 'http://127.0.0.1:13300';
    return {
        ...config,
        ...userConfig,
    };
};