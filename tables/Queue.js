// Queue table — an active queue for a service (Queue Management module)

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const Queue = sequelize.define('Queue', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // 'open' or 'closed'
    status: {
        type: DataTypes.STRING,
        defaultValue: 'open'
    },
    createdDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Queue;
