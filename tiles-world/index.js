var path = require('path');
module.exports = {
    baseDir : __dirname,
    cacheDir : path.resolve(__dirname, '../.cache'),
    ttlSource : 30 * 60, // 30 minutes in cache for sources
    ttlStyle : 0, // infinite cache of styles
    ttl : 0
}
