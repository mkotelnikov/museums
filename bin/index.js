var jquery = require('jquery');
var url = require('url');
var fs = require('fs');
var crypto = require('crypto');
var reactive = require('mosaic-reactive');
var Loader = require('./lib/Loader');

var loader = new Loader({
    cacheDir : './.cache'
})

var pages = [
        {
            urls : [ 'https://fr.wikipedia.org/wiki/Musée_de_France',
                    'https://fr.wikipedia.org/wiki/Liste_de_mus%C3%A9es_en_France' ],
            handler : loadMuseums
        },
        {
            urls : [ 'https://fr.wikipedia.org/wiki/Cat%C3%A9gorie:Liste_des_monuments_historiques_fran%C3%A7ais_par_d%C3%A9partement' ],
            urls : [],
            handler : loadHistoricalMonuments
        } ];
var outputFile = './data/museums-wikipedia.geo.json';
var outputFile = './data/monuments-museums-wikipedia.geo.json.stream';

return Promise.resolve().then(function() {
    var index = {};
    var pageIndex = {};
    var output = fs.createWriteStream(outputFile);

    var promises = [];
    pages.forEach(function(pageInfo) {
        if (!pageInfo.urls)
            return;
        pageInfo.urls.forEach(function(pageUrl) {
            promises.push(pageInfo.handler(pageUrl, {
                shouldVisit : function(pageUrl) {
                    return !(pageUrl in pageIndex);
                },
                pageVisited : function(pageUrl) {
                    pageIndex[pageUrl] = true;
                },
                onItem : function(obj) {
                    if (obj && !(obj.id in index)) {
                        index[obj.id] = true;
                        // output.write(JSON.stringify(obj, null, 2));
                        output.write(JSON.stringify(obj));
                        output.write('\n');

                        console.log('* ', obj.id, //
                        obj.properties.wikipediaUrl, obj.properties.name);
                    }
                },
            }));
        });
    })
    return Promise.all(promises).then(function() {
        output.end();
    });
}).then(null, function(err) {
    console.log('ERROR', err, err.stack);
});

// ------------------------------------------------------------

function loadHistoricalMonuments(pageUrl, listener) {
    function getText(cells, property) {
        var cell = cells[property];
        if (!cell)
            return '';
        var text = cell.text() || '';
        return text.trim();
    }
    function getArray(cells, property) {
        var text = getText(cells, property);
        return text.split('\n');
    }
    function visitHistoricalMonumentsPage() {
        return Promise.resolve().then(function() {
            var promise = Promise.resolve();
            return forAllReferences(pageUrl, function(link) {
                var text = link.text();
                var href = link.attr('href') || '';
                var pattern = '/wiki/Liste_des_monuments_historiques';
                if (href.indexOf(pattern) == 0) {
                    var fullHref = url.resolve(pageUrl, href);
                    promise = promise.then(function() {
                        if (listener.shouldVisit(fullHref)) {
                            return loadHistoricalMonuments(fullHref, listener);
                        }
                    });
                }
            }).then(function() {
                return promise;
            })
        })
    }
    function visiMonumentTable($, table) {
        if (table.find('th').first().text() !== 'Monument') {
            return;
        }
        var list = getTableCells($, table);
        list.forEach(function(cells, pos) {
            var merimee = getText(cells, 'Notice');
            merimee = merimee.replace(/« (.*) »/, '$1');
            var properties = {
                type : 'monument',
                merimeeId : merimee,
                name : getText(cells, 'Monument'),
                wikipediaUrl : null,
                wikipediaSourceUrl : pageUrl,
                address : {
                    country : 'France',
                    city : getText(cells, 'Commune'),
                },
                protections : []
            }

            // ---------------------------------
            var wikipediaUrl = cells['Monument']
            //
            .find('a').attr('href') || '';
            if (wikipediaUrl.indexOf('/wiki/') === 0) {
                wikipediaUrl = url.resolve(pageUrl, wikipediaUrl);
                properties.wikipediaUrl = wikipediaUrl;
            }

            // ---------------------------------
            var addr = getText(cells, 'Adresse');
            if (addr) {
                properties.address.addr = addr;
            }

            // ---------------------------------
            var coords = cells['Coordonnées'];
            var coordinates = getGeoCoordinates(coords);
            var obj = {
                id : uuid5(merimee),
                properties : properties,
                geometry : {
                    type : 'Point',
                    coordinates : coordinates
                },
                type : 'Feature',
            }
            // ---------------------------------
            var dates = getArray(cells, 'Date');
            var protection = getArray(cells, 'Protection');
            dates.forEach(function(date, i) {
                var p = protection[i];
                properties.protections.push({
                    type : p,
                    date : date
                });
            });

            // ---------------------------------
            if (getText(cells, 'Illustration') !== 'Image manquante') {
                var imgCell = cells['Illustration'];
                var imgUrl = extractImage(pageUrl, imgCell);
                properties.images = [ imgUrl ];
            }

            // console.log('
            // * ',
            // JSON.stringify(obj,
            // null,
            // 2));
            listener.onItem(obj);
        });
        // 'Illustration',
    }
    return Promise.resolve().then(function() {
        return Promise.resolve().then(function() {
            return loader.getPage(pageUrl);
        }).then(function(window) {
            listener.pageVisited(pageUrl);
            var results = [];
            if (!window)
                return;
            var $ = jquery(window);
            $('table').each(function() {
                var table = $(this);
                visiMonumentTable($, table);
            })
        }).then(function() {
            return visitHistoricalMonumentsPage();
        });
    })
}

