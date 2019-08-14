// encoder
const ByteBuffer = require('byte');
const Transform = require('stream').Transform;
const bb = ByteBuffer.allocate(1024 * 1024);
let id = 0;

class ProtocolEncoder extends Transform {
    constructor(options) {
        super({ writableObjectMode: true });
    }

    async writeRequest(req) {
        return this._doTransform('request', req);
    }

    async writeResponse(res) {
        return this._doTransform('response', res);
    }

    _doTransform(packetType, data) {
        const packetId = id++;
        return new Promise(resolve => {
            this.once(`tranform_${packetType}_${packetId}`, resolve);
            this.write(Object.assign({
                packetId,
                packetType,
            }, { data }));
        }).then((result) => {
            // console.log('promise result', result);
            if (result.error) {
                throw result.error;
            }
            return result;
        });
    }

    _transform(packet, encoding, callback) {
        const { packetId, packetType, data } = packet;
        // console.log('encode: data: ', data);
        const result = {
            packetId,
            packetType,
            data: null,
            error: null,
        };
        try {
            bb.reset();
            bb.put(packetType === 'request' ? 0 : 1);
            bb.putInt(packetId);
            bb.put(1);
            bb.skip(4);
            bb.putRawString(JSON.stringify(data));
            const bodyLength = bb.position() - 10;
            bb.putInt(6, bodyLength);
            result.data = bb.array();
            callback(null, result.data);
        } catch (err) {
            result.error = err;
        }
        this.emit(`tranform_${packetType}_${packetId}`, result);
    }
}
module.exports = ProtocolEncoder;