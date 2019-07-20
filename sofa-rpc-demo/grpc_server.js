'use strict';

const { GRpcServer } = require('sofa-rpc-node').server;
const antpb = require('antpb');
const protocol = require('sofa-bolt-node');
const logger = console;

// 传入 *.proto 文件存放的目录，加载接口定义
const protoPath = __dirname + '/proto';
const proto = antpb.loadAll(protoPath);
// 将 proto 设置到协议中
protocol.setOptions({ proto });


const server = new GRpcServer({
    logger,
    protocol, // 覆盖协议
    proto,
    codecType: 'protobuf', // 设置默认的序列化方式为 protobuf
    port: 14400,
});

server.addService({
    interfaceName: 'com.localhost.g.rpc.demo.GDemoService',
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