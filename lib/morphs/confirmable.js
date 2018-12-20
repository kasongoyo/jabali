'use strict';

//dependencies
const path = require('path');
const Utils = require(path.join(__dirname, '..', 'utils'));
const randomize = require('randomatic');

/**
 * @constructor
 *
 * @description Confirmable is responsible to verify if an account is
 *              already confirmed to sign in, and to send confirmation instructions.
 *               
 *              See {@link http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Confirmable|Confirmable}
 *
 * @public
 */
module.exports = exports = function Confirmable(schema, options) {
  //prepare options
  options = options || {};

  //add confirmable schema fields
  schema.add({
    confirmationToken: {
      type: String,
      default: null,
      index: true,
      hide: true
    },
    confirmationTokenExpiryAt: {
      type: Date,
      default: null,
      hide: true
    },
    confirmedAt: {
      type: Date,
      default: null,
      hide: true
    },
    confirmationSentAt: {
      type: Date,
      default: null,
      hide: true
    },
    // track if this user should be confirmed automatically
    autoConfirm: {
      type: Boolean,
      default: false
    }
  });

  //--------------------------------------------------------------------------
  //confirmable instance methods
  //--------------------------------------------------------------------------

  /**
   * @function
   *
   * Generate confirmation token to be used to confirm account creation.
   * This function must be called within model instance context
   * @return {Object} - Confirmable
   * @private
   */
  schema.methods.generateConfirmationToken = function () {
    //this context is of model instance
    const confirmable = this;

    //set confirmation expiration date
    const confirmationTokenExpiryAt = Utils.addDays(options.confirmable.tokenLifeSpan);

    confirmable.confirmationToken = randomize('0', 6);

    //set confirmation token expiry date
    confirmable.confirmationTokenExpiryAt = confirmationTokenExpiryAt;

    //clear previous confirm details if any
    confirmable.confirmedAt = null;

    //return confirmable
    return confirmable;
  };


  /**
   *
   * This is an instance method to send confirmation instructions to allow account 
   * to be confirmed.
   * Execute using the following workflow:
   *   1. If is confirmed don't send any confirmation notification
   *   2. If not confirmed and confirmation is expired, regenerate confirmation
   *      token and resend.
   *   3. If not confirmed and confirmation token is not expired, resend the 
   *      confirmation
   *
   * @return Promise
   * @private
   */
  schema.methods.sendConfirmation = function () {
    //this refer to model instance context
    const confirmable = this;

    const isConfirmed =
      (confirmable.confirmedAt && confirmable.confirmedAt !== null);

    //if already confirmed back-off
    if (isConfirmed) {
      return Promise.resolve(confirmable);
    }
    //check if confirmation token expired
    const isTokenExpired = !Utils.isAfter(new Date(), confirmable.confirmationTokenExpiryAt);
    if (isTokenExpired) {
      // Token expired, regenerate new token
      confirmable.generateConfirmationToken()
    }
    //send confirmation instruction
    return confirmable.send('Account confirmation', confirmable)
      .then(() => {
        //update confirmation send time
        confirmable.confirmationSentAt = new Date();
        return confirmable.save();
      });
  }


  //--------------------------------------------------------------------------
  //confirmable static methods
  //--------------------------------------------------------------------------

  /**
   * Confirm user email or phone number
   * @param confirmationToken {string} - confirmation token sent during registration
   * @param email {string} - user email address
   * @param phone {string} - user phone number
   */
  schema.statics.confirm = function ({ confirmationToken, email, phone }) {
    //this refer to model static context
    const Confirmable = this;
    if (!confirmationToken || (!email && !phone)) {
      // confirmationToken or email & phone not specified
      return Promise.reject(new Error('Invalid confirmation details'));
    }
    //TODO
    //sanitize confirmationToken
    const criteria = {};
    if (email) {
      criteria.email = email.toLowerCase();
    }
    if (phone) {
      criteria.phone = phone
    }
    const token = new RegExp(confirmationToken, 'i');
    criteria.confirmationToken = { $regex: token };
    return Confirmable
      .findOne(criteria)
      .exec()
      .then(confirmable => {
        if (!confirmable) {
          // Confirmable not found
          const error = new Error('Invalid confirmation token');
          throw error;
        } else {
          // Confirmable found using token
          return confirmable;
        }
      })
      .then(confirmable => {
        //check if confirmation token expired
        const isTokenExpiry = !Utils.isAfter(new Date(), confirmable.confirmationTokenExpiryAt);

        if (isTokenExpiry) {
          //if token expired
          const error = new Error('Confirmation token expired');
          throw error;
        }
        confirmable.confirmedAt = new Date();
        return confirmable.save();
      });
  };
};

