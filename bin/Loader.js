var jsdom = require('jsdom');
var crypto = require('crypto');
var request = require('superagent');
var path = require('path');
var fs = require('fs');
var ninvoke = require('./ninvoke');

function Loader(options) {
    this.options = options;
}

Loader.prototype.getPage = function(url) {
    var that = this;
    return Promise.resolve().then(function() {
        return that.getResource(url).then(function(content) {
            var string = content.toString();
            return ninvoke(jsdom, 'env', string);
        });
    })
}

Loader.prototype.getResource = function(url) {
    var that = this;
    return Promise.resolve().then(function() {
        return that._loadFromCache(url).then(function(content) {
            if (content) {
                return content;
            }
            return that._loadResource(url).then(function(content) {
                return that._storeToCache(url, content).then(function() {
                    return content;
                });
            })
        })
    });
}

Loader.prototype._loadResource = function(url) {
    var stack = new Error().stack;
    var that = this;
    if (!that._loadPromise) {
        that._loadPromise = Promise.resolve();
    }
    // Serialize all resource calls
    return that._loadPromise = that._loadPromise.then(function() {
        return new Promise(function(resolve, reject) {
            return request.get(url).end(function(err, res) {
                if (err) {
                    return reject(err);
                }
                var content = res.text || res.body;
                var buffer = new Buffer(content);
                return resolve(buffer);
            });
        });
    });
}

// -------------------------------------------------------
// Cache management

Loader.prototype._getHash = function(str) {
    var shasum = crypto.createHash('sha1');
    shasum.update(str);
    return shasum.digest('hex');
}

Loader.prototype._getFileStats = function(file) {
    return ninvoke(fs, 'lstat', file).then(null, function(err) {
        if (err.code === 'ENOENT') {
            return null;
        }
        throw err;
    });
}
Loader.prototype._checkCacheDir = function() {
    var that = this;
    return that._checkCacheDirPromise = that._checkCacheDirPromise
            || Promise.resolve().then(function() {
                var cacheDir = that.options.cacheDir;
                return that._getFileStats(cacheDir).then(function(stat) {
                    if (!stat) {
                        return ninvoke(fs, 'mkdir', cacheDir);
                    }
                })
            });
}

Loader.prototype._loadFromCache = function(url) {
    var that = this;
    return Promise.resolve().then(function() {
        var cacheDir = that.options.cacheDir;
        var hash = that._getHash(url);
        var cacheFile = path.resolve(cacheDir, hash);
        return that._checkCacheDir().then(function() {
            return that._getFileStats(cacheFile);
        }).then(function(stat) {
            if (stat && stat.isFile()) {
                return ninvoke(fs, 'readFile', cacheFile);
            }
        })
    });
}

Loader.prototype._storeToCache = function(url, content) {
    var that = this;
    return Promise.resolve().then(function() {
        return that._checkCacheDir().then(function() {
            var cacheDir = that.options.cacheDir;
            var hash = that._getHash(url);
            var cacheFile = path.resolve(cacheDir, hash);
            return ninvoke(fs, 'writeFile', cacheFile, content);
        }).then(function(stat) {
            return content;
        })
    });
}

module.exports = Loader;
