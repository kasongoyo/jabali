'use strict';

//dependencies
var faker = require('faker');
var path = require('path');
var mongoose = require('mongoose');
var expect = require('chai').expect;
var Schema = mongoose.Schema;
var irina = require(path.join(__dirname, '..', '..', 'index'));


describe('Confirmable', function () {
  let User;
  before(function (done) {
    var UserSchema = new Schema({});
    UserSchema.plugin(irina);
    User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

    done();
  });


  describe('Schema setup', function () {
    it('should have confirmable attributes', function (done) {

      expect(User.schema.paths.confirmationToken).to.exist;
      expect(User.schema.paths.confirmationTokenExpiryAt).to.exist;
      expect(User.schema.paths.confirmedAt).to.exist;
      expect(User.schema.paths.confirmationSentAt).to.exist;

      done();
    });
  });


  describe('Generate Confirmation Token', function () {
    let User, user;

    before(function () {
      var UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
      user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });
    });

    it('should be able to generate confirmation token', function () {
      const confirmable = user.generateConfirmationToken()
      expect(confirmable.confirmationToken).to.not.be.null;
    });
  });

  describe('Send Confirmation', function () {
    let User, user;

    before(function () {
      var UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
      user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });
    });

    it('should be able to send confirmation', function (done) {
      user
        .sendConfirmation()
        .then(confirmable => {
          expect(confirmable.confirmationSentAt).to.not.be.null;
          done();
        });
    });
  });

  describe('Confirm registration', function () {
    let User, user;

    before(function () {
      var UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    });

    before(function (done) {
      User
        .register({
          email: faker.internet.email(),
          password: faker.internet.password()
        })
        .then(registered => {
          user = registered;
          done();
        });
    });


    it('should be able to confirm registration', function (done) {
      User
        .confirm({ confirmationToken: user.confirmationToken, email: user.email })
        .then(confirmable => {
          expect(confirmable.confirmedAt).to.not.be.null;
          done();
        });
    });

    it('should fails to confirm registration when token not specified', function (done) {
      User
        .confirm({ email: user.email })
        .catch(error => {
          expect(error).to.exist;
          done();
        });
    });

    it('should fails to confirm registration when email not specified', function (done) {
      User
        .confirm({ confirmationToken: user.confirmationToken })
        .catch(error => {
          expect(error).to.exist;
          done();
        });
    });
  });

  //TODO
  // it('should check for confirmation', function(done) {
  //     done();
  // });
});