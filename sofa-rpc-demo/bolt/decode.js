// decoder
const Writable = require('stream').Writable;
const HEADER_LEN = 10;

class ProtocolDecoder extends Writable {
    constructor(options) {
        super(options);
        this._buf = null;
        this._bufLength = 0;
    }

    _write(chunk, encoding, callback) {
        if (this._bufLength > 0) {
            const total = this._bufLength + chunk.length;
            this._buf = Buffer.concat([this._buf, chunk], total);
            this._bufLength = total;
        } else {
            this._buf = chunk;
            this._bufLength = chunk.length;
        }
        try {
            let unfinish = false;
            do {
                unfinish = this._decode();
            } while (unfinish);
            callback();
        } catch (err) {
            callback(err);
        }
    }

    _decode() {
        if (this._bufLength < HEADER_LEN) {
            return false;
        }
        const bodyLength = this._buf.readInt32BE(6);
        const packetLength = HEADER_LEN + bodyLength;
        if (this._bufLength < packetLength) {
            return false;
        }
        const packet = {
            packetId: this._buf.readInt32BE(1),
            packetType: this._buf[0] === 0 ? 'request' : 'response',
            codec: this._buf[5],
            data: JSON.parse(this._buf.toString('utf8', HEADER_LEN, packetLength)),
        };
        // 这里异步化是为了避免 listener 报错影响到 decoder
        process.nextTick(() => { this.emit(packet.packetType, packet); });
        const restLen = this._bufLength - packetLength;
        this._bufLength = restLen;
        if (restLen) {
            this._buf = this._buf.slice(packetLength);
            return true;
        }
        this._buf = null;
        return false;
    }
}
module.exports = ProtocolDecoder;