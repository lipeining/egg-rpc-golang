
# egg-plugin
对于sofa-rpc-node包,从包装角度查看插件的使用方法。
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
传入的 delegate 是一个对象，全部的都是 async 方法。egg里面，虽然你可以将每一个 app/rpc 里面的service写作class.
那个class允许注入app等信息，但是，最后，egg会包装为这种方法对象。
同时，也会再本地缓存一个 _services的map，方便查找调用验证。
# 流程解析
正如demo里面的一个普通的server.js的启动一样。
```js
// 1. 创建 zk 注册中心客户端
// 2. 创建 RPC Server 实例
// 3. 添加服务
// 4. 启动 Server 并发布服务
```
这里面，最后相关的信息都会汇聚到server对象中，所以server是一切的协调者，本身就是一个普通的服务器，
然后添加了registry,添加了service,最后启动并且发布服务。
创建的server实例，传入参数里面有registry,logger,其中registry是传递给内部的
每一个service实例中，
server.addService可以不断创建对应的rpc方法实例。
service反向暴露对应的publish方法（底层使用了registry.publish)方法，
通过这样的层层包装，最后，可以通过server.publish来发布方法。
# grpc  server response 的解读
grpc需要一定的http2基础知识，可以参考 http://nodejs.cn/api/http2.html
因为grpc是建立在http2的服务器之上，大多使用protobuf进行通信。
```js
  在registry中发布的地址与sofa-rpc的区别在于协议。
  get url() {
    // uniqueId=&version=1.0&timeout=0&delay=-1&id=rpc-cfg-0&dynamic=true&weight=100&accepts=100000&startTime=1526050447423&pid=13862&language=java&rpcVer=50400
    return 'http://' + this.publishAddress + ':' + this.publishPort + '?' + qs.stringify(this.params);
  }
```
http2的一个主要区别在于对于数据包的处理，因为http2支持长连接，所以可以使用流来处理数据。
grpc主要实现了流的处理。
```js
// 这里使用的协议，
// 1-4这一个无符号整数 存储了body的长度，
// 直到 buf 包含了一个完整的包的时候，才继续处理
// 如果这个方法是有 协议的乎啊， 使用对应的协议解析body,
// 最后更新req
// 在流结束的时候，调用处理方法
    let buf = null;
    stream.on('data', data => {
      if (buf) {
        buf = Buffer.concat([ buf, data ]);
      } else {
        buf = data;
      }

      const total = buf.length;
      if (total < 5) return;

      const bodySize = buf.readUInt32BE(1);
      if (total < bodySize + 5) return;

      const msg = buf.slice(5, bodySize + 5);
      if (methodInfo.requestType) {
        const requestType = methodInfo.resolvedRequestType;
        const arg = requestType.decode(msg);
        req.data.args.push(arg);
      }
      req.meta.size = total;
    });
    stream.on('end', () => {
      this._handleRequest(req, {
        stream,
        methodInfo,
      }).catch(err => { this.emit('error', err); });
    });
```
不管是哪种rpc,sofa-rpc,grpc都统一了res的send方法格式使用
{isError, errorMsg, appResponse}
在各自的response.send方法中，对应的返回客户端请求的结果。
其中appResponse是对应的service.invoke => method.invoke 结果。




# client 实现
构建客户端连接rpc服务器的代理，虚拟出每一个连接的consumer,connection.
同时支持多种 均衡负载 策略。
## RpcClient GRpcClient
```js
  // 确保一个服务只创建一个 consumer
  this._consumerCache = new Map();
  this.connectionManager = new options.connectionManagerClass(options);
  this.connectionManager.on('error', err => { this.emit('error', err); });

  // middlewares
  this._middlewares = []; // 用于 consume r中的 req,res 中间件。
  //  this._consumerCache 的 key
  formatKey(options) {
    const { interfaceName, version, group, serverHost } = options;
    let key = interfaceName + ':' + version + '@' + group;
    if (serverHost) {
      key += '@' + serverHost;
    }
    if (options.targetAppName) {
      key += '@' + options.targetAppName;
    }
    return key;
  }  
```
提供的事件有 error, request, response error 可能是 consumer, connectionManager 的错误
GRpcClient 与 RpcClient 的区别在于对应的connection实现不同
## connection manager
```js
  this._connections = new Map(); // <ip, Connection>
  // 对应的 connection 抽象在这里的逻辑只有
  await conn.ready();
  conn.isConnected
  conn.once('close', () => { this._connections.delete(address.host); });
  conn.once('error', err => { this.emit('error', err); });
  conn.close();// 事件监听会汇报到 this._connections
```

