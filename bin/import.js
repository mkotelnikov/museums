var fs = require('fs');
var request = require('superagent');
var newStream = require('./lib/newStream');
var JsonReadStream = require('./lib/JsonReadStream');

return Promise
        .resolve()
        .then(
                function() {
                    var stream = newStream();
                    var bufferSize = 10;
                    var bufferSize = 1024;
                    var buffered = stream.buffered(bufferSize);
                    var sendStream = buffered
                            .map(
                                    function(buf) {
                                        var dataEndpointUrl = 'http://localhost:9876/museums/french/museums/data';
                                        return putData(dataEndpointUrl, buf);
                                    })//
                            .each(function(promise) {
                                promise.then(function(result) {
                                    console.log('* Send a buffer', result);
                                }, function(err) {
                                    console.log('ERROR', err, err.stack);
                                });
                            })
                    sendStream
                            .done(function() {
                                var reindexUrl = 'http://localhost:9876/museums/french/museums/index/q';
                                postData(reindexUrl).then(function() {
                                    console.log('Re-index data', result);
                                }, function(err) {
                                    console.log('ERROR', err, err.stack);
                                });
                            })
                    return loadJson(
                            './data/monuments-museums-wikipedia.geo.json.stream',
                            function(json) {
                                stream.write(json);
                            })//
                    .then(function() {
                        return sendStream;
                    })
                })//
        .then(null, function(err) {
            console.log('ERROR', err, err.stack);
        });

function putData(url, data) {
    return exec('put', url, data);
}
function postData(url, data) {
    return exec('post', url, data);
}
function exec(method, url, data) {
    return new Promise(function(resolve, reject) {
        var r = request[method](url).set('Accept', 'application/json');
        if (data) {
            r.send(data);
        }
        r.end(function(err, res) {
            if (err) {
                reject(err);
            } else if (!res.ok) {
                reject(new Error(res.error));
            } else {
                resolve(res.body);
            }
        });
    });
}

function loadJson(fileName, callback) {
    var that = this;
    return new Promise(function(resolve, reject) {
        fs.createReadStream(fileName, {
            encoding : 'utf8'
        }).pipe(new JsonReadStream()).on('data', function(json) {
            callback(json);
        }).on('end', function() {
            resolve();
        }).on('error', reject);
    });
}