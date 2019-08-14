// 构建一个输入，输出流即可。
const ProtoEncoder = require('./encode');
const ProtoDecoder = require('./decode');
const stream = require('stream');
const encoder = new ProtoEncoder();
const decoder = new ProtoDecoder();

encoder.pipe(decoder);

decoder.on('request', req => {
    console.log('get request----------------------------');
    console.log(req);
});
decoder.on('response', res => {
    console.log('get response----------------------------');
    console.log(res);
});
const RequestBody = { name: 'request' };
const ResponseBody = { name: 'response' };
let coin = true;
setInterval(async () => {
    const req = Object.assign({}, { number: Math.random(), time: Date.now() }, RequestBody);
    const res = Object.assign({}, { number: Math.random(), time: Date.now() }, ResponseBody);
    try {
        if (coin) {
            await encoder.writeRequest(req);
        } else {
            await encoder.writeResponse(res);
        }
    } catch (err) {
        console.log('--------------------interval-------------');
        console.log(err);
    }
    coin = !coin;
}, 5000);