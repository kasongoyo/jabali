'use strict';

/**
* @name Authenticable
* Authenticable is responsible to authenticate/sign in the account and to 
* change account password.
* It extends the mongoose schema by adding the followings; 
*  + email - email field
*  + phoneNumber - phone number field
*  + emailVerifiedAt - email verification time
*  + phoneNumberVerifiedAt - phone number verification time
*  + password - password field
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
function Authenticable(schema, opts={}) {
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
        const {aliases} = options;
        const credentials = aliases.map(field => ({ [field]: username }));
        const users = credentials
            .map(credential => Authenticable.findOne(credential).exec());

        return Promise
            .all(users)
            .then(result => {
                return result.find(user => user !== null);
            })
            .then(authenticable => {
                if (!authenticable) {
                    throw new createError(404, 'User not found');
                }
                const confirmableBlockMessage = authenticable
                    .confirmableBlockAuthenticationMessage();
                if (confirmableBlockMessage) {
                    throw new createError(401, confirmableBlockMessage);
                }
                return Utils
                    .compare(password, authenticable.password)
                    .then(match => {
                        if (match) {
                            return authenticable;
                        } else {
                            throw new createError(400, 'Invalid user password');
                        }
                    })
            });
    }
}


module.exports = Authenticable;