## scheduler
```js
this._timers = new Map(); // <period, timerId>
  // 相同 period 的任务复用相同的定时器，以避免创建大量定时器

  // 传入一个监听函数，返回一个清理函数。
  interval(fn, period, prepend) {
    const eventName = 'period_' + period;
    if (!this._timers.has(period)) {
      const timerId = setInterval(() => {
        this.emit(eventName);
      }, period);
      this._timers.set(period, timerId);
    }
    if (prepend) {
      this.prependListener(eventName, fn);
      // 添加 listener 函数到名为 eventName 的事件的监听器数组的开头。
      // 不会检查 listener 是否已被添加。 多次调用并传入相同的 eventName 和 listener 会导致 listener 被添加多次。
    } else {
      this.on(eventName, fn);
    }
    return () => {
      this.removeListener(eventName, fn);
      if (this.listenerCount(eventName) === 0) {
        const timerId = this._timers.get(period);
        clearInterval(timerId);
        this._timers.delete(period);
      }
    };
  }
```
## request 
```js
// 对于请求的抽象
  assert(data.serverSignature, '[RpcRequest] req.serverSignature is required');
  assert(data.methodName, '[RpcRequest] req.methodName is required');
  assert(data.args, '[RpcRequest] req.args is required');
  assert(data.timeout, '[RpcRequest] req.timeout is required');

// consumer 中的一个 request 生成  
// serverSignature: this.id,
//   get id() {
//     return this.version ? this.interfaceName + ':' + this.version : this.interfaceName;
//   }

```
## dynamic_config
返回的是一个单例的配置实体，可以动态改变。
## circuit_breaker
```js

//  每一个熔断器的 key : this._key = 'RpcConnection@' + this.address.host;

  // 熔断器实现，用于每一个 connection
  // 熔断相关的配置
  circuitBreaker: {
    forceOpen: false,
    forceClosed: false,
    requestVolumeThreshold: 20, // 请求数小于该值不开启熔断
    errorThresholdPercentage: 50, // 开启熔断的阀值
    sleepWindowInMilliseconds: 5000,
  },

  this._healthCounter = HealthCounter.getInstance(key);
  this._healthCounter.on('next', hc => {
    this._hc = hc;
    if (hc.totalCount < this.config.requestVolumeThreshold) {
      // 当前 window 期间，请求量太小，不改变熔断状态
    } else {
      if (hc.errorRate < this.config.errorThresholdPercentage) {
        // 错误率低于熔断阀值，保持原状
        // CLOSED => CLOSED
        // HALF_OPEN 需要等待 single test 的结果
        // OPEN 需要等待一个 sleep window
      } else {
        if (this.status === 'CLOSED') {
          this.status = 'OPEN';
          this._circuitOpened = Date.now();
        }
      }
    }
  });  
  this._circuitOpened 是一个标记值，正常情况下，是 -1. 表示没有熔断。
  如果 this.status='CLOSED'，那么 this._circuitOpened = Date.now() 表示熔断的开始时间，
  之后，在恢复正常时，会判断熔断的时间窗口 sleepWindowInMilliseconds: 5000,
  如果大于窗口值，可以尝试恢复正常，进入 'HALF_OPEN'。
  如果是在 HALF_OPEN 情况下发起请求，那么这个请求就会决定熔断器的状态了。
  update(rpcContext) {
    this._healthCounter.update(rpcContext);
    if (rpcContext.resultCode === '00') {
      this.markSuccess();
    } else {
      this.markNonSuccess();
    }
  }
```
## RpcConnection GRpcConnection
```js

this._socket = net.connect(Number(this.address.port), this.address.hostname);
this._decoder.on('response', res => { this._handleResponse(res); });
  pump(this._encoder, this._socket, this._decoder);
  // --------
  const resPromise = this.await('response_' + id);
  this._sentReqs.set(id, { req, resPromise, timer });  
  // 这样的一个流程，当用户调用 invoke 时，
  // 设置号 timeout 和 _sentReqs 
  // 调用 this._encoder.writeRequest  通过流的方式 pump ,
  // 进入 socket , 会发送给远程服务器，远程服务器返回结果后，进入 decoder中时，
  // decoder 在解析完后，会触发 response 事件
  // 最后会在本对象上触发 `response_${id}` 事件。也就是 resPromise 的返回值。
  _handleResponse(res) {
    const id = res.packetId;
    const reqInfo = this._sentReqs.get(id);
    if (reqInfo) {
      clearTimeout(reqInfo.timer);
      this._sentReqs.delete(id);
      this.emit('response_' + id, res);
    } else {
      this.logger.warn('[RpcConnection] can not find invoke request for response: %j, maybe it\'s timeout.', res);
    }
  }
```
```js
  async invoke(req, options) {
    assert(options && options.proto, '[GRpcConnection] options.proto is required');
    assert(req && req.timeout, '[GRpcConnection] req.timeout is required');
    this._lastActiveTime = this._lastInvokeTime = Date.now();
    req.meta.address = this.address;

    if (!this._circuitBreaker.allowRequest()) {
      const hc = this.latestHealthCount;
      const err = new Error('this request is block by circuit breaker, ' + hc.toString() + ', url: ' + this.url);
      err.name = 'GRpcCircuitBreakerError';
      req.meta.resultCode = '02';
      req.meta.rt = Date.now() - req.meta.start;
      return { error: err };
    }

    const id = utils.nextId();
    const callStream = new CallStream(this._session, options.proto);
    const timer = setTimeout(() => {
      const rt = Date.now() - req.meta.start;
      const err = new Error('no response in ' + rt + 'ms, address:' + this.url);
      err.name = 'GRpcResponseTimeoutError';
      err.req = req;
      err.timeout = req.timeout;
      req.meta.resultCode = '03'; // 超时
      callStream.cancelCall(err);
    }, req.timeout);
    const resPromise = callStream.call(req);
    this._sentReqs.set(id, { req, resPromise, callStream });
    callStream.once('close', () => { this._sentReqs.delete(id); });

    const res = await resPromise;
    clearTimeout(timer);
    this._circuitBreaker.update(req.meta);
    req.meta.rt = Date.now() - req.meta.start;
    return res.data;
  }
  // 重点在 call_stream 其实主要的是 http2Session 的使用
  // 这里是使用了 stream,Duplex 但是，是使用了 内嵌的 http2Session 表现为一个流，
  // 给grpc connection 提供一个 call 方法。
  // 以流的方式，传入 req, 使用 http2Session.request 发起一个 请求，
  // 刷新 http2Stream 
  // 得到了 stream.response 如下：然后，触发 response 事件给 connection
   _attachHttp2Stream(stream) {
    this._http2Stream = stream;
    stream.on('response', (headers, flags) => {
      const status = headers[HTTP2_HEADER_STATUS];
      this._mappedStatusCode = statusMappings[status] != null ? statusMappings[status] : Status.UNKNOWN;
      delete headers[HTTP2_HEADER_STATUS];
      delete headers[HTTP2_HEADER_CONTENT_TYPE];

      /* eslint-disable no-bitwise */
      if (flags & NGHTTP2_FLAG_END_STREAM) {
        /* eslint-enable no-bitwise */
        this._handleTrailers(headers);
      } else {
        try {
          this._responseMetadata.fromHttp2Headers(headers);
        } catch (e) {
          this.cancelCall(e);
        }
      }
    });

    stream.on('data', data => {
      if (this._buf) {
        this._buf = Buffer.concat([ this._buf, data ]);
      } else {
        this._buf = data;
      }

      const total = this._buf.length;
      if (total < 5) return;

      const bodySize = this._buf.readUInt32BE(1);
      if (total < bodySize + 5) return;

      const msg = this._buf.slice(0, 5 + bodySize);
      if (this._canPush) {
        if (!this.push(msg)) {
          this._canPush = false;
          this._http2Stream.pause();
        }
      } else {
        this._unpushedReadMessages.push(msg);
      }

      if (total === bodySize + 5) {
        this._buf = null;
      } else {
        this._buf = this._buf.slice(5 + bodySize);
      }
    });
    stream.on('trailers', headers => {
      this._handleTrailers(headers);
    });
    stream.on('end', () => {
      this.push(null);
      stream.close(NGHTTP2_NO_ERROR);
    });
    stream.once('close', () => {
      this._handleClose();
    });
    stream.on('error', err => {
      this._endCall(err);
    });
  }
```
## consumer
主要提供一个 egg 似的请求包装， 
通过 address_group 管理全部的连接，在 invoke 的时候，使用 koa-compose 合并后的
请求，进行 _handleRequest。 _invoke 中会使用 获取一个连接，然后发起请求。
```js
  createContext(req) {
    const id = this.id;
    return {
      req,
      res: { error: null, appResponse: null },
      get path() {
        return '/rpc/' + id + '/' + req.methodName;
      },
      get body() {
        return this.res.appResponse;
      },
      set body(val) {
        this.res.appResponse = val;
      },
    };
  }
```
## address_group
```js
  // 每个 window 周期更新一遍权重，权重区间 [0, 10]，0 代表地址被摘除了
  this.ready(err => {
    if (!err && !this._closed) {
      // HealthCounter.getInstance(key, prepend) prepend => false，确保 avgCounter 在最后触发
      this._healthCounter = HealthCounter.getInstance(this.key, false);
      this._healthCounter.on('next', hc => {
        try {
          this._onNext(hc);
        } catch (err) {
          this.emit('error', err);
        }
      });
      this._retryFaultAddresses();
    }
  });
  // 统计整个分组地址列表的健康状态
  // 主要区分 连接 是否 存活， 连接的 latestHealthCount 结合配置来计算 是否需要降级
  // 有一点需要注意的是 conn.heartbeat, conn.resetCounter
  // 会发送心跳包和重置计数器，为什么呢？
  _onNext(hc) {
  }

  // 表明上的定时任务，其实是使用 sleep 来控制重连，为什么会 refresh 通过 refresh 
  // 刷新 // 故障地址和权重都重置一下
    // 定时重连失败的地址（这个时间不能太短）
  async _retryFaultAddresses() {
    await sleep(this.options.retryFaultInterval);

    while (!this._closed) {
      if (this._faultAddressMap.size) {
        const addressList = Array.from(this._faultAddressMap.values());
        this.logger.debug('[AddressGroup] retry connect to fault addresses%s', printAddresses(addressList));
        await this._connectAll(addressList);
      }
      // 如果重连以后还是有失败的地址，并且存在未被选中的地址，则尝试替换一波
      if (this._faultAddressMap.size) {
        this.refresh();
      }
      await sleep(this.options.retryFaultInterval);
    }
  }
```

