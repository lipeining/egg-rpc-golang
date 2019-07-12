// 本系统导出的rpc方法
exports.multi = async function(req) {
    return {
        code: 200,
        message: `from egg rpc stand multi: left:${req.left},right:${req.right}:multi:${Number(req.left)*Number(req.right)}`,
    };
};