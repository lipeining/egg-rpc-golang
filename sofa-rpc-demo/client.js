'use strict';

const { RpcClient } = require('sofa-rpc-node').client;
const { ZookeeperRegistry } = require('sofa-rpc-node').registry;
const logger = console;

// 1. 创建 zk 注册中心客户端
const registry = new ZookeeperRegistry({
    logger,
    address: '127.0.0.1:2181',
});

async function invoke() {
    // 2. 创建 RPC Client 实例
    const client = new RpcClient({
        logger,
        registry,
    });
    // 3. 创建服务的 consumer
    const consumer = client.createConsumer({
        interfaceName: 'com.nodejs.test.TestService',
    });
    // 4. 等待 consumer ready（从注册中心订阅服务列表...）
    await consumer.ready();

    // 5. 执行泛化调用
    const result = await consumer.invoke('plus', [1, 2], { responseTimeout: 3000 });
    console.log('1 + 2 = ' + result);
}

invoke().catch(console.error);

// 'use strict';

// const { RpcClient } = require('sofa-rpc-node').client;
// const logger = console;

// async function invoke() {
//   // 不需要传入 registry 实例了
//   const client = new RpcClient({
//     logger,
//   });
//   const consumer = client.createConsumer({
//     interfaceName: 'com.nodejs.test.TestService',
//     serverHost: '127.0.0.1:12200', // 直接指定服务地址
//   });
//   await consumer.ready();

//   const result = await consumer.invoke('plus', [ 1, 2 ], { responseTimeout: 3000 });
//   console.log('1 + 2 = ' + result);
// }

// invoke().catch(console.error);