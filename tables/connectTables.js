// will connect all table relationships and export them togetehr

const sequelize = require('../config/database');
const UserCredentials = require('./UserCredentials');
const UserProfile = require('./UserProfile');
const Service = require('./Service');
const Queue = require('./Queue');
const QueueEntry = require('./QueueEntry');
const NotificationHistory = require('./NotificationHistory');

// foreign key relationships

// UserCredentials <--> UserProfile (one to one)
UserCredentials.hasOne(UserProfile, { foreignKey: 'userId' });
UserProfile.belongsTo(UserCredentials, { foreignKey: 'userId' });

// Service <--> Queue (one to many)
Service.hasMany(Queue, { foreignKey: 'serviceId' });
Queue.belongsTo(Service, { foreignKey: 'serviceId' });

// Queue <--> QueueEntry (one to many)
Queue.hasMany(QueueEntry, { foreignKey: 'queueId' });
QueueEntry.belongsTo(Queue, { foreignKey: 'queueId' });

// UserCredentials <--> QueueEnrty (one to many)
UserCredentials.hasMany(QueueEntry, { foreignKey: 'userId' });
QueueEntry.belongsTo(UserCredentials, { foreignKey: 'userId' });

// UserCredentials <--> NotificationHistort (one to many)
UserCredentials.hasMany(NotificationHistory, { foreignKey: 'userId' });
NotificationHistory.belongsTo(UserCredentials, { foreignKey: 'userId' });

// export connection and all tables
module.exports = {
    sequelize,
    UserCredentials,
    UserProfile,
    Service,
    Queue,
    QueueEntry,
    NotificationHistory
};
