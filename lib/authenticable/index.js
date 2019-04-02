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
const validator = require('validator');
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
 * @param {number} opts.encryption_iterations - Number of iteration to use when generating password salt
 * @param {boolean} opts.email_required - tells if email should be set as required 
 * @param {boolean} opts.phone_required - Tells is phone number should be set as required 
 * @param {object} opts.password_policies - Policies to enforce password strength
 * @param {number} opts.password_policies.min_length - Check password min length
 * @param {boolean} opts.password_policies.number - Check is password contain number
 * @param {boolean} opts.password_policies.lowercase - Check is password contain lowercase
 * @param {boolean} opts.password_policies.uppercase - Check is password contain uppercase
 * @param {string[]} opts.aliases - list of fields/attributes to be used during authentication together with the password
 */
function Authenticable(schema, opts={}) {
    // init defaults
    const defaults = {
        encryption_iterations: 10,
        aliases: ['email']
    }

    const options = deepmerge(defaults, opts);

    const fields = {
        email: {
            type: String,
            /**
             * An index that is both sparse and unique prevents collection from
             * having documents with duplicate values for a field but allows 
             * multiple documents that omit the key.
             */
            unique: true,
            sparse: true,
            //lowercase authentication field value before save
            lowercase: true,
            //trim authentication field
            trim: true,
            validate: [validator.isEmail, 'Invalid email address {VALUE}'],
            required: options.email_required ? 'Email is required' : false
        },
        emailVerifiedAt: {
            type: Date,
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true,
            //trim authentication field
            trim: true,
            set: Utils.cleanPhoneNumber,
            // We use E.164 international phone number formatting see https://en.wikipedia.org/wiki/E.164
            match: [/^\+?[1-9]\d{1,14}$/, 'Invalid Phone number {VALUE}'],
            required: options.phone_required ? 'Phone number is required' : false
        },
        phoneVerifiedAt: {
            type: Date
        },
        password: {
            type: String,
            required: 'Password is required',
            hide: true,
            validate: [
                {
                    validator: value => {
                        const policies = options.password_policies;
                        return policies && policies['min_length'] ?
                            value.length > policies['min_length'] : true;
                    },
                    message: `Password need to be atleast ${options.password_policies && options.password_policies['min_length']} characters long`
                },
                {
                    validator: (value) => {
                        const policies = options.password_policies;
                        return policies && policies['has_number'] ? /\d/.test(value) :
                            true;
                    },
                    msg: 'Password must contain atleast one number'
                },
                {
                    validator: value => {
                        const policies = options.password_policies;
                        return policies && policies['has_lowercase'] ?
                            /[a-z]/.test(value) : true;
                    },
                    message: 'Password must contain lowercase character'
                },
                {
                    validator: value => {
                        const policies = options.password_policies;
                        return policies && policies['has_uppercase'] ?
                            /[A-Z]/.test(value) : true;
                    },
                    message: 'Password must contain uppercase character'
                }
            ]
        },
    }

    // add new fields into the schema
    schema.add(fields);

    //--------------------------------------------------------------------------
    //authenticable instance methods
    //--------------------------------------------------------------------------


    /**
     * This instance method called to change/replace user password with the new
     * one passed as the parameter. Prior to persist password, it checks if the
     * new password is valid according password policy if exist.
     * 
     * @param {string} newPassword - New password to replace the old one
     * @return {promise} - promise resolved with model instance or reject with
     * error
     */
    schema.methods.changePassword = function (newPassword) {
        //this refer to the model instance context
        const authenticable = this;

        if (!newPassword) {
            // new password is empty
            return Promise.reject(createError(400, 'New password must be provided'));
        }
        // temporary set password to the instance for validation purpose
        authenticable.password = newPassword;
        return authenticable
            .validate()
            .then(() => Utils.hash(newPassword))
            .then(hash => {
                // set hashed password
                authenticable.password = hash;
                return authenticable.save();
            });
    };

    /**
     * Function to send notification. This function will be 
     * called internal by various modules when it comes time to
     * send out notification to user. 
     * You must overwrite this method yourself to actual send 
     * notification. 
     * When this function reject, its effect depends on where it is called but
     * most of the time it will affect the persistence of the prior actions. So to
     * if notification is not core of the action then consider to make this fn alwasy resolve,
     * Otherwise allow this to resolve or reject.
     * 
     * @returns {Promise} - Resolve when successfully
     */
    schema.methods.sendJabaliNotification = function () {
        return Promise.resolve();
    }


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


