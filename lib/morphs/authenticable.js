'use strict';

//dependencies
const path = require('path');
const _ = require('lodash');
const Utils = require(path.join(__dirname, '..', 'utils'));
const validator = require('validator');

/**
 * @constructor
 *
 * @description Holds common settings for authentication.
 *              See {@link http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Authenticatable|Authenticable}
 * 
 * @param {Schema} schema  valid mongoose schema
 * @param {Object} options valid authenticable plugin options
 * @public
 */
module.exports = exports = function Authenticable(schema, options) {
    //prepare options
    options = options || {};

    //prepare password encryption iteration
    options.encryptionIterations = options.encryptionIterations || 10;

    //prepare authentication field
    options.authenticationField = options.authenticationField || 'email';
    options.authenticationFieldType = options.authenticationFieldType || 'String';

    //prepare passoword field
    options.passwordField = options.passwordField || 'password';

    //prepare error messages
    options.errorMessage = options.errorMessage ||
        'Incorrect ' + options.authenticationField + ' or ' + options.passwordField;

    //prepare send methods
    options.send = options.send || schema.methods.send || function (type, authenticable) {
        return Promise.resolve();
    };

    //prepare schema fields
    const authenticationFields = {};

    //prepare authentication field
    if (options.authenticationField === 'email') {
        authenticationFields[options.authenticationField] = {
            type: String,
            unique: true,
            //lowercase authentication field value before save
            lowercase: true,
            //trim authentication field
            trim: true,
            validate: [validator.isEmail, 'Invalid email address {VALUE}'],
            required: options.authenticationField + ' is required'
        };
    } else {
        if (options.authenticationFieldProperties) {
            authenticationFields[options.authenticationField] = options.authenticationFieldProperties;
        } else {
            authenticationFields[options.authenticationField] = {
                type: String,
                unique: true,
                //lowercase authentication field value before save
                lowercase: true,
                //trim authentication field
                trim: true,
                required: options.authenticationField + ' is required'
            };
        }
    }

    //prepare password field
    authenticationFields[options.passwordField] = {
        type: String,
        required: options.passwordField + ' is required',
        //hide password when toJSON is called on model
        //Warn!: current this depend on mongoose-hidden plugin
        hide: true
    };

    //add authentibale fields into schema
    schema.add(authenticationFields);

    //--------------------------------------------------------------------------
    //authenticable instance methods
    //--------------------------------------------------------------------------


    /**
     * @function
     * @dscription hash account password and set it as current password.
     *             This method must be called within model instance context
     *
     * @return Promise resolve with authenticable or reject with error
     * @private
     */
    schema.methods.encryptPassword = function () {
        //this refer to the model insatnce context
        const authenticable = this;

        return Utils
            .hash(authenticable.password, options.encryptionIterations)
            .then(hash => {
                authenticable.password = hash;
                return authenticable;
            });
    };


    /**
     * @description implementation of notification send. Default implementation
     *              is `noop`, since send of notification rely on the nature of
     *              application. Schema must implement send and pass it as options
     * @type {Function}
     */
    schema.methods.send = options.send;


    /**
     * Instance method to compare the given password to the currect encrypted password
     * @param password {string} - password text
     * @return Promise resolve with result or reject with error
     * @private
     */
    schema.methods.comparePassword = function (password) {
        //this refer to the model instance context
        const authenticable = this;

        return Utils
            .compare(password, authenticable.password);
    };

    /**
     * @function
     * @description change the existing instance password to the new one
     *              This method must be called within model instance context
     *
     * @param  {String}   newPassword      new instance password to be set-ed
     * @param {changePassword~callback} done callback that handles the response.
     * @return Promise resolve with authenticable or reject with error
     * @private
     */
    schema.methods.changePassword = function (newPassword, done) {
        //this refer to the model instance context
        const authenticable = this;

        if (!newPassword) {
            const error = new Error('No ' + options.passwordField + ' provided');
            return Promise.reject(error);
        }

        //set new password
        authenticable.password = newPassword;

        //encrypt new password
        return authenticable
            .encryptPassword()
            .then(authenticable => {
                return authenticable.save();
            });
    };
    //documentation for `done` callback of `changePassword`
    /**
     * @description a callback to be called when change password is done
     * @callback changePassword~callback
     * @param {Object} error any error encountered during change password
     * @param {Object} authenticable authenticable instance if `password`
     *                               changed successfully
     */



    /**
     * 
     * 
     * @param {String|Object} error Error result due to password comparison
     * @param {Object} auth Authenticable object
     * @param {Object} options options 
     * @returns Promise ~ return rejected promise with error
     */
    function handleComparePwdError(error, auth, options) {
        //restore authenticable to current instance
        //to prevent undefined when password dont match
        const authenticable = auth;

        //remember raised password error
        const passwordError = error;

        if (options.lockable.enabled) {
            //update failed attempts
            authenticable.failedAttempts =
                authenticable.failedAttempts + 1;

            //is failed attempts exceed 
            //maximum allowed attempts
            const failedAttemptsExceed =
                authenticable.failedAttempts >=
                options.lockable.maximumAllowedFailedAttempts;

            if (failedAttemptsExceed) {
                //lock account
                //and
                //throw account locked error
                //authenticable.lock is blindly assumed to 
                //exist since options.lockable.enables is true
                //so no need to check if lockable
                return authenticable
                    .lock()
                    .then(() => {
                        //lock account and throw exception
                        throw new Error('Account locked. Check unlock instructions sent to you.');
                    });
            } else {
                //failed attempts are less than 
                //maximum allowed failed attempts
                //
                //save authenticable and
                //return password does not match error
                return authenticable
                    .save()
                    .then(() => {
                        throw passwordError;
                    });
            }
        } else {
            return Promise.reject(passwordError);
        }
    }

    /**
     * @description authenticate this instance. If authentication failed
     *              update failed attempts and return corresponding error
     *              else reset failed attempts and return authenticable
     * 
     * @param  {String}   password password of this authenticable
     * @return Promise resolve with authenticable or reject with error
     * @private
     */
    schema.methods.authenticate = function (password) {
        //this context is of model instance
        const auth /*authenticable*/ = this;
        if (auth.isLocked) {
            // schema is lockable, check if account is locked 
            const accountLocked = auth.isLocked();
            if (accountLocked) {
                return Promise.reject(new Error('Account locked. Check unlock instructions sent to you.'));
            }
        }
        return auth
            .comparePassword(password)
            .then(match => {
                if (match) {
                    const authenticable = auth;
                    // clear previous failed attempts and
                    // save authenticable instance
                    // see {@link Lockable#resetFailedAttempts}
                    if (authenticable.resetFailedAttempts) {
                        return authenticable.resetFailedAttempts();
                    }
                    return authenticable;
                } else {
                    const error = new Error(options.errorMessage);
                    return handleComparePwdError(error, auth, options);
                }
            })
            .catch(error => {
                throw error;
            });
    };


    //--------------------------------------------------------------------------
    //authenticable static/model methods
    //--------------------------------------------------------------------------

    /**
     * @function
     * @description authenticate supplied authentication credentials.
     *              This method must be called within model static context
     *
     * @param  {Object}   credentials valid account credentials plus additional
     *                                valid mongoose query criteria
     * @return Promise resolve with authenticable or reject with error
     * @public
     */
    schema.statics.authenticate = function (credentials) {
        //this refer to the model static
        const Authenticable = this;

        //TODO sanitize input

        //check if valid credentials provided
        const isValidCredentials = _.isPlainObject(credentials) &&
            (
                _.has(credentials, options.authenticationField) &&
                _.has(credentials, options.passwordField) &&
                !_.isEmpty(credentials[options.authenticationField]) &&
                !_.isEmpty(credentials[options.passwordField])
            );

        if (!isValidCredentials) {
            const error = new Error(options.errorMessage);
            return Promise.reject(error);
        }


        let criteria = {};
        if (options.authenticationField === 'email') {
            criteria[options.authenticationField] =
                credentials[options.authenticationField].toLowerCase();
        } else {
            criteria[options.authenticationField] =
                credentials[options.authenticationField];
        }

        //ensure authenticable is active
        criteria.unregisteredAt = null;

        //merge with additional criterias
        //to allow custom criteria to be passed
        criteria =
            _.merge({}, _.omit(credentials, [options.passwordField]), criteria);
        //Find authenticable  
        return Authenticable
            .findOne(criteria)
            .exec()
            .then(authenticable => {
                const authenticationNotExist = _.isUndefined(authenticable) ||
                    _.isNull(authenticable);

                if (authenticationNotExist) {
                    const error = new Error(options.errorMessage);
                    throw error;
                }
                return authenticable;
            })
            .then(authenticable => {
                return authenticable.authenticate(credentials.password);
            });
    };
};



