'use strict';

/**
 * @file
 * @name Confirmable
 * Confirmable is responsible to verify if an account is already confirmed to
 * sign in, and to send emails with confirmation instructions.
 * Confirmation instructions are sent to the user email or phone number after 
 * creating a record and when manually requested by a new confirmation 
 * instruction request.
 * It extends mongoose schema by adding the followings
 *  + confirmationToken
 *  + confirmationTokenExpiryAt
 *  + confirmedAt
 *  + confirmationSentAt
 *  + autoConfirm
 *  + emailVerifiedAt
 *  + phoneVerifiedAt
 */

//dependencies
const path = require('path');
const randomize = require('randomatic');
const createError = require('http-errors');
const deepmerge = require('deepmerge');
const validator = require('validator');
const Utils = require(path.join(__dirname, '..', 'utils'));

function Confirmable(schema, opts = {}) {
  // init defaults
  const defaults = {
    // the time it will take before the confirmation token become invalid
    token_life: 1,
    // the time you want to allow the user to access their account
    // before confirming it. After this period, the user access is denied
    allow_unconfirmed_access_for: 0
  };

  //prepare options
  const options = deepmerge(defaults, opts);

  // confirmable schema fields
  const fields = {
    // confirmation token
    confirmationToken: {
      type: String,
      default: null,
      index: true,
      hide: true
    },
    // the time confirmation token get expired
    confirmationTokenExpiryAt: {
      type: Date,
      default: null,
      hide: true
    },
    // the time confirmation take place
    confirmedAt: {
      type: Date,
      default: null,
      hide: true
    },
    // the time confirmation token created(not sent)
    confirmationSentAt: {
      type: Date,
      default: null,
      hide: true
    },
    // set this to true to allow this account to skip confirmation
    autoConfirm: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: {
      type: Date,
    },
    phoneVerifiedAt: {
      type: Date
    },
  };
  // add new fields into the schema
  schema.add(fields);

  //--------------------------------------------------------------------------
  // confirmable instance methods
  //--------------------------------------------------------------------------

  /**
   * @function
   * Generate confirmation token to be used to confirm user account.
   * This function must be called within model instance context.
   * Confirmation is saved as plain text in the db so to ensure security,
   * it's recommended not to authenticate user automatically after 
   * account confirmation.
   * 
   * @return {Object} - Confirmable
   * @private
   */
  schema.methods.generateConfirmationToken = function () {
    //this context is of model instance
    const confirmable = this;

    //set confirmation expiration date
    const confirmationTokenExpiryAt = Utils.addDays(options.token_life);

    //set confirmation token expiry date
    confirmable.confirmationTokenExpiryAt = confirmationTokenExpiryAt;

    // set confirmation token
    confirmable.confirmationToken = randomize('0', 6);
    //update confirmation token creation time
    confirmable.confirmationSentAt = new Date();
    //clear previous confirm details if any
    confirmable.confirmedAt = null;
    //return confirmable
    return confirmable;
  };



  /**
   * @function
   * Confirm user account using email or phone number
   * @param {String} username - Email or phone number
   * @param {String} confirmationToken - confirmation token sent during registration
   */
  schema.statics.confirm = function (username, confirmationToken) {
    //this refer to model static context
    const Confirmable = this;
    if (!username || !confirmationToken) {
      // confirmationToken or username is not specified
      return Promise.reject(new createError(400, 'Invalid confirmation details'));
    }
    //TODO sanitize confirmationToken
    let credential;
    const isEmail = validator.isEmail(username);
    if (isEmail) {
      credential = { email: username.toLowerCase() };
    } else {
      credential = { phoneNumber: username };
    }

    return Confirmable
      .findOne(credential)
      .exec()
      .then(confirmable => {
        if (!confirmable) {
          throw new createError(404, 'User not found');
        }

        const regex = new RegExp(confirmationToken, 'i');
        const match = confirmable.confirmationToken ? confirmable.confirmationToken.match(regex) : false;
        if (!match) {
          throw new createError(400, 'Invalid confirmation token');
        }
        //check if confirmation token expiry
        const isTokenExpiry = !Utils.isAfter(new Date(), confirmable.confirmationTokenExpiryAt);

        if (isTokenExpiry) {
          // token has expired
          throw new createError(400, 'Token has expired')
        }
        if (isEmail) {
          confirmable.emailVerifiedAt = new Date();
        } else {
          confirmable.phoneVerifiedAt = new Date();
        }
        confirmable.confirmedAt = new Date();
        confirmable.confirmationToken = null;
        confirmable.confirmationTokenExpiryAt = null;
        return confirmable.save();
      });
  };

  /**
   * Static method used to send confirmation instructions
   * @param {String} username - username
   */
  schema.statics.sendConfirmationInstructions = function (username) {
    //this refer to model static context
    const Confirmable = this;
    
    let credential;
    const isEmail = validator.isEmail(username);
    if (isEmail) {
      credential = { email: username.toLowerCase() };
    } else {
      credential = { phoneNumber: username };
    }
    return Confirmable
      .findOne(credential)
      .exec()
      .then(confirmable => {
        confirmable.sendConfirmationInstructions();
      });
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
  schema.methods.sendConfirmationInstructions = function () {
    //this refer to model instance context
    const confirmable = this;

    const isConfirmed = confirmable.confirmedAt && confirmable.confirmedAt !== null;

    if (isConfirmed) {
      // already confirmed back-off
      return Promise.resolve(confirmable);
    }
    // check if confirmation token expired
    const isTokenExpired = !Utils.isAfter(new Date(), confirmable.confirmationTokenExpiryAt);
    if (isTokenExpired) {
      // Token expired, regenerate new token
      confirmable.generateConfirmationToken()
    }
    //send confirmation instruction
    return confirmable.sendJabaliNotification('CONFIRMATION_INSTRUCTIONS', confirmable)
      .then(() => {
        return confirmable.save();
      });
  }

  /**
   * It check confirmable logics, and decide if the account should
   * not be allowed to authenticate. 
   */
  schema.methods.confirmableBlockAuthenticationMessage = function () {
    const confirmable = this;
    if (confirmable.confirmedAt) {
      // account confirmed
      return '';
    }
    // check if time allowed to authenticate before account confirmation is due
    const allowUnconfirmedAccessFor = options.allow_unconfirmed_access_for;
    if (allowUnconfirmedAccessFor === 0) {
      // unconfirmed accesss is allowed for zero days, i.e it is mandatory
      // to confirm account prior to authentication
      return 'Unconfirmed account';
    }
    const diff = Utils.daysDiff(new Date(), confirmable.confirmationSentAt);
    if (diff > allowUnconfirmedAccessFor) {
      return 'Unconfirmed account';
    }
    return '';
  }
}


// export module
module.exports = Confirmable;

