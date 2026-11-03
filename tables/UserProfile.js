// temporary code for running unit test - will remove before merge

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const UserProfile = sequelize.define('UserProfile', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    fullName: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    contactInfo: { 
        type: DataTypes.STRING 
    },
    preferences: { 
        type: DataTypes.STRING 
    }
});

module.exports = UserProfile;
