'use strict';
/**
 * @constructor
 *
 * @description registerable extnding mongoose model with ability for
 *              registering a new account and unregistering existing ones.
 *              
 *              See {@link http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Registerable|Registerable}
 *
 * @public
 */
module.exports = exports = function Registerable(schema, options) {
    //prepare options
    options = options || {};

    //add registerable schema fields
    schema.add({

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
    });

    /**
     * @function
     * @description register new account
     *              This method must be called within model static context
     *
     * @param  {Object}   profile valid account credentials and additional details 
     *                            as per schema definition.
     * @param {register~callback} done callback that handles the response.
     * @return Promise 
     * @public
     */
    schema.statics.register = function (profile) {
        //this refer to model static context
        const Registerable = this;
        // Initialize registerable document
        const _registerable_ = new Registerable(profile);

        return _registerable_
            .validate()
            .then(() => {
                //encrypt password
                return _registerable_.encryptPassword();
            })
            .then(registerable => {
                if (registerable.preSignup) {
                    // preSignup trigger is set, execute it
                    return registerable.preSignup();
                }
                return registerable;
            })
            .then(registerable => {
                //generate confirmation token if schema is confirmable
                if (registerable.generateConfirmationToken) {
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
                if (registerable.sendConfirmation) {
                    // schema is confirmable 
                    if (registerable.autoConfirm) {
                        // autoconfirm set
                        registerable.confirmationSentAt = new Date();
                        registerable.confirmedAt = new Date();
                        return registerable.save();
                    } else {
                        // auto confirmation is not enabled
                        return registerable.sendConfirmation();
                    }
                }
                return registerable;
            })
            .catch(error => {
                //check if unique constraint error 
                //is due to authentication field
                const regex = new RegExp(options.authenticationField, 'g');

                //TODO fire events after register new account
                if (error) {
                    //handle MongoError: E11000 duplicate key error index
                    //on authentication field and ignore others
                    if (error.code === 11000 && regex.test(error.message)) {

                        const errorMessage =
                            'Account with ' + options.authenticationField +
                            ' ' + profile[options.authenticationField] +
                            ' already exist';

                        error = new Error(errorMessage);
                    }
                    //Pass control to catch block 
                    throw error;
                }
            });
    };

    //--------------------------------------------------------------------------
    //registerable static methods
    //--------------------------------------------------------------------------

    /**
     * 
     * 
     * Un register a given account.
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


};