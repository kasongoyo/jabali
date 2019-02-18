'use strict';

//dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const randomize = require('randomatic');

/**
 * @constructor
 * 
 * @description Recoverable takes care of resetting account password 
 *              and send reset instructions.
 *              See {@link http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Recoverable|Recoverable}
 *
 * @public
 */
module.exports = exports = function Recoverable(schema, options) {
  //prepare options
  options = options || {};

  //add recoverable schema attributes
  schema.add({
    recoveryToken: {
      type: String,
      default: null,
      index: true,
      hide: true
    },
    recoveryTokenExpiryAt: {
      type: Date,
      default: null,
      hide: true
    },
    recoverySentAt: {
      type: Date,
      default: null,
      hide: true
    },
    recoveredAt: {
      type: Date,
      default: null,
      hide: true
    }
  });


  //--------------------------------------------------------------------------
  //recoverable instance methods
  //--------------------------------------------------------------------------

  /**
   * @function
   *
   * @description generate recovery token to be used to recover account
   *              This function must be called within model instance context
   *
   * @return Promise resolve with recoverable or reject with error
   * @private
   */
  schema.methods.generateRecoveryToken = function () {
    //this refer to the model instance context
    var recoverable = this;

    //set recovery expiration date
    var recoveryTokenExpiryAt =
      Utils.addDays(options.recoverable.tokenLifeSpan);

    //set recoveryToken
    recoverable.recoveryToken = randomize('0', 6);

    //set recovery token expiry date
    recoverable.recoveryTokenExpiryAt = recoveryTokenExpiryAt;

    //clear previous recovery details if any
    recoverable.recoveredAt = null;
    // return recoverable
    return recoverable;
  };
  //documentation for `done` callback of `generateRecoveryToken`
  /**
   * @description a callback to be called once generate recovery token is done
   * @callback generateRecoveryToken~callback
   * @param {Object} error any error encountered during generating recovery token
   * @param {Object} recoverable recoverable instance with `recoveryToken`,
   *                             and `recoveryTokenExpiryAt` set-ed
   */


  /**
   * 
   * Model instance method that send recovery instructions 
   * to allow account to be recovered. 
   * Note:
   * It assume the recovery token exist and it's not expired 
   * so use it with caution.
   *
   * @return {Promise} resolve with recoverable or reject with error
   * @private
   */
  schema.methods.sendRecovery = function () {
    //this refer to model instance context
    var recoverable = this;

    var isRecovered =
      recoverable.recoveredAt && recoverable.recoveredAt !== null;

    //if already recovered back-off
    if (isRecovered) {
      return Promise.resolve(recoverable);
    }
    // TODO check if recovery token expired
    //send recovery instructions
    return recoverable
      .send('Password recovery', recoverable)
      .then(() => {
        //update recovery send time
        recoverable.recoverySentAt = new Date();
        return recoverable.save();
      })

  };



  //--------------------------------------------------------------------------
  //recoverable static/class methods
  //--------------------------------------------------------------------------


  /**
   * @function
   * 
   * Request user password recovering instructions
   * This function use criteria to find user, if exist generate
   * recovery token and send it out to the requestor
   * 
   * @param  {Object}   criteria criteria to be used to find a requesting user
   * @return {Promise} resolve with recoverable or reject with error
   * @public
   */
  schema.statics.requestRecover = function (criteria) {
    //this refer to model static context
    var Recoverable = this;
    if(criteria.email){
      // Email exist, convert it to lowercase
      criteria.email = criteria.email.toLowerCase();
    }
    return Recoverable
      .findOne(criteria)
      .exec()
      .then(recoverable => {
        const recoverableNotExist = (
          recoverable === undefined ||
          recoverable === null
        );
        if (recoverableNotExist) {
          throw new Error('Invalid recovery details');
        }
        return recoverable.generateRecoveryToken();
      })
      .then(recoverable => {
        return recoverable.sendRecovery();
      });
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
  schema.statics.recover = function ({ recoveryToken, newPassword, email, phone }) {
    //this refer to model static context
    var Recoverable = this;

    //TODO sanitize input
    //refactor
    if (!recoveryToken || (!email && !phone)) {
      // recoveryToken or email & phone not specified
      return Promise.reject(new Error('Invalid recovery details'));
    }
    const criteria = {};
    if (email) {
      criteria.email = email.toLowerCase();
    }
    if (phone) {
      criteria.phone = phone
    }
    const token = new RegExp(recoveryToken, 'i');
    criteria.recoveryToken = { $regex: token };
    return Recoverable
      .findOne(criteria)
      .exec()
      .then(recoverable => {
        const recoverableNotExist = recoverable === undefined || recoverable === null;
        if (recoverableNotExist) {
          const error = new Error('Invalid recovery token');
          throw error;
        }
        return recoverable;
      })
      .then(recoverable => {
        //check if recovery token expired
        var isTokenExpired = !Utils.isAfter(new Date(), recoverable.recoveryTokenExpiryAt);

        if (isTokenExpired) {
          const error = new Error('Recovery token expired');
          throw error;
        }
        //set new password
        recoverable.password = newPassword;
        //encrypt password
        return recoverable.encryptPassword();

      })
      .then(recoverable => {
        //update recovery details
        recoverable.recoveredAt = new Date();
        return recoverable.save();
      })

  };

};
