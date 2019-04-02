'use strict';

//dependencies
const faker = require('faker');
const path = require('path');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const Schema = mongoose.Schema;
const jabali = require(path.join(__dirname, '..', 'index'));
const Authenticable = require(path.join(__dirname, 'index'));
const Utils = require(path.join(__dirname, '..', 'utils'));

describe('Authenticable', function () {

    describe('Default Field Authentication', function () {
        let User;
        let hashedPwd;
        const password = faker.internet.password();
        const email = faker.internet.email().toLowerCase();
        before(function (done) {
            var UserSchema = new Schema({});
            UserSchema.plugin(jabali);
            UserSchema.plugin(Authenticable);
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        before(function (done) {
            Utils
                .hash(password, 10)
                .then(hash => {
                    hashedPwd = hash;
                    done();
                });
        })


        before(function (done) {
            const testUser = { email, password: hashedPwd };
            User
                .create(testUser)
                .then(() => {
                    done();
                });
        });

        it('should be able to authenticate with valid credentials', function (done) {
            User
                .authenticate(email, password)
                .then(authenticable => {
                    expect(authenticable.email).to.be.equal(email);
                    done();
                });
        });


        it('should fail when authenticate credentials are invalid', function (done) {
            User
                .authenticate(faker.internet.email(), faker.internet.password())
                .catch(error => {
                    expect(error.name).to.equal('NotFoundError');
                    done();
                });
        });

        it('should fail to authenticate with invalid password', function (done) {
            User
                .authenticate(email, faker.internet.password())
                .catch(error => {
                    expect(error.name).to.equal('BadRequestError');
                    done();
                });
        });
    });

    describe('Aliases Field Authentication', function () {
        let User;
        let hashedPwd;
        const password = faker.internet.password();
        const username = faker.internet.userName().toLowerCase();
        const email = faker.internet.email().toLowerCase();
        before(function (done) {
            var UserSchema = new Schema({
                username: {
                    type: String,
                    unique: true
                }
            });
            UserSchema.plugin(jabali);
            UserSchema.plugin(Authenticable, {
                aliases: ['username', 'email']
            });
            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
            done();
        });

        before(function (done) {
            Utils
                .hash(password, 10)
                .then(hash => {
                    hashedPwd = hash;
                    done();
                });
        })


        before(function (done) {
            const testUser = { email, username, password: hashedPwd };
            User
                .create(testUser)
                .then(() => {
                    done();
                });
        });

        it('should be able to authenticate with valid credentials', function (done) {
            User
                .authenticate(username, password)
                .then(authenticable => {
                    expect(authenticable.email).to.be.equal(email);
                    done();
                });
        });


        it('should fail to authenticate with invalid password', function (done) {
            User
                .authenticate(username, faker.internet.password())
                .catch(error => {
                    expect(error.name).to.equal('BadRequestError');
                    done();
                });
        });
    });
});
