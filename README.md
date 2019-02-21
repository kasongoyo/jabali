# Jabali

Jabali is the [mongoose](https://mongoosejs.com/) plugin used as the flexible authentication solution inspired by [devise](https://github.com/plataformatec/devise), [aws cognito](https://aws.amazon.com/cognito/) and [irina](https://github.com/lykmapipo/irina). Jabali use [mongoose](https://mongoosejs.com/) and [nodejs](https://nodejs.org) as the core technologies.
Jabali when you plugged into mongoose schema, it extends the schema with the predefined user schema fields based on [OpenID connect specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims).

Jabali is based on modularity concept and you can only use what you need. The jabali modules are;

- [Authenticable]() It manage password management and authentication flow. This module is **required**.
- [Registerable]() Optional module to manage user registration.
- [Confirmable]() generate account confirmation instructions, sends out confirmation instructions and handle the actual account confirmation.
- [Recoverable]() Optional module used to manage password recovery.

Tools used;
- [mongodb]()
- [mongoose]()
- [nodejs]()
- [http errors](https://www.npmjs.com/package/http-errors)

## How to use
Install it
```bash
npm i --save jabali
```

pluge it into your user schema
```bash
const jabali = require('jabali')

// user schema
const UserSchema = new Schema({
   ...
})

// plugin jabali to user schema
UserSchema.plugin(jabali)

// register user schema
mongoose.model('User', UserSchame)

```


### Sending Issues
It is recommended to use job queue like [kue](https://github.com/learnboost/kue) when implementing your `send` to reduce your API response time.


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

## Contribute
It will be nice, if you open an issue first so that we can know what is going on, then, fork this repo and push in your ideas. Do not forget to add a bit of test(s) of what value you adding.


## Licence
The MIT License (MIT)

Copyright (c) 2015 kasongoyo & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 