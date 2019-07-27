'use strict';

/** @type Egg.EggPlugin */
module.exports = {
    // had enabled by egg
    // static: {
    //   enable: true,
    // }
    rpc: {
        enable: true,
        package: 'egg-rpc-base',
    },
    zookeeper: {
        enable: true,
        package: 'egg-zookeeper',
    },
};