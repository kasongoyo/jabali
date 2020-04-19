'use strict';
/* eslint mocha/no-top-level-hooks: 0 */

//dependencies
const mongoose = require('mongoose');

before(function (done) {
    //setup database
    mongoose.connect('mongodb://localhost/jabali', done);
});

/**
 * @description wipe all mongoose model data and drop all indexes
 */
function wipe(done) {
    const cleanups = mongoose.modelNames()
      .map(function (modelName) {
        //grab mongoose model
        return mongoose.model(modelName);
      })
      .map(async Model => {
        //clean up all model data
        await Model.deleteMany({});
        //drop all indexes
        await Model.collection.dropIndexes();
        return;
      });
  
    //run all clean ups parallel
    Promise
      .all(cleanups)
      .then(() => { done(null) })
      .catch(error => {
        if (error && error.message !== 'ns not found') {
          done(error);
        } else {
          done(null);
        }
      });
  }

//clean database
after(function (done) {
    this.timeout(10000);
    //wait for mongodb background tasks
    //
    //Fix for MongoError: exception: cannot perform operation: 
    //a background operation is currently running for collection <collectionName>
    setTimeout(function () {
        wipe(done);
    }, 1000);
});