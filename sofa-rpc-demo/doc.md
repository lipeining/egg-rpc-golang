
# egg-plugin
对于sofa-rpc-node包的使用包装角度查看插件的实现方式。
## app.js - agent.js
在 extend 中扩展了对应的app.rpcRegistry,app.rpcServer,app.rpcClient对象，
同时确定了对应的生命周期的启动关闭，避免内存问题。
```js
  // 载入到 app.proxyClasses 
  // 这里的方法是将 proxy加载到ctx.proxy中。
  // 使用了 egg-rpc-generator 生成的默认proxy代码，
  // 在对应的service中封装了一个consumer用于之后的invoke调用。
  app.loader.loadToContext(path.join(app.config.baseDir, 'app/proxy'), 'proxy', {
    call: true,
    caseStyle: 'lower',
    fieldClass: 'proxyClasses',
  });

  // 本系统提供的 rpc 服务的加载。会在 server 中的load()方法进行解析，之后注册到sofa-rpc-server中去。
  const paths = app.loader.getLoadUnits().map(unit => path.join(unit.path, 'app/rpc'));
  app.loader.loadToApp(paths, 'rpcServices', {
    call: true,
    caseStyle: 'camel', // 首字母不变
  });
```
## proxy
app.Proxy 的封装，需要传入对应的 consumer,仅初始化作用。业务代码由具体的 rpc 方法决定
## server
// 如果是 selfPublish 单独创建 registry 连接来发布服务
需要等待 app.rpcServices 加载之后，使用 RpcServer进行  addService ---- 接口发布publish 
需要重写自己的 createContext 方法，之后在 RpcServer 中调用时，可以适应各种继承的server的context.
## client
对于RpcClient的封装，用于创建consumer,同时使用 RpcClient的consumer的全部功能。
## mock_connection - application.unittest.js
用于测试，生成本地 fake 链接 对象，实现对应的proxy 方法和 service 用于测试调用。






# server实现
关键在于 如何处理请求 req，如何统一接口模式，无论是 grpc,或者是sofa-rpc ，
都能自适应的处理 request,生成response,同时，兼容事件处理功能。
现在此处都是使用了 sdk-base 作为模块开发。遵循对应的生命周期，实现合理的subscribe,publish。
 hession => classMap 
 proto => protobuf  
两个协议 会使得 decode,encode 使用不同的实例。
但是在server层次，只是都保留对应的数据，一般只有其中一个。具体的到具体的connection进行维持。
## connection.js
connection是 服务提供者抽象 主要处理decode,encode，然后将socket里面得到的
各种消息进行向上传递，比如：收到 request,heartbeat等。
也可以手动关闭连接。
能够向 客户端 返回数据的只有connection.send方法。
## server.js
```js
  getConnections(callback) {
    if (callback) {
      callback(null, this._connections.size);
    }
  }
```
异步获取服务器的当前并发连接数。当 socket 被传递给子进程时工作。
回调函数的两个参数是 err 和 count。
server 是提供给外部的，由外部进行 server.start.server.publish,server.unplish等工作。
server = net.createServer() 会维持自己的每一个 socket的连接，记录到this._connections(Map).
每当server.on('connection')，会使用
this._handleSocket(socket)
在这里将原始的socket传入connection.js中，构建一个抽象的连接实体。
然后反向监听对应的需要的消息，如 request 使用统一的_handleRequest处理每一个请求。对应的gRpc会重写自己的_handleRequest。
```js
conn.on('request', req => {
  this._handleRequest(req, conn).catch(err => {
    err.req = req;
    this.emit('error', err);
  });
});
conn.once('close', () => { this._connections.delete(key); });
```
在_handleRequest中，其实是构建对应的context，用于service的invoke
处理完之后，生成自己的response返回体，然后
this.emit('response', { ctx, req, res });返回部分信息给server的监听。
符合普遍的server事件模型。具体可以参考 http://nodejs.cn/api/net.html
```js
server.addService(info, delegate)方法
server.addService({
    interfaceName: 'com.nodejs.test.TestService',
}, {
    async plus(a, b) {
        return a + b;
    },
});
```
传入的 delegate 是一个对象，全部的都是async 方法。egg里面，虽然你可以将每一个app/rpc 里面的service写作class.
那个class允许注入app等信息，但是，最后，egg会包装为这种方法对象。
同时，也会再本地缓存一个 _services的map，方便查找调用验证。
# 流程解析

