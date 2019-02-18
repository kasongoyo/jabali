'use strict';

//dependencies
var faker = require('faker');
var path = require('path');
var mongoose = require('mongoose');
var expect = require('chai').expect;
var Schema = mongoose.Schema;
var irina = require(path.join(__dirname, '..', '..', 'index'));

describe('Recoverable', function () {

  describe('Recoverable Path Set', function () {
    let User;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should have recoverable attributes', function (done) {
      expect(User.schema.paths.recoveryToken).to.exist;
      expect(User.schema.paths.recoveryTokenExpiryAt).to.exist;
      expect(User.schema.paths.recoverySentAt).to.exist;
      expect(User.schema.paths.recoveredAt).to.exist;

      done();
    });
  });


  describe('Generate Recovery Token', function () {
    let User;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should be able to generate recovery token', function () {

      const user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });

      const recoverable = user.generateRecoveryToken();
      expect(recoverable.recoveryToken).to.not.be.null;
      expect(recoverable.recoveryTokenExpiryAt).to.not.be.null;
    });
  });


  describe('Send Recovery Info', function () {
    let User;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should be able to send recovery instruction', function (done) {
      const user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });
      const recoverable = user.generateRecoveryToken();
      recoverable
        .sendRecovery()
        .then(recoverable => {
          expect(recoverable.recoverySentAt).to.not.be.null;
          done();
        });
    });
  });


  describe('Request Recover', function () {
    let User;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should be able to request recover account', function (done) {
      User
        .register({
          email: faker.internet.email(),
          password: faker.internet.password()
        })
        .then(recoverable => {
          return User.requestRecover({ email: recoverable.email });
        })
        .then(recoverable => {
          expect(recoverable.recoveryToken).to.not.be.null;
          expect(recoverable.recoveryTokenExpiryAt).to.not.be.null;
          expect(recoverable.recoveryTokenSentAt).to.not.be.null;
          done();
        });
    });
  });


  describe('Recover Password', function () {
    let User;
    
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(irina);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should be able to recover account password', function (done) {
      let previousPassword;
      const newPassword = faker.internet.password();
      User
        .register({
          email: faker.internet.email(),
          password: faker.internet.password()
        })
        .then(recoverable => {
          return recoverable.generateRecoveryToken();
        })
        .then(recoverable => {
          return recoverable.sendRecovery();
        })
        .then(recoverable => {
          previousPassword = recoverable.password;
          const { recoveryToken, email } = recoverable;
          return User
            .recover({
              recoveryToken,
              newPassword,
              email
            });
        })
        .then(recoverable => {
          expect(recoverable.password).to.not.equal(previousPassword);
          expect(recoverable.password).to.not.equal(newPassword);
          expect(recoverable.recoveredAt).to.not.be.null;
          done();
        });
    });
  });

});