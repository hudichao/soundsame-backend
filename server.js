'use strict';
const corser = require('corser');
const express = require('express');
// const ms = require('mediaserver');
const fs = require('fs');
const path = require('path');
const server = require('http').createServer();

const PORT = process.env.PORT || 3333;

let api = {};
api.musics = require('./api/musics');
api.rooms = require('./api/rooms');

const app = express();
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

const room_id = 2;

app
.get('/api/addSong', (req, res) => {
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
.get('/api/cutSong', (req, res) => {
    api.musics.cut()
    .then(function(result) {
        res.json({success: true});
        broadcast('CUT_SONG', result);
    }, err => {
        res.send(err)
    })
})
.get('/api/raiseSong', (req, res) => {
    let id = parseInt(req.query.id, 10);
    api.musics.raise(id)
    .then(function(result) {
        res.json({success: true});
        broadcast('RAISE_SONG', id);
    }, err => {
        res.send(err)
    })
})
.get('/api/removeSong', (req, res) => {
    let id = parseInt(req.query.id, 10);

    api.musics.remove(id)
    .then(function(result) {
        res.json({success: true});
        broadcast('DELETE_SONG', id);
    }, err => {
        res.send(err)
    })
})
.get('/api/initList', (req, res) => {
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
