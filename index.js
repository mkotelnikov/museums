var ecstatic = require('ecstatic');
var MosaicService = require('mosaic-api-service').MosaicService;
var teleport = require('mosaic-teleport')(Promise);
var config = require('./.config');

var dbConf = config.getDbConfig();
var service = new MosaicService({
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
