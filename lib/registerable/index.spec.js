'use strict';

//dependencies
const faker = require('faker');
const path = require('path');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const Schema = mongoose.Schema;
const jabali = require(path.join(__dirname, 'index'));

describe('Registerable', function () {

    describe('Set Predefined Fields', function () {
        let User;
        before(function () {
            var UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able to set jabali predefined fields successfully', function () {
            expect(User.schema.paths.email).to.exist;
            expect(User.schema.paths.phoneNumber).to.exist;
            expect(User.schema.paths.password).to.exist;
            expect(User.schema.paths.registeredAt).to.exist;
            expect(User.schema.paths.unregisteredAt).to.exist;
        });
    });


    describe('Predefined Fields Override', function () {
        let User;
        before(function () {
            var UserSchema = new Schema({
                password: String
            });
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able override user fields with name same as predefined', function () {
            expect(User.schema.paths.password.validators).to.not.be.empty;
        });
    });

    describe('Email Field Validation', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should save user with email', function (done) {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const user = new User({
                email,
                password
            });
            user
                .save()
                .then(doc => {
                    expect(doc.email).to.equal(email.toLowerCase());
                    done();
                });
        });

        it('should save user without email field', function (done) {
            const password = faker.internet.password();
            const user = new User({
                password
            });
            user
                .save()
                .then(doc => {
                    expect(doc).to.exist;
                    done();
                });
        });

        it('should not be able to save user with invalid email', function (done) {
            const email = faker.random.words(2);
            const password = faker.internet.password();
            const user = new User({
                email,
                password: password
            });
            user
                .save()
                .catch(error => {
                    expect(error.errors['email']).to.exist;
                    done();
                });
        });
    });

    describe('Email Field Required', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali, { email_required: true });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should not be able to save user without email when it is required', function (done) {
            const password = faker.internet.password();
            const user = new User({ password });
            user
                .save()
                .catch(error => {
                    expect(error.errors['email']).to.exist;
                    done();
                });
        });
    });

    describe('Phone Number Field Validation', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should save user with valid phone number', function (done) {
            const phoneNumber = '+8801811003010' || faker.phone.phoneNumber();
            const password = faker.internet.password();
            const user = new User({
                phoneNumber,
                password
            });
            user
                .save()
                .then(doc => {
                    expect(doc.phoneNumber).to.equal(phoneNumber);
                    done();
                });
        });

        it('should not be able to save user with invalid phone', function (done) {
            const phoneNumber = faker.random.words(2);
            const password = faker.internet.password();
            const user = new User({
                phoneNumber,
                password: password
            });
            user
                .save()
                .catch(error => {
                    expect(error.errors['phoneNumber']).to.exist;
                    done();
                });
        });
    });

    describe('Phone Number Field Required', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali, { phone_required: true });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should not be able to save user without phone number when it is required', function (done) {
            const password = faker.internet.password();
            const user = new User({ password });
            user
                .save()
                .catch(error => {
                    expect(error.errors['phoneNumber']).to.exist;
                    done();
                });
        });
    });

    describe('Password Field Validation', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali, {
                password_policies: {
                    min_length: 6,
                    has_number: true,
                    has_uppercase: true,
                    has_lowercase: true
                }
            });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should successfully save user with valid password', function (done) {
            const testUser = new User({
                email: faker.internet.email().toLowerCase(),
                password: 'pAssword6'
            });
            testUser
                .save()
                .then(user => {
                    expect(user.email).to.equal(testUser.email);
                    done();
                });
        });

        it('should not be able to save user without password', function (done) {
            const user = new User({ email: faker.internet.email() });
            user
                .save()
                .catch(error => {
                    expect(error.errors['password']).to.exist;
                    done();
                });
        });

        it('should not be able to save user with shorter password', function (done) {
            const testUser = new User({
                email: faker.internet.email(),
                password: 'past'
            });

            testUser
                .save()
                .catch(error => {
                    expect(error.errors['password']).to.exist;
                    done();
                });
        });

        it('should not be able to save user with password without number', function (done) {
            const testUser = new User({
                email: faker.internet.email(),
                password: 'password'
            });

            testUser
                .save()
                .catch(error => {
                    expect(error.errors['password']).to.exist;
                    done();
                });
        });

        it('should not be able to save user with password without uppercase character', function (done) {
            const testUser = new User({
                email: faker.internet.email(),
                password: 'password7'
            });

            testUser
                .save()
                .catch(error => {
                    expect(error.errors['password']).to.exist;
                    done();
                });
        });

        it('should not be able to save user with password without lowercase character', function (done) {
            const testUser = new User({
                email: faker.internet.email(),
                password: 'PASSWORD7'
            });

            testUser
                .save()
                .catch(error => {
                    expect(error.errors['password']).to.exist;
                    done();
                });
        });
    });


    describe('Register Account', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should be able to register account', function (done) {
            const email = faker.internet.email();

            const $credentials = {
                email: email,
                password: faker.internet.password()
            };

            User
                .register($credentials)
                .then(registerable => {
                    expect(registerable.registeredAt).to.not.be.null;
                    done();
                });
        });
    });

    describe('Change Password', function () {
        let User;
        let testUser;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali, {
                password_policies: {
                    min_length: 6
                }
            });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });


        before('Create user', function (done) {
            const user = new User({
                email: faker.internet.email(),
                password: faker.internet.password()
            });
            User
                .register(user)
                .then(doc => {
                    testUser = doc;
                    done();
                });
        });


        it('should be able to change password', function (done) {
            const previousPassword = testUser.password;
            testUser
                .changePassword(faker.internet.password())
                .then(registerable => {
                    expect(registerable.password).to.not.equal(previousPassword);
                    done();
                });
        });

        it('should fail to change password if new password fails validation', function (done) {
            const newPassword = 'pwd';
            testUser
                .changePassword(newPassword)
                .catch(error => {
                    expect(error).to.exist;
                    done();
                });
        });

        it('should fail to change password when empty password provided', function (done) {
            testUser
                .changePassword('')
                .catch(error => {
                    expect(error.name).to.equal('BadRequestError');
                    done();
                });
        });
    });



    describe('Duplicate Account', function () {
        let User;
        let email;
        let $credentials;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        before(function (done) {
            email = faker.internet.email();
            $credentials = {
                email: email,
                password: faker.internet.password()
            };

            User
                .register($credentials)
                .then(() => {
                    done();
                });
        });

        it('should not be able to register duplicate account', function (done) {
            User
                .register($credentials)
                .catch(error => {
                    expect(error).to.exist;
                    done();
                });
        });
    });


    describe('Unregister Account', function () {
        let User;
        let email;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });
        before(function (done) {
            email = faker.internet.email();

            const $credentials = {
                email: email,
                password: faker.internet.password()
            };

            User
                .register($credentials)
                .then(() => {
                    done();
                });
        });

        it('should be able to unregister account', function (done) {
            User.unregister({ email: email.toLowerCase() })
                .then(registerable => {
                    expect(registerable.unregisteredAt).to.not.be.null;
                    done();
                });
        });
    });


    describe('Autoconfirm Account', function () {
        let User;
        before(function (done) {
            const UserSchema = new Schema({});
            UserSchema.methods.preSignup = function () {
                const registerable = this;
                registerable.autoConfirm = true;
                return registerable;
            }
            UserSchema.plugin(jabali);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        it('should be able to auto confirm registration', function (done) {
            const credentials = {
                email: faker.internet.email(),
                password: faker.internet.password()
            };

            User
                .register(credentials)
                .then(registerable => {
                    expect(registerable.confirmedAt).to.not.be.null;
                    done();
                });
        });
    });

});