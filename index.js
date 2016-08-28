var ecstatic = require('ecstatic');
var path = require('path');
var MosaicService = require('mosaic-api-service').MosaicService;
var teleport = require('mosaic-teleport')(Promise);
var config = require('./.config');

var dbConf = config.getDbConfig();
var service = new MosaicService({
    ttl : 2, // 2 sec tiles in cache
    ttlStyle : 60 * 60 * 24, // style should live 24 hours
    ttlSource : 1, // loaded data should live 1 sec,
    cacheDir : path.resolve(__dirname, './.cache'),
//    noTilesCache : true,
    baseDir : __dirname,
    db : dbConf,
    locale : 'french',
});
var serviceAdapter = new teleport.ServiceAdapter(service);
var serviceHandler = teleport.remote.getServerHandler('/', serviceAdapter);

var staticHandler = ecstatic({
    root : __dirname + '/static',
    handleError : false,
});
module.exports = function(req, res, next) {
    req.url = req.params.path;
    staticHandler(req, res, function() {
        res.status(200);
        serviceHandler(req, res, next);
    });
}
