'use strict';

const Controller = require('egg').Controller;
const _rootPath = '/sofa-rpc/';
const defaultOptions = {
  interfaceName: 'com.nodejs.test.TestService',
  version: '1.0',
  group: 'SOFA',
};
const urlencode = require('urlencode');
const url = require('url');
const qs = require('querystring');
const EMPTY = Buffer.from('');
const zookeeper = require('zookeeper-cluster-client');
const CreateMode = zookeeper.CreateMode;
class HomeController extends Controller {
  /**
     * @param {String} interfaceName
     */
  async index() {
    const { ctx, app, config } = this;
    const client = app.zk.instances.get(config.zookeeper.url);
    const { query } = ctx.request;
    // console.log(query.provider);
    // const path = query.provider ?
    //     _buildProviderPath(Object.assign({}, query, defaultOptions)) :
    //     _buildConsumerPath(Object.assign({}, query, defaultOptions));
    const path = _buildProviderPath(Object.assign({}, query, defaultOptions));
    // const path = _buildConsumerPath(Object.assign({}, query, defaultOptions));
    const children = await listChildren(client, path);
    ctx.body = children;
  }
  async add() {
    const { ctx, app, config } = this;
    const client = app.zk.instances.get(config.zookeeper.url);
    const { query } = ctx.request;
    const providerPath = _buildProviderPath(Object.assign({}, query, defaultOptions));
    // version:1.0, interfaceName,
    const searchParams = Object.assign({}, { name: 'zoo', msg: 'haha', id: query.id || randomId() }, defaultOptions);
    const providerUrl = `bolt://10.32.5.208:12222?${qs.stringify(searchParams)}`;
    const path = `${providerPath}/${urlencode(providerUrl)}`;
    await client.mkdirp(providerPath);
    console.log(path);
    await client.create(path, EMPTY, CreateMode.EPHEMERAL);
    ctx.body = decodeURIComponent(path);
  }
  async remove() {
    const { ctx, app, config } = this;
    const client = app.zk.instances.get(config.zookeeper.url);
    const { query } = ctx.request;
    const providerPath = _buildProviderPath(Object.assign({}, query, defaultOptions));
    ctx.body = await removeChildren(client, providerPath);
  }
}
async function removeChildren(client, path) {
  const children = await client.getChildren(path);
  for (const child of children) {
    await client.remove(`${path}/${child}`);
  }
  return children;
}
async function listChildren(client, path) {
  // const children = await client.getChildren(
  //     path,
  //     event => {
  //         console.log('Got watcher event: %s', event);
  //         listChildren(client, path);
  //     });
  const children = await client.getChildren(path);
  console.log('Children of %s are: %j.', path, decodeURIComponent(children));
  return children;
}

function randomId() {
  return Math.ceil(Math.random() * 100);
}

function _buildProviderPath(config) {
  return _rootPath + config.interfaceName + '/providers';
}

function _buildConsumerPath(config) {
  return _rootPath + config.interfaceName + '/consumers';
}
module.exports = HomeController;
