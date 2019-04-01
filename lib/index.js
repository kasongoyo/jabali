'use strict';

//dependencies
const path = require('path');
const libPath = path.join(__dirname, 'lib');
const morphsPath = __dirname || path.join(libPath, 'morphs');

//load types

//require morphs
const Authenticable = require(path.join(morphsPath, 'authenticable'));
// var Lockable = require(path.join(morphsPath, 'lockable'));
// var Recoverable = require(path.join(morphsPath, 'recoverable'));
// var Registerable = require(path.join(morphsPath, 'registerable'));
// var Trackable = require(path.join(morphsPath, 'trackable'));

/**
 * @function
 * @description mongoose irina plugin
 * @param  {Schema} schema  valid mongoose schema
 * @param  {Object} options valid mongoose irina plugin options
 * @public
 */
module.exports = exports = function Irina(schema, opts) {
    //prepare common options
    const options = Object.assign({}, {
        confirmable: {
            tokenLifeSpan: 3
        },
        lockable: {
            tokenLifeSpan: 3,
            maximumAllowedFailedAttempts: 3,
            enabled: false
        },
        recoverable: {
            tokenLifeSpan: 3
        },
        registerable: {
            autoConfirm: false
        },
        trackable: {}
    }, opts);

    //morph schema to be authenticable
    // This is the default moduel of this library
    Authenticable.call(null, schema, options);

    // //morph schema to be confirmable
    // Confirmable.call(null, schema, options);

    // //morph schema to be lockable
    // Lockable.call(null, schema, options);

    // //morph schema to be recoverable
    // Recoverable.call(null, schema, options);

    // //morph schema to be registerable
    // Registerable.call(null, schema, options);

    // //morph schema to be trackable
    // Trackable.call(null, schema, options);
};