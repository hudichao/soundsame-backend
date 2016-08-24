var query = require('./pool.js');

function use(id) {
    query('select count(*) from rooms where room_id=?', id)
    .then(response => {
        //  如果没有则新建
        if (response[0]['count(*)'] === 0) {
            connection.query('insert into rooms set ?', {
                room_id: id,
                created: Date.now()
            })
        }
    }, err => {
        throw err;
    });
}


module.exports = {
    use
};