# grpc  server response 的解读


# 服务注册
https://www.yuque.com/egg/nodejs/mhgl9f
```js
 interface RegistryBase {
  async register(config: any): void;

  async unRegister(config: any): void;

  subscribe(config: any, listener: function): void;

  unSubscribe(config: any, listener: function): void;

  async close(): void;
}
使用了多进程模块的APIClientBase，用于协调多进程。
定义的dataClient是提供上述的几个方法。
address = options.address.slice(0, idx);
this._rootPath = options.address.slice(idx);
传入的 address 是可以加上对应的 rootPath 的，表示这个registry的zookeeper根目录。
DataClient里面维护一个_zkClient 【对于createClient的附加参数{cluster,auInfo}有疑问。】
维护下面两个map
this._subscribeMap = new Map(); // <interfaceName, addressList>
this._registerMap = new Map(); // <path, config> config.interfaceName, config.url
    const path = providerPath + '/' + urlencode.encode(config.url);
    this._registerMap.set(path, config);
registry方法会再本地缓存一份 path 与 config 的映射。在远程的zookeeper 只对 path 有效
内容为 empty。是否创建 持久 节点，是根据options决定的。


对于订阅 
subscribe(config, listener) 
传入 config.interfaceName [version] [group] [protocol] [uniqueId] [timeout] [appName]

this._zkClient.watchChildren(providerPath, (err, children) => {
    if (err) {
        this.emit('error', err);
        return;
    }
    // 这里的decode其实是对上面的path的decode。因为这个register变动了，zookeeper会收到变动的children，也就是path
    // 不过需要使用isMatch筛选与这个config相关的路径变动。
    const originAddressList = children.map(url => urlencode.decode(url));
    const addressList = originAddressList.filter(url => this._isMatch(config, url));
    this.logger.info('[ZookeeperRegistry] receive interface:%s:%s@%s address list (%d):\n%s\nvalid providers (%d):\n%s',
        config.interfaceName, config.version || '', config.group || '',
        originAddressList.length, formatAddrs(originAddressList), addressList.length, formatAddrs(addressList));
    this._subscribeMap.set(interfaceName, addressList);
    this.emit(interfaceName, addressList);
});
实例log:
[ZookeeperRegistry] receive interface:com.nodejs.test.TestService:1.0@SOFA address list (1):
  - bolt://10.32.5.208:12200?startTime=1562904130493&pid=8093&uniqueId=&dynamic=true&appName=&timeout=3000&serialization=hessian2&weight=100&accepts=100000&language=nodejs&rpcVer=50400&protocol=&interface=com.nodejs.test.TestService&version=1.0&group=SOFA
valid providers (1):
  - bolt://10.32.5.208:12200?startTime=1562904130493&pid=8093&uniqueId=&dynamic=true&appName=&timeout=3000&serialization=hessian2&weight=100&accepts=100000&language=nodejs&rpcVer=50400&protocol=&interface=com.nodejs.test.TestService&version=1.0&group=SOFA

为什么之前对 config.proxy.js里面的接口信息做了group分组就会导致无法找到valid providers呢
因为在isMatch接口里面，config,与 url里面的group无法匹配，需要审查这里的group逻辑。

const consumerPath = this._buildConsumerPath(config);
const consumerUrl = fmt('%s://%s?uniqueId=%s&version=%s&pid=%s&timeout=%s&appName=%s&serialization=%s&startTime=',
    config.protocol || 'bolt', localIp, config.uniqueId || '', '1.0', process.pid, config.timeout, config.appName || '', Date.now());

const path = consumerPath + '/' + urlencode.encode(consumerUrl);
this._zkClient.mkdirp(consumerPath)
    .then(() => {
        return this._zkClient.create(path, EMPTY, CreateMode.EPHEMERAL);
    })
    .catch(err => {
        this.logger.warn('[ZookeeperRegistry] create consumerPath: %s failed, caused by %s', path, err.message);
    });

// 添加对应的接口事件监听。传入addressList
this.on(interfaceName, listener);
listener 在 回调里面是拿到了 addressList。怎么使用呢？
其他组件是如何使用这个registry的呢？
1.在server/service.js中使用了
2.在consumer.js中使用了

```
