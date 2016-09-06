var query = require('./pool.js');
var logger = require('tracer').colorConsole();

function register(obj) {
    var name = obj.name;
    var password = obj.password;
    return new Promise((resolve, reject) => {
        query('select * from users where name = ?', [obj.name])
        .then(response => {
            if (response.length === 0) {
                query('insert into users set ?', {
                    name: name,
                    password: password
                })
                .then(response => {
                    resolve('done');
                }, err => {
                    reject(err);
                })
            } else {
                reject('用户名已存在');
            }
        }, err => {
            reject(err);
        })
    })
}

function login(obj) {
    var name = obj.name;
    var password = obj.password;

    return new Promise((resolve, reject) => {
        query('select * from users where name = ? and password = ?', [obj.name, obj.password])
        .then(response => {
            if (response.length === 0) {
                reject();
            } else {
                var result = {};
                result = {
                    name: response[0].name,
                    nickname: response[0].nickname
                };
                logger.log(response[0].name);
                resolve(result);
            }
       }) 
    })
}

module.exports = {
    register,
    login
};
