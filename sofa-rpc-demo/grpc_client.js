'use strict';

const antpb = require('antpb');
const protocol = require('sofa-bolt-node');
const { GRpcClient } = require('sofa-rpc-node').client;
const logger = console;

// 传入 *.proto 文件存放的目录，加载接口定义
const protoPath = __dirname + '/proto';
const proto = antpb.loadAll(protoPath);
// 将 proto 设置到协议中
protocol.setOptions({ proto });


async function invoke() {
    const client = new GRpcClient({
        logger,
        protocol,
        serverHost: 'http://localhost:14400/',
        proto,
    });
    const consumer = client.createConsumer({
        interfaceName: 'com.localhost.g.rpc.demo.GDemoService',
    });
    await consumer.ready();

    const result = await consumer.invoke('sum', [{
        left: 6,
        right: 7,
    }], { responseTimeout: 3000 });
    console.log(result);
}

invoke().catch(console.error);