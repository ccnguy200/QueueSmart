// Tables - userProfile.js

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const UserProfile = sequelize.define('UserProfile', {
    id: { 
        type: DataTypes.CHAR(36), 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true, 
    },
    userId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
        references: {model: 'UserCredentials', key: 'id'},
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    fullName: { 
        type: DataTypes.STRING(255), 
        allowNull: false, 
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
    },
    email: { 
        type: DataTypes.STRING(255), 
        allowNull: false, 
        validate: {
            isEmail: true,
            notEmpty: true,
            len: [1, 100],
        },
    },
    contactInfo: { 
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {len: [0, 255]}, 
    },
    preferences: { 
        type: DataTypes.TEXT, 
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'UserProfile',
});

module.exports = UserProfile;
