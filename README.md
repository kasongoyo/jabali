# Jabali

[![Coverage Status](https://coveralls.io/repos/github/kasongoyo/jabali/badge.svg?branch=master)](https://coveralls.io/github/kasongoyo/jabali?branch=master)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Jabali is the [mongoose](https://mongoosejs.com/) plugin used as the flexible authentication solution. 
Jabali when plugged into mongoose schema, it extends the schema with some fields based on [OpenID connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims).

## Modules
Jabali is organized on modularity architecture. Jabali modules consists of;

- [Registerable]() Module responsible for user sign up. 
- [Authenticable]() Module to handle authentication flow. 
- [Confirmable]() Module responsible to manage email or phone confirmation.
- [Recoverable]() Module responsible for resetting account password

## Features
 + User signup
 + User login using email, phone number or any other preferred user field together with password. See `aliases` options
 + Email and phone number validation
 + Password validation using configurable policies such as minimum length, presence of number, capital letter etc
 + Account confirmation work flow using email or phone number(You need to have your own setup to send token to phone or email)
 + Password reset work flow
 + Ability to configure time period to allow user to access resources without account confirmation. After the period expired
   user will not be able to authenticate without account confirmation.

## Prerequisites
 - [Nodejs 7.6.0 or greater](https://nodejs.org)
 - [Mongoose 4 or greater](https://mongoosejs.com/)

## Installing
```bash
npm i --save jabali
```

## Usage 

Sample example
```bash
const jabali = require('jabali')

// user schema
const UserSchema = new Schema({
   ...
})

// plugin jabali default module
UserSchema.plugin(jabali, options)

// register user schema
mongoose.model('User', UserSchema)
```

## Options
Jabali's options can be declared as an object with key names corresponding to [modules](#modules) and key values equal to object contain options of the specified module. Below are the options available in each module.

### Registerable

* `email_required` {Boolean} - set if email is required.
* `phone_required` {Boolean} - set if phone is required.
* `password_policies` {Object} - Object with password policies 
* `password_policies.min_length` {Number} - Set the minimum number of character passwor should have
* `password_policies.number` {Boolean} - Set if atleast one number should be present in the password
* `password_policies.lowercase` {Boolean} - Set if atleast one lowercase character should be present in password
* `password_policies.uppercase` {Boolean} - Set if atleast one uppercase character should be present in password

### Authenticable
* `aliases` {String[]} - an array of fields names to use together with password for authentication. Example ['email', 'employeeId'], this will allow to authenticate using email or employeedId as username. EmployeeId is user schema defined field not specific for jabali. Email field is the default field for authentication

### Confirmable
* `token_life` {Number} - Number of days it will take before confirmation token expire. Default is 1 day
* `allow_unconfirmed_access_for` {Number} - Number of days to allow user to authenticate and use the resource before confirming the account. If it is set to zero it means user will not be allowed to authenticate at all before confirming the account. The default is zero

### Recoverable
#### Options
* `token_life` {Number} - Number of days it will take before recoverable token expire. Default is 1 day.
* `aliases` {String[]} - Array of field names to use during password reset. 

Sample example
```bash
const jabali = require('jabali')

// user schema
const UserSchema = new Schema({
   ...
})
const options = {
   // options for authenticable module
   authenticable:{
     aliases: ['email']
   },
   // options for confirmable module
   confirmable: {
      token_life: 7
   }
}
// plugin jabali default module
UserSchema.plugin(jabali, options)

// register user schema
mongoose.model('User', UserSchema)
```

## API
* `Model.register(payload)` - It register an account, the different between this method and normal mongoose create method is the fact that this method register user and set password and other fields as per jabali specification. 
* `Model.unregister(criteria)` - It unregister account
* `Model.authenticate(alias, password)`  
* `Instance.changePassword(newPassword)` 
* `Model.confirm(alias, confirmationToken)` - It calls account confirmation
* `Instance.sendConfirmationInstructions` - It send out account confirmtion instructions. 
* `Model.passwordReset(alias, newPassword, recoveryToken)` - It reset password
* `Instance.sendPasswordResetInstructions()` - It send out password reset instructions.

## Hooks
Jabali also contain hooks that can be used to add flexibility where by user can define custom logics/behaviours that will be in effect prior to various actions. 

### sendJabaliNotification
This schema instance method should be declared for jabali to send out notifications after various actions such as `sendConfirmationDetails` or `sendPasswordResetInstructions`. This function when called, will be passed two parameters, the first parameter will be notification type and the second parameter will be an instance. 

Notification types can be one of the followings;
+ `CONFIRMATION_INSTRUCTIONS` - Triggered during user registration or when calling `sendConfirmationInstructions` method of confirmable
+ `PASSWORD_RESET_INSTRUCTIONS` - Triggered when password reset is executed.

**This function must return promise and should never reject if you don't want notification to affect the prior action that triggered the notification send**. If failure of notification should roll back the prior actions then you can actual reject the promise otherwise always resolve the promise. 

Example
```bash
schema.methods.sendJabaliNotification = function(NOTIFICATION_TYPE, instance){
   if(NOTIFICATION_TYPE === 'CONFIRMATION_INSTRUCTIONS'){
      return Mailer
      .sendEmail(instance.email, instance.confirmationToken)
      .catch(error => {
         // Always resolve because this notification should not roll
         // back registration action which triggered it.
         return Promise.resolve();
      })
   }
    return Promise.resolve();
}
```

### preSignup
This schema instance method will be triggered prior to user signup/registration and **It must return this instance** otherwise it break registeration. It can be used forexample to automatically confirm user from a particular domain as follows;

Example
```bash
schema.methods.preSignup = function(){
   const user = this;
   const addresses = user.email.split('@');
   if(/mydomain/i.test(addresses[1])){
      user.autoConfirm = true;
   }
   return user;
}
```



## Testing
* Clone this repository

* Install all development dependencies
```sh
$ npm install
```
* Then run test
```sh
$ npm test
```

## Built With
- [npm](https://www.npmjs.com/) - Used as the project core technology and build tool

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/kasongoyo/jabali/tags). 

## Authors

* **Isaac Kasongoyo** - *Initial work* 

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments
The code and some of the concepts of this project has been inspired by the following libraries
* [devise](https://github.com/plataformatec/devise)
* [aws cognito](https://aws.amazon.com/cognito/)
* [irina](https://github.com/lykmapipo/irina)