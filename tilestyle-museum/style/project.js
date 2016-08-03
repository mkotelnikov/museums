module.exports = function() {
    var style = require('./style');
    return {
        bufferSize : 256,
        "srs" : "+init=epsg:3857",
        "Stylesheet" : [ style ],
        "interactivity" : {
            "layer" : "museums",
            "fields" : []
        },
        "Layer" : [ {
            "srs" : "+init=epsg:4326",
            "name" : "museums"
        } ]
    };
};