# metric
```js
//consumer.js中的使用
// 获取连接时，确定了对应的connectionGroup
  async getConnection(req) {
    return await this._addressGroup.getConnection(req);
  }
  // 这里的key是每一个consumer的formatKey
  // address_group.getConnection
  async getConnection(req) {
    const meta = req.meta;
    meta.connectionGroup = this.key;

    const address = this._loadbalancer.select(req);
    if (!address) return null;

    const { connectionOpts, connectionClass } = this.options;
    return await this.connectionManager.createAndGet(address, connectionOpts, connectionClass);
  }

// consumer.js 中 _hadleRequest
HealthCounter.getInstance(req.meta.connectionGroup).update(req.meta);
```

```js
  // metric: {
  //   // 滑动窗口的 bucket 个数
  //   numBuckets: 6,
  //   // 每个 bucket 的大小（时间跨度）
  //   bucketSizeInMs: 10000,
  // },
  // 每10秒钟，计算一次 最新值 latestValue
  // 通过取这 numBuckets 的数组 buckets 不断地reduce求和，得到
  // totalCount,    errorCount
  // 之后可以计算。
  // 然后窗口就shift()滑动一下
  // 然后在 bucketSizeInMs 时间内，可以通过 update 方法不断地更新这时间内的
  // 各种resultCode的值，用于之后的计算 totalCount, errorCount
Scheduler.instance.interval(() => {
      this.latestValue = this.buckets.reduce(this.reduceBucket, this.getEmptyOutputValue());
      this.emit('next', this.latestValue);

      this.buckets.shift();
      this.buckets.push(this.getEmptyBucketSummary());
    }, this.bucketSizeInMs, prepend);
```

