
'use strict';
const path = require('path');
const Confirmable = require(path.join(__dirname, 'lib', 'confirmable'));
const Lockable = require(path.join(__dirname, 'lib', 'lockable'));
const Registerable = require(path.join(__dirname, 'lib', 'registerable'));
const Recoverable = require(path.join(__dirname, 'lib', 'recoverable'));
const Trackable = require(path.join(__dirname, 'lib', 'trackable'));

module.exports = {
    Confirmable,
    Lockable,
    Registerable,
    Recoverable,
    Trackable
}