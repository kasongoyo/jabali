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

function Registerable(schema) {

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
    };

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