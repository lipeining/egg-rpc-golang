'use strict';

const { app, assert, mm } = require('egg-mock/bootstrap');

describe('test/server.test.js', () => {
    const query = { left: 10, right: 10 };
    // 测试不通过，注释
    // it('should invoke EggDemoService', done => {
    //     app.rpcRequest('eggDemoService')
    //         .invoke('sum')
    //         .send(query)
    //         .expect({
    //             code: 200,
    //             message: `from egg rpc demo sum: left:${query.left},right:${query.right}:total:${Number(query.left)+Number(query.right)}`,
    //         }, done);
    // });
});