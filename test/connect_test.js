var mongodb = process.env['TEST_NATIVE'] != null ? require('../lib/mongodb').native() : require('../lib/mongodb').pure();
var useSSL = process.env['USE_SSL'] != null ? true : false;

var testCase = require('nodeunit').testCase,
  debug = require('util').debug,
  inspect = require('util').inspect,
  nodeunit = require('nodeunit'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  connect = mongodb.connect,
  gleak = require('../dev/tools/gleak'),
  Script = require('vm'),
  Collection = mongodb.Collection,
  Server = mongodb.Server;

var MONGODB = 'integration_tests';
var clientUrl = 'mongo://localhost:27017/?safe=false' + MONGODB + (useSSL == true ? '&ssl=true' : '');

/**
 * @ignore
 */
function connectionTester(test, testName) {
  return function(err, db) {
    test.equal(err, null);
    db.collection(testName, function(err, collection) {
      test.equal(err, null);
      var doc = {foo:123};
      collection.insert({foo:123}, {safe:true}, function(err, docs) {
        test.equal(err, null);
        db.dropDatabase(function(err, done) {
          db.close();
          test.equal(err, null);
          test.ok(done);
          test.done();
        });
      });
    });
  };
};

/**
 * @ignore
 */
exports.testConnectNoOptions = function(test) {
  connect(clientUrl, connectionTester(test, 'testConnectNoOptions'));
};

/**
 * @ignore
 */
exports.testConnectDbOptions = function(test) {
  connect(clientUrl,
          { db: {native_parser: (process.env['TEST_NATIVE'] != null)} },
          connectionTester(test, 'testConnectDbOptions'));
};

/**
 * @ignore
 */
exports.testConnectServerOptions = function(test) {
  connect(clientUrl,
          { server: {auto_reconnect: true, poolSize: 4} },
          connectionTester(test, 'testConnectServerOptions'));
};

/**
 * @ignore
 */
exports.testConnectAllOptions = function(test) {
  connect(clientUrl,
          { server: {auto_reconnect: true, poolSize: 4},
            db: {native_parser: (process.env['TEST_NATIVE'] != null)} },
          connectionTester(test, 'testConnectAllOptions'));
};

/**
 * @ignore
 */
exports.testConnectGoodAuth = function(test) {
  var user = 'testConnectGoodAuth', password = 'password';
  // First add a user.
  connect(clientUrl, function(err, db) {
    test.equal(err, null);
    db.addUser(user, password, function(err, result) {
      test.equal(err, null);
      db.close();
      restOfTest();
    });
  });

  function restOfTest() {
    var url = 'mongo://' + user + ':' + password + '@localhost:27017/?safe=false' + MONGODB + (useSSL == true ? '&ssl=true' : '');
    connect(url, connectionTester(test, 'testConnectGoodAuth'));
  }
};

/**
 * @ignore
 */
exports.testConnectBadAuth = function(test) {
  var url = 'mongo://slithy:toves@localhost:27017/?safe=false' + MONGODB + (useSSL == true ? '&ssl=true' : '');
  connect(url, function(err, db) {    
    test.ok(err);
    test.ok(db);
    db.close();
    test.done();
  });
};

/**
 * @ignore
 */
exports.testConnectNoOpen = function(test) {
  var db = connect('mongo://localhost:27017/?safe=false' + MONGODB, {noOpen:true});
  test.ok(db != null);
  test.done();
};

/**
 * @ignore
 */
exports.testConnectThrowsNoCallbackProvided = function(test) {
  test.throws(function() {
    var db = connect('mongo://localhost:27017/?safe=false' + MONGODB);
  });
  test.done();
};

/**
 * @ignore
 */
exports.testConnectBadUrl = function(test) {
  test.throws(function() {
    connect('mango://localhost:27017/?safe=false' + MONGODB, function(err, db) {
      test.ok(false, 'Bad URL!');
    });
  });
  test.done();
};

/**
 * Example of a simple url connection string.
 *
 * @_class db
 * @_function Db.connect
 * @ignore
 */
exports.shouldCorrectlyDoSimpleCountExamples = function(test) {
  // Connect to the server
  Db.connect('mongodb://localhost:27017/integration_tests?safe=false' + (useSSL == true ? '&ssl=true' : ''), function(err, db) {
    test.equal(null, err);
    
    db.close();
    test.done();
  });
}


/**
 * @ignore
 */
exports.noGlobalsLeaked = function(test) {
  var leaks = gleak.detectNew();
  test.equal(0, leaks.length, "global var leak detected: " + leaks.join(', '));
  test.done();
}
