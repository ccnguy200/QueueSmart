// Notification / History table: every notification sent to a user
// One user has many notifications (the userId link is set up in tables/index.js)

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const NotificationHistory = sequelize.define('NotificationHistory', {
    // each notification gets the next number, so newer ones have bigger ids
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // the account (email) the notification is for
    userName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100]
        }
    },
    // what the notification is about: 'joined' (joined a queue) or 'almost' (almost their turn)
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['joined', 'almost']]
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
    // 'sent' when it is made, 'viewed' after the user opens it on the dashboard
    status: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'sent',
        validate: {
            isIn: [['sent', 'viewed']]
        }
    },
    // when the notification was sent
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
});

module.exports = NotificationHistory;
