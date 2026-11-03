// configure and initialize the sequealize connecton to SQLite
const { Sequelize } = require('sequelize');
const path = require('path');

// will use in mem database for tests / otherwise, save to local file --> queueSmart.sqlite
const env = process.env.NODE_ENV || 'development';

// sequelize setup: tests wil use 'sqlite::memory:' so no need to write files
// dev environment will connect to 'queueSmart.sqlite'
const sequelize = env === 'test'
    ? new Sequelize('sqlite::memory:', { logging: false })
    : new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', 'queueSmart.sqlite'),
        logging: false
    });

module.exports = sequelize;
