'use strict';

const antpb = require('antpb');
const protocol = require('sofa-bolt-node');
const { RpcServer } = require('sofa-rpc-node').server;
const { ZookeeperRegistry } = require('sofa-rpc-node').registry;
const logger = console;

// 传入 *.proto 文件存放的目录，加载接口定义
const protoPath = __dirname + '/proto';
const proto = antpb.loadAll(protoPath);
// 将 proto 设置到协议中
protocol.setOptions({ proto });

const registry = new ZookeeperRegistry({
    logger,
    address: '127.0.0.1:2181',
});

const server = new RpcServer({
    logger,
    protocol, // 覆盖协议
    registry,
    codecType: 'protobuf', // 设置默认的序列化方式为 protobuf
    port: 13300,
});

server.addService({
    interfaceName: 'com.localhost.sofa.rpc.demo.SofaDemoService',
}, {
    async sum(req) {
        return {
            code: 200,
            message: `hello left:${req.left}, right:${req.right}, total: ${Number(req.left)+Number(req.right)}`,
        };
    },
});
server.start()
    .then(() => {
        server.publish();
    });