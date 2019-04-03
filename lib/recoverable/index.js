'use strict';

//dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const randomize = require('randomatic');
const deepmerge = require('deepmerge');
const createError = require('http-errors');
/**
 * 
 * Recoverable takes care of resetting account password 
 * and send reset instructions.
 * It extends schema with the following;
 *  + recoveryToken
 *  + recoveryTokenExpiryAt
 *  + recoverySentAt
 *  + recoveredAt
 *
 */
function Recoverable(schema, opts = {}) {
  // default options
  const defaultOptions = {
    // the time it will take before the token become invalid
    token_life: 1,
    aliases: ['email']
  };
  //prepare options
  const options = deepmerge(defaultOptions, opts);

  const fields = {
    // account recovery token
    recoveryToken: {
      type: String,
      default: null,
      index: true,
      hide: true
    },
    // the date account recovery token will expired
    recoveryTokenExpiryAt: {
      type: Date,
      default: null,
      hide: true
    },
    // the time recovery token created(not sent)
    recoverySentAt: {
      type: Date,
      default: null,
      hide: true
    },
    // the timestamp the actual recovery took place
    recoveredAt: {
      type: Date,
      default: null,
      hide: true
    }
  }
  //add recoverable schema attributes
  schema.add(fields);

  /**
   * @function
   *
   * It generate recovery token to be used to recover account
   *
   * @return {Promise} resolve with recoverable or reject with error
   * @private
   */
  schema.methods.generateRecoveryToken = function () {
    //this refer to the model instance context
    const recoverable = this;

    //set recovery expiration date
    const recoveryTokenExpiryAt = Utils.addDays(options.token_life);

    //set recoveryToken
    recoverable.recoveryToken = randomize('0', 6);

    // set token creation date
    recoverable.recoverySentAt = new Date();

    //set recovery token expiry date
    recoverable.recoveryTokenExpiryAt = recoveryTokenExpiryAt;

    //clear previous recovery details if any
    recoverable.recoveredAt = null;
    // return recoverable
    return recoverable;
  };


  /**
   * @function
   * 
   * Request user password reset instructions using username i.e any field 
   * as specified in user alias field
   * This function use username to find user, if exist generate
   * recovery token and send it out to the requestor
   * 
   * @param  {String}   username criteria to be used to find a requesting user
   * @return {Promise} resolve with recoverable or reject with error
   * @public
   */
  schema.statics.requestPasswordReset = function (username) {
    //this refer to model static context
    const Recoverable = this;
    const { aliases } = options;
    const credentials = aliases.map(field => ({ [field]: username }));
    const users = credentials
      .map(credential => Recoverable.findOne(credential).exec());
    return Promise
      .all(users)
      .then(result => result.find(user => user !== null))
      .then(recoverable => {
        if (!recoverable) {
          throw new createError(404, 'Account does not exist');
        }
        return recoverable.generateRecoveryToken()
      })
      .then(recoverable => recoverable.sendPasswordResetInstructions());
  };


  /**
   * 
   * It send out password reset instructions 
   * Note:
   * It assume the recovery token exist and it's not expired 
   * so use it with caution. This function is intended to be 
   * used only within this module and not outside. To resend recovery token, 
   * use {@see requestPasswordReset}
   *
   * @return {Promise} resolve with recoverable or reject with error
   * @private
   */
  schema.methods.sendPasswordResetInstructions = function () {
    //this refer to model instance context
    const recoverable = this;

    //if already recovered back-off
    if (recoverable.recoveredAt) {
      return Promise.resolve(recoverable);
    }
    // TODO check if recovery token expired
    //send recovery instructions
    return recoverable
      .sendJabaliNotification('PASSWORD_RESET_INSTRUCTIONS', recoverable)
      .then(() => {
        //update recovery send time
        return recoverable.save();
      })
  };


  /**
   * @function
   *
   * @description recover account password
   *              This method must be called within model static context
   *
   * @param  {String}   recoveryToken a valid recovery token send during
   *                                      `sendRecovery`
   * @param  {String}   newPassword    new password to be used when recover account
   * @return Promise resolve with recoverable or reject with error
   * @private
   */
  schema.statics.passwordReset = function (username, newPassword, recoveryToken) {
    //this refer to model static context
    const Recoverable = this;

    //TODO sanitize input
    //refactor
    if (!username || !newPassword || !recoveryToken) {
      // recoveryToken or email & phone not specified
      return Promise.reject(new createError(400, 'Invalid recovery details'));
    }

    const token = new RegExp(recoveryToken, 'i');
    const { aliases } = options;
    const credentials = aliases
      .map(field => ({ [field]: username, recoveryToken: { $regex: token } }));
    const users = credentials
      .map(credential => Recoverable.findOne(credential).exec());

    return Promise
      .all(users)
      .then(result => result.find(user => user !== null))
      .then(recoverable => {
        if (!recoverable) {
          throw new createError(404, 'Recovery details does not match our records');
        }
        //check if recovery token expired
        const isTokenExpired = !Utils.isAfter(new Date(), recoverable.recoveryTokenExpiryAt);

        if (isTokenExpired) {
          throw new createError(400, 'Recovery token expired');
        }

        return Utils
          .hash(newPassword)
          .then(hash => {
            //set new password
            recoverable.password = hash;
            return recoverable;
          });
      })
      .then(recoverable => {
        //update recovery details
        recoverable.recoveredAt = new Date();
        return recoverable.save();
      });

  };
}

// export module
module.exports = Recoverable;
