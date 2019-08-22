'use strict';

/**
* @name Authenticable
* Authenticable is responsible to authenticate/sign in the account and to 
* change account password.
* It extends the mongoose schema by adding the followings; 
*/

// dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const createError = require('http-errors');
const deepmerge = require('deepmerge');

/**
 * 
 * Authenticable by default use email-password combination for authentication
 * but user can customize this behaviour by defining fields s/he need to be 
 * used during authentication using alias options which is an array with fields
 * name to be used during authentication.
 *  
 * @param {object} schema - mongoose schema 
 * @param {object} opts - Authenticable options
 * @param {string[]} opts.aliases - list of fields/attributes to be used during authentication together with the password
 */
function Authenticable(schema, opts = {}) {
    // init defaults
    const defaults = {
        aliases: ['email']
    }

    const options = deepmerge(defaults, opts);

    /**
     * Jabali use this function to check if confirmable logics block authentication.
     * It is overwritten in the confirmable module to return message based
     * on confirmable logics. If confirmable module is not plugged then it will
     * always return empty message which means nothing from confirmable block authentication 
     * to proceed. Forexample confirmable can decide not to allow authentication for
     * unconfirmed accounts after grace period i.e the period, account is allowed to
     * access application resources before confirmation.
     * @private
     */
    schema.methods.confirmableBlockAuthenticationMessage = function () {
        return '';
    }

    /**
     * Static function to handle authentication. It takes username and password
     * as parameters where by username can be email, password or any field 
     * specified in authentication aliases. It return promise which resolve 
     * with authenticable instance on success or reject with error on fails.
     * 
     * @param {string} username - username to authenticate, it represent any 
     * field from authenticable aliases 
     * @param {string} password - password
     * 
     */
    schema.statics.authenticate = function (username, password) {
        //this refer to the model static
        const Authenticable = this;
        if(!username || !password){
            return Promise.reject(createError(400, 'Invalid authentication data'));
        }
        const { aliases } = options;
        const credentials = aliases.map(field => ({ [field]: username }));
        const users = credentials
            .map(credential => Authenticable.findOne(credential).exec());

        return Promise
            .all(users)
            .then(result => {
                return result.filter(user => user !== null);
            })
            .then(users => {
                if (!users.length) {
                    throw new createError(404, 'User not found');
                }
                return users;
            })
            .then(users => {
                return Promise.all(users.map(user => Utils
                    .compare(password, user.password)
                    .then(match => {
                        if (match) {
                            return user;
                        } else {
                            return;
                        }
                    })))
            })
            .then(users => {
                return users.find(user => user !== undefined)
            })
            .then(authenticable => {
                if (!authenticable) {
                    throw new createError(400, 'Invalid user password');
                }
                const confirmableBlockMessage = authenticable
                    .confirmableBlockAuthenticationMessage();
                if (confirmableBlockMessage) {
                    throw new createError(401, confirmableBlockMessage);
                }
                return authenticable;
            });
    }
}


module.exports = Authenticable;


