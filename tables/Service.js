// temporary code for running unit test - will remove before merge

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const Service = sequelize.define('Service', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    serviceName: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    description: { 
        type: DataTypes.TEXT, 
        allowNull: false 
    },
    expectedDuration: { 
        type: DataTypes.INTEGER, 
        allowNull: false // calculated duration in minutes
    },
    priorityLevel: { 
        type: DataTypes.STRING, 
        defaultValue: 'medium' // 'low', 'medium', or 'high'
    }
});

module.exports = Service;
