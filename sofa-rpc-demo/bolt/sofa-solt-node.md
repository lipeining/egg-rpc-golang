## encoder
```js

// 这个 encodeOptions 在每次生成数据包时，都会传入 protocol 中，用于控制数据包的格式，数据编码格式
// 
    this.encodeOptions = {
      protocolType: 'bolt',
      codecType,
      boltVersion: 1,
      crcEnable: false,
      proto: options.proto,
      classMap: options.classMap,
      classCache: options.classCache,
    };
    this.sentReqs = options.sentReqs;
// 使用 _limited, queue 控制 this.write ，控制流数据生成速度。
// 当 this.write 返回 false 时，说明，缓冲区已经满了，需要等待 drain 事件，此时 limited = true,
// 当 drain 事件来临后， limited=false，继续写入数据包。
    this._limited = false;
    this._queue = [];
    this.once('close', () => { this._queue = []; });
    this.on('drain', () => {
      this._limited = false;
      do {
        const item = this._queue.shift();
        if (!item) break;

        const packet = item[0];
        const callback = item[1];
        // 对于 rpc 请求，如果已经超时，则不需要再写入了
        if (packet.packetType === 'request' && (Date.now() - packet.meta.start) >= packet.req.timeout) {
          continue;
        }
        this._writePacket(packet, callback);
      } while (!this._limited);
    });
```
encode进行了类型区分：
exports.HEARTBEAT_VALUE = 0;
exports.RPC_REQUEST = 1;
exports.RPC_RESPONSE = 2;
同时也有版本区分 v1,v2
采用cmd的模式，使用继承，避免过多的条件判断
cmd指定自身的header,content,class的格式化方式，其实是
调用codec,SimpleMapSerializer进行编码。
编码是需要分步骤进行的，具体的步骤在于 v1.encode,v2.encode
提供static 的 decode 方式进行解码
这里的方式是通过版本划分读取数据的不同，实际对数据的解码还是使用cmd。
cmd里面是包装 codec 的编码解码方式，
需要传入 proto||classMap 具体需要具体的编码解码方式。

## codec
protobuf是使用antpb中的proto对象，可以获取每一个方法的信息，使用
byteBuffer.put(requestType.encode(requestType.fromObject(cmd.obj.args[0])).finish());
const req = requestType.decode(content);
进行具体的数据解析。
hessian
需要了解hession.js-1

## decoder
```js
// 因为不同的版本里面的数据字段不同，区别在于
// ver1  和 switch
// - __ver1:__ bolt 协议版本，从 v2 开始 proto 不会再变，升级只变这个版本号
// - __switch:__ 是否开启 crc32 校验
const packetLengthFns = {
  1(buf, bufLength) {
    const type = buf[1];
    const headerLength = type === RpcCommandType.RESPONSE ? 20 : 22;
    if (bufLength < headerLength) {
      return 0;
    }
    return type === RpcCommandType.RESPONSE ?
      headerLength + buf.readInt16BE(12) + buf.readInt16BE(14) + buf.readInt32BE(16) :
      headerLength + buf.readInt16BE(14) + buf.readInt16BE(16) + buf.readInt32BE(18);
  },
  2(buf, bufLength) {
    const type = buf[2];
    const headerLength = type === RpcCommandType.RESPONSE ? 22 : 24;
    if (bufLength < headerLength) {
      return 0;
    }
    let len = type === RpcCommandType.oyi
     ?
      headerLength + buf.readInt16BE(14) + buf.readInt16BE(16) + buf.readInt32BE(18) :
      headerLength + buf.readInt16BE(16) + buf.readInt16BE(18) + buf.readInt32BE(20);
    // 如果 crc 校验开启，还需要加 4 bytes
    if (buf[11] === 0x01) {
      len += 4;
    }
    return len;
  },
};
```

