'use strict';

//dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const randomize = require('randomatic');

/**
 * @constructor
 *
 * @description Handles blocking account access after a certain number of attempts.
 *              It will send instructions to the user when the lock happens,
 *              containing a details to unlock account.
 *
 *              See {@link http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Lockable|Lockable}
 *
 * @public
 */
module.exports = exports = function Lockable(schema, options) {
    //prepare options
    options = options || {};

    //add lockable schema fields
    schema.add({
        failedAttempts: {
            type: Number,
            default: 0,
            index: true,
            hide: true
        },
        lockedAt: {
            type: Date,
            default: null,
            hide: true
        },
        unlockedAt: {
            type: Date,
            default: null,
            hide: true
        },
        unlockToken: {
            type: String,
            default: null,
            index: true,
            hide: true
        },
        unlockSentAt: {
            type: Date,
            default: null,
            hide: true
        },
        unlockTokenExpiryAt: {
            type: Date,
            default: null,
            hide: true
        }
    });

    //--------------------------------------------------------------------------
    //lockable instance methods
    //--------------------------------------------------------------------------

    /**
     *
     * Model instance function to generate unlock token 
     * to be used to unlock locked account.
     *
     * @return {Promise} resolve with lockable or reject with error, the lockable 
     * will have `unlockToken`, and `unlockTokenExpiryAt`.
     * @private
     */
    schema.methods.generateUnlockToken = function (done) {
        //this context is of model instance
        const lockable = this;

        //set unlock expiration date
        const unlockTokenExpiryAt = Utils.addDays(options.lockable.tokenLifeSpan);

        //set unlockToken
        lockable.unlockToken = randomize('0', 6);

        //set unlock token expiry date
        lockable.unlockTokenExpiryAt = unlockTokenExpiryAt;

        //clear previous unlock details if any
        lockable.unlockedAt = null;
        return lockable;

    };


    /**
     * @function
     * 
     * Model instance method used to send out notification 
     * to allow account to be unlocked.
     * Note:
     * This function assume the unlockToken exist and it's
     * not expired. So don't use it if you're not sure that the 
     * afore mentioned assumption hold.
     *
     * @return {Promise} resolve with lockable or reject with error
     * @private
     */
    schema.methods.sendUnLock = function (done) {
        //this refer to model instance context
        const lockable = this;

        const isUnlocked =
            lockable.unlockedAt && lockable.unlockedAt !== null;

        //if already unlocked back-off
        if (isUnlocked) {
            return Promise.resolve(lockable);
        }

        //send unlock instructions
        return lockable
            .send('Account recovery', lockable)
            .then(() => {
                //update unlock token send time
                lockable.unlockTokenSentAt = new Date();
                //save lockable instance
                return lockable.save();
            });
    };


    /**
     * @function
     *
     * Model instance method to lock the instance after maximum 
     * allowed failed attempts reached. This function lock the
     * instance and immediately send the unlock instruction to the
     * account owner. 
     *
     * @return {Promise} resolve with lockable or reject with error
     * @private
     */
    schema.methods.lock = function () {
        //this refer to model instance context
        const lockable = this;
        if (options.lockable.enabled) {
            lockable.lockedAt = new Date();
            //generate unlock token
            return lockable.generateUnlockToken().sendUnLock();
        } else {
            return Promise.resolve(lockable);
        }
    };



    /**
     * reset account failed attempts to zero
     * @return {Promise} resolve with lockable or reject with error
     * @private
     */
    schema.methods.resetFailedAttempts = function () {
        //this context is of model instance 
        const lockable = this;

        //clear previous failed attempts
        lockable.failedAttempts = 0;
        //save lockable instance
        //and return it
        return lockable.save();
    };


    /**
     * @function
     *
     * @description Check if account is locked by using the below flow:
     *              1. If not locked continue.
     *              2. If locked and lock token not expired throw
     *                  `Account locked. Check your email for unlock instructions`
     *              3. If locked and lock token expired
     *                 generate unlock token, send it and throw
     *                 `Account locked. Check your email for unlock instructions`
     *
     * @return Promise resolve with lockable when account is not locked or reject with error
     * @private
     */
    schema.methods.isLocked = function (done) {
        //this context is of model instance
        const lockable = this;

        //check if already locked
        const isLocked =
            lockable.lockedAt && lockable.lockedAt !== null;

        //check if unlock token expired
        const isUnlockTokenExpired = !Utils.isAfter(new Date(), lockable.unlockTokenExpiryAt);

        if (!isLocked) {
            // account is not locked back-off
            return Promise.resolve(lockable);
        }

        if (isLocked && !isUnlockTokenExpired) {
            // is locked and unlock token is not expired 
            const error = new Error('Account locked. Check unlock instructions sent to you.');
            return Promise.reject(error);
        }

        //is locked and unlock token is expired 
        return lockable.generateUnlockToken().sendUnLock();
    };



    //--------------------------------------------------------------------------
    //lockable static methods
    //--------------------------------------------------------------------------

    /**
     * @function
     *
     * @description unlock locked account
     *              This  function must be called within model static context
     * @param {String} unlockToken - Unlock token
     * @param {String} email - Email of the locked account
     * 
     * @private
     */
    schema.statics.unlock = function ({ unlockToken, email, phone }) {
        //this refer to model static context
        const Lockable = this;
        if (!unlockToken || (!email && !phone)) {
            // unlockToken or email & phone not specified
            return Promise.reject(new Error('Invalid unlock details'));
        }
        const criteria = {};
        if (email) {
            criteria.email = email.toLowerCase();
        }
        if (phone) {
            criteria.phone = phone
        }
        const token = new RegExp(unlockToken, 'i');
        criteria.unlockToken = { $regex: token };
        //find lockable using unlock token
        return Lockable
            .findOne(criteria)
            .exec()
            .then(lockable => {
                //any lockable found?
                const lockableNotExist = (lockable === undefined || lockable === null);

                if (lockableNotExist) {
                    const error = new Error('Invalid unlock token');
                    throw error;
                }
                return lockable;
            })
            .then(lockable => {
                //check if unlock token expired
                const isTokenExpired = !Utils.isAfter(new Date(), lockable.unlockTokenExpiryAt);

                if (isTokenExpired) {
                    //if expired
                    const error = new Error('Unlock token expired');
                    throw error;
                }
                //update unlock details
                lockable.unlockedAt = new Date();

                //clear failed attempts
                lockable.failedAttempts = 0;

                //clear lockedAt
                lockable.lockedAt = null;

                //save lockable instance
                return lockable.save();
            });
    };
};