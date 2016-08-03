module.exports = function() {
    return {
        "Layer" : [ {
            "name" : "countries",
            "Datasource" : {
                "file" : "http://thematicmapping.org/downloads/TM_WORLD_BORDERS-0.3.zip",
                "type" : "shape"
            }
        } ]
    };
}