function getTableCells($, table) {
    var counter = 0;
    var properties = [];
    var objects = [];
    table.find('tr').each(function() {
        var tr = $(this);
        if (counter === 0) {
            tr.find('th').each(function() {
                var cell = $(this);
                properties.push(cell.text().trim());
            })
        } else {
            var obj = {};
            var pos = 0;
            tr.find('td').each(function() {
                var cell = $(this);
                var property = properties[pos++];
                obj[property] = cell;
            });
            objects.push(obj);
        }
        counter++;
    });
    return objects;
}

// ------------------------------------------------------------

function loadMuseums(pageUrl, listener) {
    return Promise.resolve().then(function() {
        var promise = Promise.resolve();
        return forAllReferences(pageUrl, function(link) {
            var text = link.text();
            var href = link.attr('href');
            if (text.match(/(musée|château)/gim) //
                    && href.indexOf('/wiki/') == 0) {
                var fullHref = url.resolve(pageUrl, href);
                promise = promise.then(function() {
                    return handleMuseumPage(fullHref).then(function(obj) {
                        listener.onItem(obj);
                    });
                });
            }
        }).then(function() {
            return promise;
        })
    })
}

function handleMuseumPage(pageUrl) {
    return Promise.resolve().then(function() {
        return loader.getPage(pageUrl).then(function(window) {
            var $ = jquery(window);
            var promises = [];
            var obj = newObject(pageUrl, $);
            if (obj) {
                var infobox = $('.infobox_v2');
                var array = getGeoCoordinates(infobox);
                obj.geometry.coordinates[0] = array[0];
                obj.geometry.coordinates[1] = array[1];
                promises.push(extractProperties(pageUrl, $, obj.properties));
                promises.push(extractImages(pageUrl, $, obj.properties));
                obj.properties.type = 'museum';
            }
            return Promise.all(promises).then(function() {
                return obj;
            });
        });
    });
}

// ------------------------------------------------------------

