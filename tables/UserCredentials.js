// UserCredentials Table

const { DataTypes } = require('sequelize');
const sequelize = require('../configuration/databaseConfig');

const UserCredentials = sequelize.define('UserCredentials', {
    // user will be given unique id
    id: { 
        type: DataTypes.CHAR(36), 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true, 
    },
    // registered email will be unique
    email: { 
        type: DataTypes.STRING(100), 
        allowNull: false, 
        unique: true, 
        validate: {
            isEmail: true,
            notEmpty: true,
            len: [1, 100],
        }
    },
    // encrypted password
    password: { 
        type: DataTypes.STRING(255), 
        allowNull: false, 
        validate: {
            notEmpty: true,
            len: [1, 255],
        },
    },
    // role allocation: 'user' or 'admin;
    // default will be 'user'
    role: { 
        type: DataTypes.STRING(20), 
        allowNull: false,
        defaultValue: 'user',
        validate: {
            isIn: [['user', 'admin']],
        }, 
    },
}, {
    timestamps: true,
    tableName: 'UserCredentials',
});

module.exports = UserCredentials;
