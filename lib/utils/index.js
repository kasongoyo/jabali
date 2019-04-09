'use strict';

//dependencies
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const moment = require('moment');

/**
 * @description crypto token generator
 */
function Tokenizer(secret) {
    this.cipher = crypto.createCipheriv('aes-256-cbc', secret);
    this.decipher = crypto.createDecipheriv('aes-256-cbc', secret);
}

Tokenizer.prototype.encrypt = function (text) {
    let crypted = this.cipher.update(text, 'utf8', 'hex');
    crypted += this.cipher.final('hex');
    return crypted;

};

Tokenizer.prototype.decrypt = function (text) {
    let dec = this.decipher.update(text, 'hex', 'utf8');
    dec += this.decipher.final('utf8');
    return dec;
};

Tokenizer.prototype.match = function (token, text) {
    return this.decrypt(token) === text;
};


/**
 * @description common utilities
 * @type {Object}
 */
module.exports = {
    /**
     * @description hash a given token using bcryptjs with default of ten iterations
     * @param  {String}   token    a token to be hashed
     * @param  {Number}  iteration  number of iterations to be used when encrypt a password
     */
    hash: function (token, iterations = 10) {
        return bcrypt
            .genSalt(iterations)
            .then(salt => {
                return bcrypt
                    .hash(token, salt);
            });
    },


    /**
     * @description compare original value and the given hash
     * @param  {String}   value    a value to be compared
     * @param  {String}   hash     a hash to compare
     */
    compare: function (value, hash) {
        return bcrypt
            .compare(value, hash);
    },


    /**
     * @description check if the second date is after the first date
     * @param  {Date}  first  a first date
     * @param  {Date}  second a second date
     * @return {Boolean}        true if second date is later that first date
     */
    isAfter: function (first, second) {
        const firstMoment = moment(first);
        const secondMoment = moment(second);
        return secondMoment.isAfter(firstMoment);
    },


    /**
     * @description adding offset number of days into the date given else today
     * @param {Date} date   date to offset
     * @param {Integer} offset days to add on date
     * @param {Date}        date with days added
     */
    addDays: function (offset, date) {
        date = date || new Date();
        const momentAt = moment(date).add(offset, 'days');
        return momentAt.toDate();
    },

    /**
     * Compute the difference of days between start and end date
     * @param {Date} startDate - Start Date 
     * @param {Date} endDate - End Date
     */
    daysDiff: function (startDate, endDate) {
        if(!startDate || !endDate){
            return 0;
        }
        const start = moment(startDate);
        const end = moment(endDate);
        return start.diff(end, 'days');
    },

    tokenizer: function (secret) {
        return new Tokenizer(secret);
    },
};