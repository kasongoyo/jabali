'use strict';

//dependencies
const path = require('path');

//load types

//require modules
const Authenticable = require(path.join(__dirname, 'authenticable'));
const Recoverable = require(path.join(__dirname, 'recoverable'));
const Registerable = require(path.join(__dirname, 'registerable'));
const Confirmable = require(path.join(__dirname, 'confirmable'));

/**
 * @function
 * @description mongoose jabali plugin
 * @param  {Schema} schema  valid mongoose schema
 * @param  {Object} options valid jabali plugin options
 * @public
 */
module.exports = function Jabali(schema, opts) {
    //prepare common options
    const options = Object.assign({}, opts);

    // default module, registerable
    Registerable.call(null, schema, options.registerable);
    // authenticable module
    Authenticable.call(null, schema, options.authenticable);
    // confirmable module
    Confirmable.call(null, schema, options.confirmable);
    // recoverable module
    Recoverable.call(null, schema, options.recoverable);
};