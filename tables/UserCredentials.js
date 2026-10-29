// temporary code for running unit test - will remove before merge

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const UserCredentials = sequelize.define('UserCredentials', {
    // user will be given unique id
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    // registered email will be unique
    email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
    },
    // encrypted password
    password: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    // role allocation: 'user' or 'admin;
    // default will be 'user'
    role: { 
        type: DataTypes.STRING, 
        defaultValue: 'user' 
    }
});

module.exports = UserCredentials;
