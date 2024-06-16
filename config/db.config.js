const mysql = require('mysql');

const dbCon = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_bags'
});

dbCon.connect(function(error){
    if(error) throw error;
    console.log('Database connected successfully!!');
})

module.exports = dbCon;