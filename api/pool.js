const mysql = require('promise-mysql');
const database = require('../config/database');

var pool = mysql.createPool(database);

var myQuery = function() {
    var args = arguments;
    return new Promise((resolve, reject) => {
        pool.getConnection()
        .then(conn => {
            conn.query.apply(conn, args)
            .then(response => {
                pool.releaseConnection(conn)
                // console.log(response);
                resolve(response);
            }, err => {
                pool.releaseConnection(conn)
                console.log(err)
                reject(err);
            })
        }, err => {
            reject(err);
        });
    });
};

module.exports = myQuery;