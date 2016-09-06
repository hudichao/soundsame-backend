'use strict';
// 允许cors
const corser = require('corser');
const express = require('express');
// const ms = require('mediaserver');
const fs = require('fs');
const path = require('path');
const server = require('http').createServer();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const jwtToken = require('./config/jwt.js').secret;

const PORT = process.env.PORT || 3333;

let api = {};
api.musics = require('./api/musics');
api.rooms = require('./api/rooms');
api.users = require('./api/users');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
// .get('/music', (req, res) => {
//     ms.pipe(req, res, src);
// });

app.use(corser.create());

const wss = require('./ws')(server);

function broadcast(type, data) {
    console.log('向所有人发送', type, data);
    wss.clients.forEach(client => {
        client.send(JSON.stringify({type: type, data: data}));
    });
}

// 从token中获取room_id, user_id。
// 每个请求获取这个信息。
var apiRoutes = express.Router();


app.use('/api', apiRoutes);

//------------ 不受token保护的api
apiRoutes
.post('/login', (req, res) => {
    var user = {
        name: req.body.name,
        password: req.body.password
    };
    api.users.login(user)
    .then(data => {
        console.log('successs');
        var token = jwt.sign(data, jwtToken, {
            expiresIn: '24h'
        })
        console.log(token);
        res.json({
            success: true,
            token: token
        })
    }, err => {
        res.send('无user')
    })
})
.post('/register', (req, res) => {
    var user = {
        name: req.body.name,
        password: req.body.password
    };
    api.users.register(user)
    .then(data => {
        res.json({
            success: true
        })
        console.log('注册成功')
    }, err => {
        console.log('注册失败' + err)
    })
})

//------------ 下面都是受token保护的url


apiRoutes.use((req, res, next) => {
    var token = req.body._token || req.query._token || req.headers['x-access-token'];

    // 401 you need login
    if (!token) {
        return res.status(403).send({
            success: false,
            message: 'No token provided'
        });
    }
    jwt.verify(token, jwtToken, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                success: false,
                message: 'invalid token'
            })
        }
        // if token valid -> save it to request for use in other routes
        req.decoded = decoded;
        next();
    })
});

apiRoutes
.get('/addSong', (req, res) => {
    let room_id = req.query.room_id;
    if (!room_id) {
        res.send('no room');
    }
    let data = {
        room_id: room_id,
        song_id: req.query.song_id,
        name: req.query.name,
        src: req.query.src,
        image: req.query.image
    };
    api.musics.add(data)
    .then(function(result) {
        res.json({success: true});

        if (result.isActive) {
            broadcast('ADD_ACTIVE_SONG', result);
        } else {
            broadcast('ADD_SONG', result);
        }
    })

})
.get('/cutSong', (req, res) => {
    let room_id = req.query.room_id;
    if (!room_id) {
        res.send('no room');
    }
    api.musics.cut()
    .then(function(result) {
        res.json({success: true});
        broadcast('CUT_SONG', result);
    }, err => {
        res.send(err)
    })
})
.get('/raiseSong', (req, res) => {
    let room_id = req.query.room_id;
    if (!room_id) {
        res.send('no room');
    }
    let id = parseInt(req.query.id, 10);
    api.musics.raise(id)
    .then(function(result) {
        res.json({success: true});
        broadcast('RAISE_SONG', id);
    }, err => {
        res.send(err)
    })
})
.get('/removeSong', (req, res) => {
    let room_id = req.query.room_id;
    if (!room_id) {
        res.send('no room');
    }
    let id = parseInt(req.query.id, 10);

    api.musics.remove(id)
    .then(function(result) {
        res.json({success: true});
        broadcast('DELETE_SONG', id);
    }, err => {
        res.send(err)
    })
})
.get('/initList', (req, res) => {
    let room_id = req.query.room_id;
    if (!room_id) {
        res.send('no room');
    }
    api.musics.getData(room_id)
    .then(data => {
        res.json({
            songs: data.songs,
            oldSongs: data.oldSongs,
            activeSong: data.activeSong,
            startTime: data.startTime
        })
    }, err => {
        res.send(err);
    })
})


server
.on('request', app)
.listen(PORT, () => {
    console.log(`监听${PORT}端口`);
});