function forAllReferences(pageUrl, callback) {
    return Promise.resolve().then(function() {
        return loader.getPage(pageUrl);
    }).then(function(window) {
        var results = [];
        var $ = jquery(window);
        var counter = 0;
        var promise = Promise.resolve();
        $('a').each(function() {
            var link = $(this);
            callback(link);
        })
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

function newObject(pageUrl, $) {
    var infobox = $('.infobox_v2');
    if (!infobox.html()) {
        return;
    }

    var properties = {
        type : null,
        name : null,
        url : null,
        wikipediaUrl : pageUrl,
    };
    var coordinates = [ 0, 0 ];
    var obj = {
        id : uuid5(pageUrl),
        properties : properties,
        geometry : {
            type : 'Point',
            coordinates : coordinates
        },
        type : 'Feature',
    }
    return obj;
}

function getGeoCoordinates(elm) {
    if (!elm)
        return [ 0, 0 ];
    var array = elm.find('.geo-dec').text() || '0, 0';
    array = array.split(', ').map(function(v) {
        return +v;
    }).filter(function(v) {
        return !isNaN(v);
    }).reverse();
    return array;
}

function extractProperties(pageUrl, $, properties) {
    return Promise.resolve().then(function() {
        var infobox = $('.infobox_v2');

        var mainTitle = $('.firstHeading');
        var name = mainTitle.text();
        properties.name = name;

        var content = $('#mw-content-text');
        var toc = $('#toc');
        var description = [];
        if (toc[0]) {
            var n = content.find(':first');
            while (n[0] && n[0] != toc[0]) {
                var tagName = n[0].tagName;
                if (tagName === 'H1' || tagName === 'H2' //
                        || tagName === 'H3' || tagName === 'H4')
                    break;
                if (n.attr('class') === 'toc_niveau_2') {
                    break;
                }
                if (tagName == 'P') {
                    var str = (n.text() || '').trim();
                    str = str.replace(/\[\d+\]/gim, '');
                    if (str) {
                        description.push(str);
                    }
                }
                n = n.next();
            }
        }
        properties.description = description;

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
            var img = $(this);
            promise = promise.then(function() {
                var href = extractImage(pageUrl, img);
                if (href) {
                    images.push(href);
                }
            })
        });
        return promise.then(function() {
            properties.images = images;
        });
    });
}

// -----------------------------------------------------------

function extractImage(pageUrl, elm) {
    if (!elm)
        return;
    var img = elm.find('img');
    var href = img.attr('src');
    if (!href)
        return;
    if (href.match(/\.(png|svg)/gim))
        return;
    if (href.match(/_location_map\.jpg/gim) || href.match(/Map_/gim))
        return;
    href = url.resolve(pageUrl, href);
    var width = +img.attr('data-file-width');
    var height = +img.attr('data-file-height');
    var thumbnailWidth = 512;
    if (!isNaN(width)) {
        if (thumbnailWidth > width) {
            var pow = Math.floor(Math.log(width) / Math.log(2));
            thumbnailWidth = Math.pow(2, pow);
        }
    }
    var thumbnailUrl = href.replace(/^(.*)\/\d+px-(.*)$/, '$1/'
            + thumbnailWidth + 'px-$2');
    href = href.replace(/^(.*)\/thumb\/(.*)\/[^\/]+$/, '$1/$2');

    // https://upload.wikimedia.org/wikipedia/commons/d/d4/Abbaye_Saint_Colomban.jpg
    // https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Abbaye_Saint_Colomban.jpg/59px-Abbaye_Saint_Colomban.jpg

    return {
        url : href,
        width : width,
        height : height,
        thumbnail : thumbnailUrl
    }
    // var commonsHref = $(this).attr('href');
    // var promise = loadImageUrl(href, commonsHref).then(
    // function(url) {
    // images.push(url);
    // });
    // promises.push(promise);
    // href = url.resolve(pageUrl, href);
}

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

// -----------------------------------------------------------

function newStream() {
    var ext = extend({}, reactive.stream, {
        toJsonArray : toJsonArray,
        _newClone : function() {
            return new reactive.Stream(Promise, ext);
        }
    });
    return new reactive.Stream(Promise, ext);

    function toJsonArray(format, stream) {
        stream = stream || this;
        var result = stream.clone();
        var initialized = false;
        var counter = 0;
        stream.each(function(obj) {
            init();
            if (counter > 0) {
                result.write(',');
            }
            counter++;
            if (format) {
                result.write('\n');
                result.write(JSON.stringify(obj, null, 2));
            } else {
                result.write(JSON.stringify(obj));
            }
        });
        stream.done(function() {
            init();
            if (format) {
                result.write('\n');
            }
            result.write(']');
        });
        return result;
        function init() {
            if (!initialized) {
                initialized = true;
                result.write('[');
            }
        }
    }
}
