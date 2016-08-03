module.exports = function() {
    var style = require('./style');
    return {
        "srs" : "+init=epsg:3857",
        "Stylesheet" : [ //
        {
            '@water' : '#E0FFFF',
            '@land' : '#FFFFFF',
            '@border' : 'gray',
            'Map' : {
                'buffer-size' : 256,
                'background-color' : '@water'
            },
        }, //
        style //
        ],
        "interactivity" : {
            "layer" : "countries",
            "fields" : []
        },
        "Layer" : [ {
            "srs" : "+init=epsg:4326",
            "name" : "countries"
        } ]
    };
};