# 服务注册
https://www.yuque.com/egg/nodejs/mhgl9f
```js
 interface RegistryBase {
  async register(config: any): void;
  register方法用于向registry注册自己拥有的rpc方法，也就是注册发布者，在对应的发布者路径下创建一个路径。
  这里是已经固定为_buildProviderPath方法返回值了。
  如何体现自己的参数要求呢？
  通过传入的config,至少要有一个url，用于生成的[子路经]，在providers之下，
  之后其他客户端通过subscribe watch providers路径时，可以得到更新后的子路经
  async unRegister(config: any): void;
  不再发布该rpc接口之后，直接在registry中删除该路径即可。对应的消费者会得到通知。
  subscribe(config: any, listener: function): void;
  通过向registry订阅interfaceName的全部方法，然后watch子路经的变化，得到
  方法的变动，记录到subscribeMap中，
  unSubscribe(config: any, listener: function): void;
  清理事件监听。
  async close(): void;

  这里的 urlStr 是 register方法的config.url 举例一个：
  service.js 中的reg
  normalizeReg(urlStr) {
    const url = new URL(urlStr);
    url.searchParams.set('interface', this.interfaceName);
    url.searchParams.set('version', this.version);
    url.searchParams.set('group', this.group);
    const reg = {
      interfaceName: this.interfaceName,
      version: this.version,
      group: this.group,
      url: url.toString(),
    };
    return reg;
  }
  这里的consumber是subscribe方法的config
  需要比对的值如下。
    _isMatch(consumer, urlStr) {
    const url = new URL(urlStr);
    const providerInfo = url.searchParams || {};
    const interfaceName = providerInfo.get('interface') || url.pathname.slice(1);
    if (interfaceName && consumer.interfaceName !== interfaceName) {
        return false;
    }
    const category = providerInfo.get('category');
    if (category && category !== 'providers') {
        return false;
    }
    const enabled = providerInfo.get('enabled');
    if (enabled && enabled !== 'true') {
        return false;
    }
    const consumerGroup = consumer.group;
    const consumerVersion = consumer.version;
    const providerGroup = providerInfo.get('group') || providerInfo.get('default.group');
    const providerVersion = providerInfo.get('version') || providerInfo.get('default.version');
    if (consumerGroup && providerGroup && consumerGroup !== providerGroup) {
        return false;
    }
    if (consumerVersion && providerVersion && consumerVersion !== providerVersion) {
        return false;
    }
    return true;
    }
  _buildProviderPath(config) {
    return this._rootPath + config.interfaceName + '/providers';
  }

  _buildConsumerPath(config) {
    return this._rootPath + config.interfaceName + '/consumers';
  }
}
```
使用了多进程模块的APIClientBase，用于协调多进程。
定义的dataClient是提供上述的几个方法。
address = options.address.slice(0, idx);
this._rootPath = options.address.slice(idx);
传入的 address 是可以加上对应的 rootPath 的，表示这个registry的zookeeper根目录。
DataClient里面维护一个_zkClient 【对于createClient的附加参数{cluster,auInfo}有疑问。】
维护下面两个map
```js
this._subscribeMap = new Map(); 
// <interfaceName, addressList>
this._registerMap = new Map(); 
// 可以用于再次注册 _reRegister
// <path, config> config.interfaceName, config.url
const path = providerPath + '/' + urlencode.encode(config.url);
this._registerMap.set(path, config);
```
registry方法会再本地缓存一份 path 与 config 的映射。在远程的zookeeper 只对 path 有效
内容为 empty。是否创建 持久 节点，是根据options决定的。


