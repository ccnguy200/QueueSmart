// temporary code for running unit test - will remove before merge

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const Queue = sequelize.define('Queue', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'open' // 'open' or 'closed'
    }
});

module.exports = Queue;
