const config = {};
config.registryOptions = {
    logger: console,
    address: '127.0.0.1:2181',
};
config.protoPath = __dirname + '/proto';

module.exports = config;