对于订阅 
subscribe(config, listener) 
传入 config.interfaceName [version] [group] [protocol] [uniqueId] [timeout] [appName]
```js
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
```
为什么之前对 config.proxy.js里面的接口信息做了group分组就会导致无法找到valid providers呢
因为在isMatch接口里面，config,与 url里面的group无法匹配，需要审查这里的group逻辑。
因为 server 可以指定自己的group,那么这个server对应的services也是同一个group.最好的参数列表在
egg-rpc-base/config/default.js中查看。
而这个server的group与自己指定的proxy中的services的group不对应的话，那么无法订阅了。也就是会出现找不到provider的问题。
```js
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
```
// 添加对应的接口事件监听。传入addressList
this.on(interfaceName, listener);
listener 在 回调里面是拿到了 addressList。怎么使用呢？
其他组件是如何使用这个registry的呢？
1.在server/service.js中使用了
```js
  normalizeReg(urlStr) {
    const url = new URL(urlStr);
    url.searchParams.set('interface', this.interfaceName);
    url.searchParams.set('version', this.version);
    url.searchParams.set('group', this.group);
    const reg = {
      interfaceName: this.interfaceName,
      version: this.version,
      group: this.group,
      url: url.toString(),
    };
    return reg;
  }

  每一个service都有同样的url。
  // uniqueId=&version=1.0&timeout=0&delay=-1&id=rpc-cfg-0&dynamic=true&weight=100&accepts=100000&startTime=1526050447423&pid=13862&language=java&rpcVer=50400
  bolt://10.32.5.208:12200?startTime=1562904130493&pid=8093&uniqueId=&dynamic=true&appName=&timeout=3000&serialization=hessian2&weight=100&accepts=100000&language=nodejs&rpcVer=50400
  但是使用normalizeReg之后，不同之处在于interfaceName。  
  自己的服务名称由自己定义 addService(interfaceName, delegate)
  这里发布一个服务之后，又自己订阅了自己，为什么呢？
  应该是验证自己已经成功发布了吧，在listener中获取到的addresList是一个valid provider
  然后，href = bolt://10.32.5.208:12200 
  正是自己的提供服务地址，只要存在，说明已经在registry中存在了，可以取消自己的订阅了。
  仅仅用于验证发布成功。
  /**
   * 发布到注册中心
   *
   * @param {String} url - 发布的 url
   * @return {Promise} promise
   */
  publish(url) {
    if (!this.registry) return Promise.resolve();

    const reg = this.normalizeReg(url);
    this.publishUrl = reg.url;
    return this.registry.register(reg)
      .then(() => {
        return new Promise(resolve => {
          const listener = addressList => {
            const exists = addressList.some(addr => {
              return new URL(addr).href.includes(url);
            });
            if (exists) {
              this.registry.unSubscribe(reg, listener);
              resolve();
            }
          };

          this.registry.subscribe(reg, listener);
        });
      });
  }

  /**
   * 取消发布
   * @return {void}
   */
  unPublish() {
    if (!this.registry || !this.publishUrl) return Promise.resolve();

    const reg = this.normalizeReg(this.publishUrl);
    return this.registry.unRegister(reg);
  }
```
2.在consumer.js中使用了
```js
  get registryConfig() {
    return {
      protocol: 'bolt',
      interfaceName: this.interfaceName,
      version: this.version,
      group: this.group,
      appName: this.targetAppName,
      timeout: this.options.responseTimeout,
    };
  }
  this._addressListener = addressList => {
    this._addressGroup.addressList = addressList.map(url => this.parseUrl(url));
  };
  this.registry.subscribe(this.registryConfig, this._addressListener);
```
