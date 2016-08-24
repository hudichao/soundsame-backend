const socketServer = require('ws').Server;
module.exports = function(server) {
    const wss = new socketServer({server: server});

    wss.on('connection', ws => {
        console.log('client connected');

        ws.on('message', data => {
            console.log('从用户获取', data);
            data = JSON.parse(data);

            if (data.type === 'CHAT') {
                wss.clients.forEach(client => {
                    console.log('向所有人发送', data);
                    client.send(JSON.stringify({type: 'CHAT', data: data.data}));
                });
            }

        });

        ws.on('close', () => {
            console.log('client quit');
        });
    });
    return wss;
}
