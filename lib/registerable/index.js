'use strict';

/**
 * @file
 * @name Registerable
 * Registerable is responsible for everything related to registering a new
 * resource (ie user sign up).
 * It extends mongoose with the following fields
 *  + registeredAt
 *  + unregisteredAt
 */

// dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const validator = require('validator');
const createError = require('http-errors');
const deepmerge = require('deepmerge');

/** 
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
function Registerable(schema, opts = {}) {
    // init defaults
    const defaults = {};

    const options = deepmerge(defaults, opts);

    const fields = {
        // track when registration occur
        registeredAt: {
            type: Date,
            default: null,
            hide: true
        },
        // track when account has been unregistered
        unregisteredAt: {
            type: Date,
            default: null,
            hide: true
        },
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

    //add registerable schema fields
    schema.add(fields);

    /**
     * Function that is called during account registeration. User can overwrite
     * this method to change registration behavior. This function must return 
     * user instance or promise that resolve with user instance. 
     * You can use this function for example to set autoConfirm true for user with email 
     * from certain domain as the result registration will not bother with 
     * account confirmation details.
     * @example
     * schema.methods.preSignup = function(){
     *    const user = this;
     *    if(user.email.contains('company.com')){
     *       user.autoConfirm = true;
     *    }
     *    return user;
     * }
     * @returns {Object} - User/account instance
     */
    schema.methods.preSignup = function () {
        const user = this;
        return user;
    }


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
        const registerable = this;

        if (!newPassword) {
            // new password is empty
            return Promise.reject(createError(400, 'New password must be provided'));
        }
        // temporary set password to the instance for validation purpose
        registerable.password = newPassword;
        return registerable
            .validate()
            .then(() => Utils.hash(newPassword))
            .then(hash => {
                // set hashed password
                registerable.password = hash;
                return registerable.save();
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
     * Create new resource
     * @param  {Object} profile valid account credentials and additional details 
     *                            as per schema definition.
     * @return {Promise}  

     */
    schema.statics.register = function (profile) {
        //this refer to model static context
        const Registerable = this;
        // Initialize registerable document
        const user = new Registerable(profile);

        return user
            .validate()
            .then(() => {
                //encrypt password
                return Utils
                    .hash(user.password)
                    .then(hash => {
                        user.password = hash;
                        return user;
                    });
            })
            .then(registerable => {
                // execut preSignup trigger
                return registerable.preSignup();
            })
            .then(registerable => {
                //generate confirmation token if schema is confirmable
                if (registerable.generateConfirmationToken) {
                    if (registerable.autoConfirm) {
                        registerable.confirmedAt = new Date();
                        return registerable;
                    }
                    return registerable.generateConfirmationToken();
                }
                return registerable;
            })
            .then(registerable => {
                //set registering time
                registerable.registeredAt = new Date();
                //create registerable
                return registerable.save();
            })
            .then(registerable => {
                if (registerable.confirmationToken) {
                    // account has confirmation token, send it out
                    return registerable.sendConfirmationInstructions();
                }
                return registerable;
            });
    };

    /**
     * 
     * Unregister a given account.
     * This function must be called within model instance context
     *              
     */
    schema.statics.unregister = function (criteria) {
        //this refer to model static context
        const Registerable = this;


        //TODO fire events
        //before unregister
        //and
        //after unregister

        return Registerable
            .findOne(criteria)
            .exec()
            .then(account => {
                //set unregistered date
                account.unregisteredAt = new Date();
                //save unregistered details
                return account.save();
            });
    };
}

// export the module
module.exports = Registerable;