// temporary code for running unit test - will remove before merge

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const NotificationHistory = sequelize.define('NotificationHistory', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    message: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'sent' // 'sent' or 'viewed'
    }
});

module.exports = NotificationHistory;
