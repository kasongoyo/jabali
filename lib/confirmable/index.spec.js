'use strict';

//dependencies
const faker = require('faker');
const path = require('path');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const Schema = mongoose.Schema;
const Registerable = require(path.join(__dirname, '..', 'registerable'));
const Confirmable = require(path.join(__dirname, 'index'));
const Authenticable = require(path.join(__dirname, '..','authenticable','index'));
const sinon = require('sinon');
const Utils = require(path.join(__dirname, '..', 'utils'));


describe('Confirmable', function () {
  let User;
  before(function (done) {
    const UserSchema = new Schema({});
    UserSchema.plugin(Registerable);
    UserSchema.plugin(Confirmable);
    User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    done();
  });


  describe('Schema setup', function () {
    it('should have confirmable attributes', function (done) {
      expect(User.schema.paths.confirmationToken).to.exist;
      expect(User.schema.paths.confirmationTokenExpiryAt).to.exist;
      expect(User.schema.paths.confirmedAt).to.exist;
      expect(User.schema.paths.confirmationSentAt).to.exist;
      expect(User.schema.paths.autoConfirm).to.exist;
      expect(User.schema.paths.emailVerifiedAt).to.exist;
      expect(User.schema.paths.phoneVerifiedAt).to.exist;
      done();
    });
  });


  describe('Generate Confirmation Token', function () {
    let User;
    let confirmable;

    before(function () {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Confirmable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
      confirmable = new User({
        email: faker.internet.email(),
        password: faker.internet.password()
      });
    });

    it('should be able to generate confirmation token', function () {
      const user = confirmable.generateConfirmationToken()
      expect(user.confirmationToken).to.not.be.null;
    });
  });

  describe('Confirm Account using Email', function () {
    let User;
    let token;
    const email = faker.internet.email().toLowerCase();

    before(function () {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Confirmable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    });

    before(function (done) {
      User
        .create({
          email,
          password: faker.internet.password()
        })
        .then(confirmable => confirmable.generateConfirmationToken())
        .then(confirmable => confirmable.save())
        .then(confirmable => {
          token = confirmable.confirmationToken;
          done();
        });
    });


    it('should be able to confirm account through email', function (done) {
      User
        .confirm(email, 'email', token)
        .then(confirmable => {
          expect(confirmable.confirmedAt).to.not.be.null;
          expect(confirmable.emailVerifiedAt).to.not.be.null;
          done();
        });
    });


    it('should fails to confirm registration when token not specified', function (done) {
      User
        .confirm(email)
        .catch(error => {
          expect(error.statusCode).to.equal(400);
          done();
        });
    });
  })

  describe('Confirm Account Using Phone', function () {
    let User;
    let token;
    const phoneNumber = faker.phone.phoneNumber()

    before(function () {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Confirmable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    });

    before(function (done) {
      User
        .create({
          phoneNumber,
          password: faker.internet.password()
        })
        .then(confirmable => confirmable.generateConfirmationToken())
        .then(confirmable => confirmable.save())
        .then(confirmable => {
          token = confirmable.confirmationToken;
          done();
        });
    });

    it('should be able to confirm account through phone number', function (done) {
      User
        .confirm(phoneNumber, 'phone', token)
        .then(confirmable => {
          expect(confirmable.confirmedAt).to.not.be.null;
          expect(confirmable.phoneVerifiedAt).to.not.be.null;
          done();
        });
    });
  });

  describe('Send Confirmation', function () {
    let User;
    let user;
    let sendNotificationSpy;

    before(function () {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Confirmable);
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    });

    before(function () {
      sendNotificationSpy = sinon.spy(User.prototype, 'sendJabaliNotification');
    });

    before(function (done) {
      User
        .create({
          email: faker.internet.email(),
          password: faker.internet.password()
        })
        .then(confirmable => confirmable.generateConfirmationToken())
        .then(confirmable => confirmable.save())
        .then(confirmable => {
          user = confirmable;
          done();
        });
    });

    it('should be able to send confirmation', function (done) {
      user
        .sendConfirmationInstructions()
        .then(() => {
          expect(sendNotificationSpy.calledOnce).to.be.true;
          done();
        });
    });


    after(function () {
      sendNotificationSpy.restore();
    });
  });


  describe('Confirmable Block Auth', function () {
    const password = faker.internet.password();
    const email = faker.internet.email().toLowerCase();
    let hashedPwd;
    before(function () {
      const UserSchema = new Schema({});
      UserSchema.plugin(Registerable);
      UserSchema.plugin(Authenticable);
      UserSchema.plugin(Confirmable, {
      });
      User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
    });

    before(function (done) {
      Utils
        .hash(password, 10)
        .then(hash => {
          hashedPwd = hash;
          done();
        });
    });

    before(function (done) {
      const testUser = { email, password: hashedPwd };
      User
        .create(testUser)
        .then(() => {
          done();
        });
    });

    it('should fails to authenticate due to unconfirmed account', function (done) {
      User
        .authenticate(email, password)
        .catch(error => {
          expect(error.name).to.equal('UnauthorizedError');
          done();
        });
    });
  });
});