var http            = require('http'),
    os              = require('os'),
    mongodb         = require('../../lib/mongodb'),
    Server          = mongodb.Server,
    ReplicaSetManager = require('../tools/replica_set_manager').ReplicaSetManager,
    ReplSetServers  = mongodb.ReplSetServers,
    Db              = mongodb.Db;

console.log('launching simple mongo application...');

//open replicaset
var replSet = new ReplSetServers([
        new Server('127.0.0.1', 30000, { auto_reconnect: true }),
        new Server('127.0.0.1', 30001, { auto_reconnect: true }),
        new Server('127.0.0.1', 30002, { auto_reconnect: true })
    ], {
      rs_name: 'testappset',
      read_secondary: true,
      // ha:true
    }
);

RS = new ReplicaSetManager({name:"testappset", retries:120, secondary_count:2, passive_count:0, arbiter_count:0});
RS.startSet(true, function(err, result) {
  if(err != null) throw err;

  //opens the database
  var db = new Db('testapp', replSet);
  db.open(function(err) {
      if (err) return console.log('database open error %o', err);
      console.log('database opened');

      db.collection('stats', function(statsErr, stats) {
          if (statsErr) return console.log('error opening stats %o', err);
          stats.remove({}, {safe:true}, function(err, result) {
            console.log("================================================================")
            console.dir(err)

            stats.insert({name:'reqcount', value:0}, {safe:true}, function(err, result) {
              console.log("================================================================")
              console.dir(err)
              //create server
              http.createServer(function (req, res) {
                  if (req.url !== '/') {
                      res.end();
                      return console.log('invalid request performed');
                  }

                  //get amount of requests done
                  stats.findOne({name: 'reqcount'}, function(err, reqstat) {
                      if(err) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.end('Hello World, from server node: ' + os.hostname() + '...\nError #' + err + ', reqstat ' + reqstat
                          + ", secondaries.length " + db.serverConfig.secondaries.length
                          + ", passives.length " + db.serverConfig.passives.length
                          + ", arbiters.length " + db.serverConfig.arbiters.length
                          + ", primary " + (db.serverConfig.primary == null ? false : true)
                        );
                        return console.log('reqstat is null!');
                      }
                      var reqcount = reqstat.value;

                      //write to client
                      res.writeHead(200, {'Content-Type': 'text/plain'});
                      res.end('Hello World, from server node: ' + os.hostname() + '...\nThis is visit #' + reqcount
                        + ", secondaries.length " + db.serverConfig.secondaries.length
                        + ", passives.length " + db.serverConfig.passives.length
                        + ", arbiters.length " + db.serverConfig.arbiters.length
                        + ", primary " + (db.serverConfig.primary == null ? false : true)
                      );
                  });

                  //increment amount of requests
                  console.log('incrementing request by 1!');
                  stats.update({name: 'reqcount'}, {'$inc': {value: 1}}, {upsert: true});
              }).listen(8000);
            });
          });

          console.log('Server running at port 8000');
      });
  });
});

