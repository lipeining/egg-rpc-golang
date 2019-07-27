module.exports = async app => {

    app.ready(async () => {
        const client = app.zk.createClient(app.config.zookeeper.url);
        await client.ready();
    });
    app.on('error', async (err, ctx) => {
        console.log(err);
    });
}