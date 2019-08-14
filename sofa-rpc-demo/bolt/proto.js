// // ---------------------
// // Request Packet

// 0     1     2           4           6           8          10           12          14         16
// +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
// |proto| type| cmdcode   |ver2 |   requestId           |codec|        timeout        |  classLen |
// +-----------+-----------+-----------+-----------+-----------+-----------+-----------+-----------+
// | headerLen |      contentLen       |                             ... ...                       |
// +-----------+-----------+-----------+                                                           +
// |               className + header  + content  bytes                                            |
// +                                                                                               +
// |                               ... ...                                                         |
// +-----------------------------------------------------------------------------------------------+

// // Response Packet

// 0     1     2     3     4           6           8          10           12          14         16
// +-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
// |proto| type| cmdcode   |ver2 |   requestId           |codec|respstatus |  classLen | headerLen |
// +-----------+-----------+-----------+-----------+-----------+-----------+-----------+-----------+
// |       contentLen      |                  ... ...                                              |
// +-----------------------+                                                                       +
// |                          header  + content  bytes                                             |
// +                                                                                               +
// |                               ... ...                                                         |
// +-----------------------------------------------------------------------------------------------+


// const net = require('net');
// const socket = net.connect(12200, '127.0.0.1');
// const encoder = protocol.encode();
// const decoder = protocol.decode();

// encoder.pipe(socket).pipe(decoder);

// decoder.on('request', req => {});
// decoder.on('response', res => {});

// encoder.writeRequest({ ... });
// encoder.writeResponse({ ... });