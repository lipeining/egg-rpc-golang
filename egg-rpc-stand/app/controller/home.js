'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
    async index() {
        const { ctx } = this;
        ctx.body = 'hi, egg';
    }
    async goRpc() {
        const { ctx } = this;
        const res = await ctx.proxy.golangService.echoObj({
            name: 'egg->go',
            group: 'A',
        });
        ctx.body = res;
    }
    async eggDemoRpc() {
        const { ctx } = this;
        const { query } = ctx.request;
        const res = await ctx.proxy.eggDemoService.sum({
            left: query.left,
            right: query.right,
        });
        ctx.body = res;
    }
}

module.exports = HomeController;