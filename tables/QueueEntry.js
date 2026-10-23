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
    // wait time will be in minutes
    estimatedWaitTime: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0
    },
    queueDate: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    queueTime: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    // status can be 'waiting', 'served', or 'canceled'
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'waiting'
    }
});

module.exports = QueueEntry;
