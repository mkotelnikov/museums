var path = require('path');
module.exports = {
    bufferSize : 256,
    baseDir : __dirname,
    cacheDir : path.resolve(__dirname, '../.cache'),
    ttlSource : 30 * 60, // 30 minutes in cache for sources
    ttlStyle : 0, // infinite cache of styles
    ttl : 0,
    fields : {
        'name' : 'properties.name',
        'category' : 'properties.category'
    }

}
