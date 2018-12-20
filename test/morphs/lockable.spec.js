'use strict';

//dependencies
const faker = require('faker');
const path = require('path');
const mongoose = require('mongoose');
const expect = require('chai').expect;
const Schema = mongoose.Schema;
const irina = require(path.join(__dirname, '..', '..', 'index'));


describe('Lockable', function () {

    describe('Lockable Path', function () {
        let User;
        before(function () {
            const UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                }
            });

            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should have lockable attributes', function () {

            expect(User.schema.paths.failedAttempts).to.exist;
            expect(User.schema.paths.lockedAt).to.exist;
            expect(User.schema.paths.unlockedAt).to.exist;
            expect(User.schema.paths.unlockToken).to.exist;
            expect(User.schema.paths.unlockSentAt).to.exist;
            expect(User.schema.paths.unlockTokenExpiryAt).to.exist;
        });
    });


    describe('Generate Unlock Token', function () {
        let User;
        before(function () {
            const UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                }
            });

            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able to generate unlock token', function () {
            const user = new User({
                email: faker.internet.email(),
                password: faker.internet.password()
            });

            const lockable = user.generateUnlockToken();
            expect(lockable.unlockToken).to.not.be.null;
            expect(lockable.unlockTokenExpiryAt).to.not.be.null;
        });
    });



    describe('Send Unlock Instructions', function () {
        let User;
        before(function () {
            const UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                }
            });

            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        it('should be able to send unlock instructions', function (done) {
            const user = new User({
                email: faker.internet.email(),
                password: faker.internet.password()
            });

            user
                .sendUnLock()
                .then(lockable => {
                    expect(lockable.unlockTokenSentAt).to.not.be.null;
                    done();
                });
        });
    });



    describe('Lock Account', function () {
        let LUser, User;
        before(function () {
            const UserLockableSchema = new Schema({});

            UserLockableSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                },
                lockable: {
                    enabled: true
                }
            });

            LUser = mongoose.model(`User+${faker.random.number()}`, UserLockableSchema);

            const UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                }
            });

            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);

        });

        it('should be able to lock account', function (done) {
            const user = new LUser({
                email: faker.internet.email(),
                password: faker.internet.password(),
                failedAttempts: 5
            });

            user
                .lock()
                .then(lockable => {
                    expect(lockable.lockedAt).to.not.be.null;
                    done();
                });
        });


        it('should fail to lock account user with lockable.enabled false promise style', function (done) {
            const user = new User({
                email: faker.internet.email(),
                password: faker.internet.password(),
                failedAttempts: 5
            });

            user
                .lock()
                .then(lockable => {
                    expect(lockable.lockedAt).to.be.null;
                    done();
                });
        });
    });


    describe('Check if Locked', function () {
        let LUser, user;
        before(function () {
            const UserLockableSchema = new Schema({});

            UserLockableSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                },
                lockable: {
                    enabled: true
                }
            });

            LUser = mongoose.model(`User+${faker.random.number()}`, UserLockableSchema);

        });


        before(function (done) {
            user = new LUser({
                email: faker.internet.email(),
                password: faker.internet.password(),
                failedAttempts: 5
            });
            user
                .lock()
                .then(() => {
                    done();
                });
        });


        it('should be able to check if account is locked', function (done) {
            user
                .isLocked()
                .catch(error => {
                    expect(error).to.exist;
                    expect(error.message)
                        .to.equal('Account locked. Check unlock instructions sent to you.');
                    done();
                });
        });
    });


    describe('Unlock Account', function () {
        let LUser;
        let unlockToken;
        const email = faker.internet.email();
        before(function () {
            const UserLockableSchema = new Schema({});

            UserLockableSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                },
                lockable: {
                    enabled: true
                }
            });

            LUser = mongoose.model(`User+${faker.random.number()}`, UserLockableSchema);

        });

        before(function (done) {
            LUser
                .register({
                    email,
                    password: faker.internet.password()
                })
                .then(lockable => lockable.generateUnlockToken())
                .then(lockable => lockable.sendUnLock())
                .then(lockable => {
                    unlockToken = lockable.unlockToken;
                    done();
                });
        });

        it('should be able to unlock account', function (done) {
            LUser.unlock({ unlockToken, email })
                .then(lockable => {
                    expect(lockable.unlockedAt).to.not.be.null;
                    expect(lockable.lockedAt).to.be.null;
                    expect(lockable.failedAttempts).to.equal(0);
                    done();
                });
        });
    });


    describe('Fail to Authenticate Locked Account', function () {
        let LUser, lockable, credentials;
        before(function () {
            const UserLockableSchema = new Schema({});

            UserLockableSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                },
                lockable: {
                    enabled: true
                }
            });

            LUser = mongoose.model(`User+${faker.random.number()}`, UserLockableSchema);

        });

        before(function (done) {
            credentials = {
                email: faker.internet.email(),
                password: faker.internet.password(),
                failedAttempts: 5
            };

            LUser
                .register(credentials)
                .then(user => {
                    return user
                        .lock();
                })
                .then(_lockable_ => {
                    lockable = _lockable_;
                    done();
                });

        });

        it('should not be able to authenticate registered locked account', function (done) {
            lockable
                .authenticate(credentials.password)
                .catch(error => {
                    expect(error).to.exist;
                    expect(error.message)
                        .to.equal('Account locked. Check unlock instructions sent to you.');
                    done();
                });
        });
    });


    describe('Reset Failed Attempts', function () {
        let User, lockable;
        before(function () {
            const UserSchema = new Schema({});
            UserSchema.plugin(irina, {
                registerable: {
                    autoConfirm: true
                }
            });

            User = mongoose.model(`User+${faker.random.number()}`, UserSchema);
        });

        before(function (done) {
            const user = new User({
                email: faker.internet.email(),
                password: faker.internet.password(),
                failedAttempts: 5
            });
            user
                .save()
                .then(() => {
                    lockable = user;
                    done();
                });
        });

        it('should be able to reset failed attempts', function (done) {
            lockable.resetFailedAttempts()
                .then(lockable => {
                    expect(lockable.failedAttempts).to.be.equal(0);
                    done();
                });
        });
    });
});
