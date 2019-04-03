# Jabali

Jabali is the [mongoose](https://mongoosejs.com/) plugin used as the flexible authentication solution. 
Jabali when plugged into mongoose schema, it extends the schema with some fields based on [OpenID connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims).

Jabali is based on modularity concept and you can only use what you need. The jabali modules are as follows;

- [Authenticable]() Module to manage password management and authentication flow. 
- [Registerable]() Module responsible for user sign up.
- [Confirmable]() Module responsible to send emails with confirmation instructions and to verify if an account is already confirmed to sign in.
- [Recoverable]() Module responsible for resetting account password and send reset instructions


## Prerequisites
 - [Nodejs 7.6.0 or greater](https://nodejs.org)
 - [Mongoose 4 or greater](https://mongoosejs.com/)

## Installing
```bash
npm i --save jabali
```

## Usage

### Default Usage
In the default module, jabali is plugin with all of it's modules     
Simple example
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
UserSchema.plugin(jabali,options)

// register user schema
mongoose.model('User', UserSchema)
```
Options is an object with key names same as module names and value of type object contain configuration per that specified module in a key.

### Custom Usage
Jabali can be customized by plugin only modules user requires. Please note that
when you use jabali this way, you must plugin registerable module because all
other modules depends on it to be functional

Simple example

```bash
const {Authenticable, Registerable, Confirmable, Recoverable} = require('jabali/modules')

// user schema
const UserSchema = new Schema({
   ...
})

// plugin jabali default module
UserSchame.plugin(Registerable)
// plugin jabali authentication module
UserSchema.plugin(Authenticable,{ aliases: ['email']})
// plugin jabali confirmable module
UserSchame.plugin(Confirmable, { token_life: 7})
// plugin jabali recoverable module
UserSchame.plugin(Recoverable, options)

// register user schema
mongoose.model('User', UserSchema)

```
Jabali options are declared per each module plugin. 

## Options
Jabali plugin options should be declared per module either in default or custom usage. In default usage, options per each module are contained in the options object as value to the keys corresponding to module name and in custom usage each module options can be passed during pluging of the specific module.

### Authenticable
#### Options
* `aliases` {String[]} - an array of fields names to use together with password for authentication. Example ['email', 'employeeId'], this will allow to authenticate using email or employeedId as username. EmployeeId is user schema defined field not specific for jabali. Email field is the default field for authentication

#### Methods
* `Model.authenticate(alias, password)`  
* `Instance.changePassword(newPassword)` 

 Example
 ```bash
 const jabali = require('jabali')

// user schema
const UserSchema = new Schema({
   ...
})

// plugin jabali default module
UserSchema.plugin(jabali,{...})

UserModel.authenticate('info@email.com', 'password')
 ```

### Confirmable
#### Options
* `token_life` {Number} - Number of days it will take before confirmation token expire. Default is 1 day
* `allow_unconfirmed_access_for` {Number} - Number of days to allow user to authenticate and use the resource before confirming the account. If it is set to zero it means user will not be allowed to authenticate at all before confirming the account. The default is zero

#### Methods
* `Model.confirm(alias, confirmationToken)` - It calls account confirmation
* `Instance.sendConfirmationInstructions` - It send out account confirmtion instructions. 

### Registerable
#### Options
* `email_required` {Boolean} - set if email is required.
* `phone_required` {Boolean} - set if phone is required.
* `password_policies` {Object} - Object with password policies 
* `password_policies.min_length` {Number} - Set the minimum number of character passwor should have
* `password_policies.number` {Boolean} - Set if atleast one number should be present in the password
* `password_policies.lowercase` {Boolean} - Set if atleast one lowercase character should be present in password
* `password_policies.uppercase` {Boolean} - Set if atleast one uppercase character should be present in password
#### Methods
* `Model.register(payload)` - It register an account, the different between this method and normal mongoose create method is the fact that this method register user and set password and other fields as per jabali specification. 
* `Model.unregister(criteria)` - It unregister account

### Recoverable
#### Options
* `token_life` {Number} - Number of days it will take before recoverable token expire. Default is 1 day.
* `aliases` {String[]} - Array of field names to use during password reset.

#### Methods
* `Model.passwordReset(alias, newPassword, recoveryToken)` - It reset password
* `Instance.sendPasswordResetInstructions()` - It send out password reset instructions.

## Hooks
Jabali plugin also contain hooks that can be used to add custom logics that will be triggered internal by jabali prior to various actions. 

### schema.methods.preSignup
This schema instance method will be triggered prior to user signup/registration and **It must return this instance** otherwise it break registeration. It can be used forexample to automatically confirm user from a particular domain as follows;

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

### schema.methods.sendJabaliNotification
This schema instance method must be declared to be able to send out notification after various actions such as `sendConfirmationDetails` or `sendPasswordResetInstructions`. This function when called by jabali, it will be passed two parameters, the first parameter will be notification type and the second parameter will be an instance.

**This function must return promise and should never reject if you don't want notification to affect the prior action that triggered the notification send**. If failure of notification should roll back the prior actions then you can actual reject the promise otherwise always resolve the promise. 

Sample
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

Jabali support the following notification types;
+ `CONFIRMATION_INSTRUCTIONS` - Triggered during user registration or when calling `sendConfirmationInstructions` method of confirmable
+ `PASSWORD_RESET_INSTRUCTIONS` - Triggered when password reset is executed.




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