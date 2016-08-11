var fs = require('fs');
var json = require('./museums.geo.json');
var counter = 0;
json.features.forEach(function(f){
    if (!f.properties.name) {
        console.log('* ', JSON.stringify(f, null, 2));
        counter++;
    }
})
fs.writeFileSync('./museums.geo.json', JSON.stringify(json, null, 2), 'UTF8');
console.log('>>', counter);