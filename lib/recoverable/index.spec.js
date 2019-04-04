'use strict';

//dependencies
const faker = require('faker');
const path = require('path');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const sinon = require('sinon');
const Schema = mongoose.Schema;
const Registerable = require(path.join(__dirname, '..', 'registerable'));
const Recoverable = require(path.join(__dirname, 'index'));

describe('Recoverable', function () {

  describe('Recoverable Path Set', function () {
    let User;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Recoverable);
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
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Recoverable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });

    it('should be able to generate recovery token', function () {

      const user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });

      const recoverable = user.generateRecoveryToken();
      expect(recoverable.recoverySentAt).to.not.be.null;
    });
  });


  describe('Send Password Reset Instructions', function () {
    let User;
    let sendNotificationSpy;
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Recoverable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
      done();
    });

    before(function () {
      sendNotificationSpy = sinon.spy(User.prototype, 'sendJabaliNotification');
    });

    it('should be able to send password reset instructions', function (done) {
      const user = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });
      const recoverable = user.generateRecoveryToken();
      recoverable
        .sendPasswordResetInstructions()
        .then(() => {
          expect(sendNotificationSpy.calledOnce).to.be.true;
          done();
        });
    });

    after(function () {
      sendNotificationSpy.restore();
    });

  });


  describe('Request Password Reset', function () {
    let User;
    let email = faker.internet.email().toLowerCase();
    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Recoverable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

      done();
    });


    before(function (done) {
      User
        .create({
          email,
          password: faker.internet.password()
        })
        .then(() => done());
    });


    it('should be able to request recover account', function (done) {
      User
        .requestPasswordReset(email)
        .then(recoverable => {
          expect(recoverable.recoveryToken).to.not.be.null;
          expect(recoverable.recoveryTokenExpiryAt).to.not.be.null;
          expect(recoverable.recoveryTokenSentAt).to.not.be.null;
          done();
        });
    });
  });


  describe('Password Reset', function () {
    let User;
    let resetToken;
    const email = faker.internet.email().toLowerCase();
    let password;

    before(function (done) {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Recoverable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
      done();
    });


    before(function (done) {
      User
        .create({
          email,
          password: faker.internet.password()
        })
        .then(() => User.requestPasswordReset(email))
        .then(user => {
          resetToken = user.recoveryToken;
          password = user.password;
          done();
        });
    });


    it('should be able to reset account password', function (done) {
      const newPassword = faker.internet.password();
      User
        .passwordReset(email, newPassword, resetToken)
        .then(recoverable => {
          expect(recoverable.password).to.not.equal(password);
          expect(recoverable.recoveredAt).to.not.be.null;
          done();
        });
    });

    it('should fails to reset account password with invalid token', function (done) {
      const newPassword = faker.internet.password();
      User
        .passwordReset(email, newPassword, faker.random.uuid())
        .catch(error => {
          expect(error.statusCode).to.equal(404);
          done();
        });
    });

    it('should fails to reset account password without token', function (done) {
      const newPassword = faker.internet.password();
      User
        .passwordReset(email, newPassword)
        .catch(error => {
          expect(error.statusCode).to.equal(400);
          done();
        });
    });
  });

});