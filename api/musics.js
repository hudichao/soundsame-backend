'use strict';
var query = require('./pool.js');
var _ = require('lodash');
var logger = require('tracer').colorConsole();

function add(obj) {
    // 如果当前没有在播的歌，这首歌为在播，否则放到队列中。
    return new Promise((resolve, reject) => {
        query('select count(*) from musics where room_id = ? and status = ?', [obj.room_id, 'playing'])
        .then(function(response) {
            var insertObj = {
                room_id: obj.room_id,
                song_id: obj.song_id,
                name: obj.name,
                image: obj.image,
                src: obj.src,
                status: 'waiting',
                added: Date.now()
            };

            if (response[0]['count(*)'] > 0) {
                query('insert into musics set ?', insertObj)
                .then(response => {
                    insertObj.id = response.insertId;
                    resolve(insertObj);
                }, err => {
                    reject(err);
                });
            } else {
                insertObj.status = 'playing';
                insertObj.startTime = Date.now();
                query('insert into musics set ?', insertObj)
                .then(response => {
                    insertObj.id = response.insertId;
                    insertObj.isActive = true;
                    resolve(insertObj);
                }, err => {
                    reject(err);
                })
            }
        }, err => {
            reject(err);
        });
    });
}

function cut() {
    var room_id = 2;
    return new Promise((resolve, reject) => {
        // 当前正在播放的歌设为已播放
        query('update musics set status = ? where room_id = ? and status = ?', ['passed', room_id, 'playing'])
        .then(response => {
            logger.log(response.affectedRows);
            if (response.affectedRows === 0) {
                // 说明已经有人设了
                reject('ok');
            }
            // 将队列中的第一首歌（如果有的话）设为正在播放
            query('select * from musics where room_id = ? and status = ? order by added limit 1', [room_id, 'waiting'])
            .then(response => {
                logger.log(response);
                if (response.length === 0) {
                    resolve({});
                }
                logger.log(response[0]);
                var data = response[0];
                var id = data.id;
                var src = data.src;
                var image = data.image;
                var name = data.name;
                var added = data.added;
                let time =  Date.now().toString();

                query('update musics set status = ?, startTime = ? where id = ?', ['playing', time, id])
                .then(response => {
                    var output = {
                        startTime: time,
                        id: id,
                        src: src,
                        image: image,
                        name: name,
                        added: added
                    };
                    logger.log(output);
                    resolve(output);
                }, err => {
                    reject(err);
                    logger.log(err);
                });
            }, err => {
                reject(err);
                logger.log(err);
            });
            
        }, err => {
            reject(err);
            logger.log(err);
        });
    });
}

function raise(id) {
    return query('update musics set added = ? where id = ?', [Date.now(), id]);
}

function remove(id) {
    return query('update musics set status = ? where id = ?', ['deleted', id]);
}

function getData(roomId) {
    logger.log('try to get data');
    var  result = {};
    var p1 = query(`select * from musics where room_id = ${roomId} and status = 'passed' order by added desc limit 5`);

    var p2 = query(`select * from musics where room_id = ${roomId} and status = 'playing' limit 1`);

    var p3 = query(`select * from musics where room_id = ${roomId} and status = 'waiting' order by added`);


    return Promise.all([p1, p2, p3]).then(values => {
        logger.log('finish get data');
        result.oldSongs = _.reverse(values[0]);
        result.activeSong = values[1][0] || {};
        result.songs = values[2];
        return Promise.resolve(result);
    }, err => {
        logger.log(err);
    });

}

module.exports = {
    add,
    cut,
    raise,
    remove,
    getData
};