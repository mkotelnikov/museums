var jquery = require('jquery');
var url = require('url');
var fs = require('fs');
var crypto = require('crypto');

var Loader = require('./Loader');

var pageUrl = 'https://fr.wikipedia.org/wiki/Musée_de_France';
var loader = new Loader({
    cacheDir : './.cache'
})
return Promise.resolve().then(function() {
    return loader.getPage(pageUrl);
}).then(function(window) {
    var results = [];
    var $ = jquery(window);
    var counter = 0;
    var promise = Promise.resolve();
    $('a').each(function() {
        var link = $(this);
        var text = link.text();
        var href = link.attr('href');
        if (text.match(/musée/gim) && href.indexOf('/wiki/') == 0) {
            var fullHref = url.resolve(pageUrl, href);
            console.log((++counter) + ')', text, href);
            (function(fullHref) {
                promise = promise.then(function() {
                    return handleMuseumPage(fullHref).then(function(obj) {
                        if (obj) {
                            results.push(obj)
                            console.log('* ', obj);
                        }
                    });
                })
            })(fullHref);
        }
    });
    return promise.then(function() {
        var str = JSON.stringify({
            type : 'FeatureCollection',
            features : results
        }, null, 2);
        fs.writeFileSync('./museums-wikipedia.geo.json', str, 'UTF8');
    });
}).then(null, function(err) {
    console.log('ERROR', err, err.stack);
});

function handleMuseumPage(pageUrl) {
    return Promise.resolve().then(function() {
        return loader.getPage(pageUrl).then(function(window) {
            var $ = jquery(window);
            var infobox = $('.infobox_v2');
            if (!infobox.html()) {
                return;
            }
            var promises = [];

            var properties = {
                name : null,
                url : null,
                wikipediaUrl : pageUrl,
            };
            var coordinates = infobox.find('.geo-dec').text() || '0, 0';
            coordinates = coordinates.split(', ').map(function(v) {
                return +v;
            }).reverse();
            var obj = {
                id : uuid5(pageUrl),
                type : 'Feature',
                properties : properties,
                geometry : {
                    type : 'Point',
                    coordinates : coordinates
                }
            }

            promises.push(extractProperties(pageUrl, $, properties));
            promises.push(extractImages(pageUrl, $, properties));

            return Promise.all(promises).then(function() {
                return obj;
            });
        });
    });
}
function uuid5(data) {
    var out = crypto.createHash('sha1').update(data).digest();

    out[8] = out[8] & 0x3f | 0xa0; // set variant
    out[6] = out[6] & 0x0f | 0x50; // set version

    var hex = out.toString('hex', 0, 16);

    return [ hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16),
            hex.substring(16, 20), hex.substring(20, 32) ].join('-');
}

function extractProperties(pageUrl, $, properties) {
    return Promise.resolve().then(function() {
        var infobox = $('.infobox_v2');

        var name = $('.firstHeading').text();
        properties.name = name;

        infobox.find('tr').each(function() {
            var tr = $(this);
            var th = tr.find('th');
            var td = tr.find('td');
            var prop = (th.text() || '').trim();
            var value = (td.text() || '').trim();
            if (prop && value) {
                if (prop == 'Coordonnées') {
                } else if (prop == 'Site web') {
                    properties.url = td.find('a').attr('href');
                    if (properties.url) {
                        properties.url = url.resolve(pageUrl, properties.url);
                    }
                } else {
                    properties[prop] = value;
                }
            }
        });
        replaceProperties(properties, {
            'Pays' : 'address.country',
            'Ville' : 'address.city',
            'Adresse' : 'address.addr',
            'Département' : 'address.department',
            'Région' : 'address.region',
            'Commune' : 'address.addr',
        });
        if (properties.address && properties.address.addr) {
            var value = properties.address.addr;
            value = value.replace('\n', ', ');
            value = value.replace(/(,\s*)/gim, ', ');
            properties.address.addr = value;
        }
    });
}

function extractImages(pageUrl, $, properties) {
    return Promise.resolve().then(function() {
        var infobox = $('.infobox_v2');
        var promise = Promise.resolve();
        var images = [];
        infobox.find('a.image').each(function() {
            var img = $(this).find('img');
            promise = promise.then(function() {
                return extractImage(img).then(function(href) {
                    if (href) {
                        images.push(href);
                    }
                })
            })
        });
        return promise.then(function() {
            properties.images = images;
        });
    });
    function extractImage(img) {
        return Promise.resolve().then(function() {
            var href = img.attr('src');
            if (href.match(/\.(png|svg)/gim))
                return;
            if (href.match(/_location_map\.jpg/gim) || href.match(/Map_'/gim))
                return;
            href = url.resolve(pageUrl, href);
            href = href.replace(/^(.*)\/\d+px-(.*)$/, '$1/512px-$2');
            return href;
            // var commonsHref = $(this).attr('href');
            // var promise = loadImageUrl(href, commonsHref).then(
            // function(url) {
            // images.push(url);
            // });
            // promises.push(promise);
            // href = url.resolve(pageUrl, href);
        });
    }

}

// -----------------------------------------------------------

function replaceProperties(obj, mapping) {
    Object.keys(mapping).forEach(function(from) {
        var to = mapping[from];
        var value = getValue(obj, from);
        if (value) {
            setValue(obj, to, value);
            delete obj[from];
        }
    })
}

function toPath(path) {
    if (!path)
        return [];
    if (typeof path === 'string')
        return path.split('.');
    return path;
}

function extend(to) {
    for (var i = 1; i < arguments.length; i++) {
        var from = arguments[i];
        for ( var key in from) {
            if (from.hasOwnProperty(key)) {
                to[key] = from[key];
            }
        }
    }
    return to;
}

function setValue(obj, path, value) {
    path = toPath(path);
    return doUpdate(obj, path, 0, value);
    function doUpdate(obj, path, pos, value) {
        if (pos >= path.length)
            return value;
        var name = path[pos];
        var oldValue = obj[name];
        var newValue = doUpdate(oldValue || {}, path, pos + 1, value);
        if (oldValue !== newValue) {
            if (value === undefined && pos === path.length - 1) {
                delete obj[name];
            } else {
                obj[name] = newValue;
            }
        }
        return obj;
    }
}

function getValue(obj, path) {
    path = toPath(path);
    return doGet(obj, path, 0);
    function doGet(obj, path, pos) {
        if (pos === path.length || typeof obj !== 'object')
            return obj;
        var name = path[pos];
        var value = obj[name];
        if (pos < path.length - 1) {
            return doGet(value, path, pos + 1);
        } else {
            return value;
        }
    }
}