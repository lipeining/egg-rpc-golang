// 本系统导出的rpc方法
exports.sum = async function(req) {
    return {
        code: 200,
        message: `from egg rpc demo sum: left:${req.left},right:${req.right}:total:${Number(req.left)+Number(req.right)}`,
    };
};