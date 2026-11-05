// Notification / History table — tracks system activity (notifications) and
// queue-participation history (served / left / missed)

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const NotificationHistory = sequelize.define('NotificationHistory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // the account (email) the record is for
    userName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    // what the notification is about: 'joined' or 'almost' (null for history records)
    type: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    // the text the user sees (null for history records)
    message: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    // the queue entry it is about (so "almost your turn" is only sent once per entry)
    queueEntryId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    // 'sent' when made, 'viewed' after the user opens it
    status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'sent'
    },
    // when the record was created
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    // --- queue-participation history fields (served / left / missed) ---
    service: {
        type: DataTypes.STRING,
        allowNull: true
    },
    outcome: {
        type: DataTypes.STRING,
        allowNull: true
    },
    wait: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    date: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = NotificationHistory;
