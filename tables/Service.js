// Service table — services offered by the organization (Service Management module)

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const Service = sequelize.define('Service', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    // expected service duration in minutes
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // largest queue size a service can have (people)
    maxSize: {
        type: DataTypes.INTEGER,
        defaultValue: 10
    },
    // 'Low', 'Medium', or 'High'
    priority: {
        type: DataTypes.STRING,
        defaultValue: 'Medium'
    },
    // whether the queue is currently accepting joins
    open: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // scheduled date and time (calendar feature)
    date: {
        type: DataTypes.STRING,
        allowNull: true
    },
    time: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Service;
