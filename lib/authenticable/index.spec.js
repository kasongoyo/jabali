'use strict';

//dependencies
var faker = require('faker');
var _ = require('lodash');
var path = require('path');
var mongoose = require('mongoose');
var expect = require('chai').expect;
var Schema = mongoose.Schema;
var irina = require(path.join(__dirname, '..', 'index'));

describe('Authenticable', function () {

    describe('Schema Setup', function () {
        let User;
        before(function () {
            var UserSchema = new Schema({});
            UserSchema.plugin(irina);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able to set defaults authentication fields', function () {
            expect(User.schema.paths.email).to.exist;
            expect(User.schema.paths.password).to.exist;
        });

        it('should be able to set authenticationField and password as required field', function () {
            expect(User.schema.paths.email.isRequired).to.be.true;
            expect(User.schema.paths.password.isRequired).to.be.true;
        });
    });


    describe('Custom Auth Field', function () {
        let User;
        before(function () {
            var UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                authenticationField: 'username',
                authenticationFieldProperties: { type: String },
                passwordField: 'hash'
            });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able to set custom authentication fields', function () {
            expect(User.schema.paths.username).to.exist;
            expect(User.schema.paths.username.instance).to.be.equal('String');
            expect(User.schema.paths.hash).to.exist;
        });
    });


    describe('Encrypt Password', function () {
        let User;
        before(function (done) {
            var UserSchema = new Schema({});
            UserSchema.plugin(irina);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should be able to encrypt password promise based', function (done) {
            var password = faker.internet.password();
            var email = faker.internet.email();


            var user = new User({
                email: email,
                password: password
            });

            user
                .encryptPassword()
                .then(authenticable => {
                    expect(authenticable.password).to.not.equal(password);
                    done();
                });
        });
    });


    describe('Compare Password', function () {
        let User;
        let authenticable;
        const password = faker.internet.password();
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(irina);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        before('', function (done) {
            const email = faker.internet.email();

            const user = new User({
                email: email,
                password: password
            });

            user
                .encryptPassword()
                .then(auth => {
                    authenticable = auth;
                    done();
                });
        });

        it('should be able to compare password with hash promise based', function (done) {
            authenticable
                .comparePassword(password)
                .then(authenticable => {
                    expect(authenticable).to.be.ok;
                    done();
                });
        });
    });



    describe('Change Password', function () {
        let User;
        before(function (done) {
            var UserSchema = new Schema({});
            UserSchema.plugin(irina);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should be able to change password', function (done) {
            var password = faker.internet.password();
            var email = faker.internet.email();

            var user = new User({
                email: email,
                password: password
            });

            var previousPassword = user.password;

            user
                .changePassword(faker.internet.password())
                .then(authenticable => {
                    expect(authenticable.password).to.not.equal(previousPassword);
                    done();
                });
        });
    });


    describe('Authenticate', function () {
        let User;
        let _credentials;
        before(function (done) {
            var UserSchema = new Schema({});
            UserSchema.plugin(irina);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });


        before(function (done) {
            var credentials = {
                email: faker.internet.email(),
                password: faker.internet.password()
            };

            _credentials = _.clone(credentials);
            _credentials.email = credentials.email.toLowerCase();
            User
                .register(credentials)
                .then(() => {
                    done();
                });
        });

        it('should be able to authenticate credentials', function (done) {
            User
                .authenticate(_credentials)
                .then(authenticable => {
                    expect(authenticable.email).to.be.equal(_credentials.email);
                    done();
                });
        });


        it('should fail when authenticate credentials are invalid', function (done) {
            var credentials = {
                email: faker.internet.email(),
                password: faker.internet.password()
            };

            User
                .authenticate(credentials)
                .catch(error => {
                    expect(error).to.exist;
                    expect(error.message).to.equal('Incorrect email or password');
                    done();
                });
        });

        it('should fails when authenticate with invalid password', function (done) {
            var credentials = {
                email: _credentials.email,
                password: faker.internet.password()
            };

            User
                .authenticate(credentials)
                .catch(error => {
                    expect(error).to.exist;
                    expect(error.message).to.equal('Incorrect email or password');
                    done();
                });
        });
    });
});
