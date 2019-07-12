'use strict';

const { app, assert, mm } = require('egg-mock/bootstrap');

describe('test/client.test.js', () => {
    it('should app.mockProxy ok', async function() {
        app.mockProxy('GolangService', 'echoObj', async function(req) {
            return `hello ${req.name} your group is ${req.group} from mock`;
        });

        const ctx = app.createAnonymousContext();
        const res = await ctx.proxy.golangService.echoObj({
            name: 'egg->go',
            group: 'A',
        });
        assert(res === 'hello egg->go your group is A from mock');
    });
});