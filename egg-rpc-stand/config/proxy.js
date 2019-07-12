'use strict';

module.exports = {
    errorAsNull: false,
    responseTimeout: 5000,
    services: [{
        appName: 'golang-rpc-demo',
        api: {
            GolangService: {
                interfaceName: 'com.localhost.golang.rpc.test.GolangService',
                version: '1.0',
                // group: 'golang',
                // errorAsNull: false,
                // responseTimeout: 5000,
                // method: {
                //     echoObj: {
                //         responseTimeout: 10000,
                //     },
                // },
            },
        },
    }, {
        appName: 'egg-rpc-demo',
        api: {
            EggDemoService: {
                interfaceName: 'com.localhost.egg.rpc.demo.EggDemoService',
                version: '1.0',
                // group: 'egg-rpc-demo',
                // errorAsNull: false,
                // responseTimeout: 5000,
                // method: {
                //     echoObj: {
                //         responseTimeout: 10000,
                //     },
                // },
            },
        },
    }],
};