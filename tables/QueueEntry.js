// will track each user appt that is waiting in an active queue

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const QueueEntry = sequelize.define('QueueEntry', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    userName: { 
        type: DataTypes.STRING, 
        defaultValue: 'Student' 
    },
    service: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    position: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    estimatedWaitTime: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 // calculated wait time in minutes
    },
    queueDate: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    queueTime: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'waiting' // 'waiting', 'served', or 'canceled'
    }
});

module.exports = QueueEntry;
