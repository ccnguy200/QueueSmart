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
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    // 'joined' (joined a queue), 'almost' (almost their turn), or 'history' (queue-participation record)
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['joined', 'almost', 'history']]
        }
    },
    // the text the user sees
    message: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
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
        defaultValue: 'sent',
        validate: {
            isIn: [['sent', 'viewed']]
        }
    },
    // when the record was created
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    // --- queue-participation history fields (set when type is 'history') ---
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
