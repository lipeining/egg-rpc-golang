
## server实现
关键在于 如何处理请求 req，如何统一接口模式，无论是 grpc,或者是sofa-rpc ，
都能自适应的处理 request,生成response,同时，兼容事件处理功能。
现在此处都是使用了 sdk-base 作为模块开发。遵循对应的生命周期，实现合理的subscribe,publish。

### 流程解析

### grpc  server response 的解读


## 服务注册

##