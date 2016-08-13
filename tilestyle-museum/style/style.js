var d3_ease = require('d3-ease');
var d3_interpolate = require('d3-interpolate');
var d3_scale = require('d3-scale');
var transform = require('mosaic-transform').transform;

function newStyleGenerator() {
    var zoomRange = [ 8, 14 ];
    var width = transform(zoomRange, [ 0.2, 32 ], d3_ease.easeQuadIn);
    var color = function(zoom, color) {
        return transform(zoomRange, [ 'gray', color ])(zoom);
    }
    var lineWidth = transform(zoomRange, [ 0.1, 3 ], d3_ease.easeQuadIn);
    var lineColor = transform(zoomRange, [ 'white', 'white' ]);
    var ownOutlineWidth = transform(zoomRange, [ 0, 3 ]);
    function getHaloColors(steps, range, values) {
        var interpolator = transform(range, values);
        var colors = [];
        for (var i = 0; i < steps; i++) {
            var color = interpolator(i);
            colors.push(color);
        }
        return colors;
    }
    var outlineWidth = function(zoom) {
        return lineWidth(zoom) + width(zoom) + ownOutlineWidth(zoom);
    }
    var dir = __dirname;

    function haloColors(zoom) {
        var haloColors = [ '#820081', '#A62B5C', '#B94646', '#D97118',
                '#F89A00', '#FFFFFF' ];
        // var haloColors = getHaloColors(5, [ 0, 4, 8 ], [ 'red', 'yellow',
        // 'white'
        // ]);
        var haloColors = [ 'maroon', 'red', 'red', 'orange', 'yellow', 'white' ];
        var haloColors = [ 'navy', 'navy', 'blue', 'blue', 'cyan', 'cyan',
                'yellow', 'yellow', 'white' ];
        var haloColors = [ 'navy', 'navy', 'blue', 'blue', 'blue', 'cyan',
                'cyan', 'white' ];
        var haloColors = [//
        '#045a8d', '#045a8d', '#045a8d', '#045a8d','#045a8d','#045a8d','#045a8d','#045a8d', //
        '#2b8cbe', '#2b8cbe', '#2b8cbe', '#2b8cbe','#2b8cbe','#2b8cbe','#2b8cbe', //
        '#74a9cf', '#74a9cf', '#74a9cf', '#74a9cf','#74a9cf','#74a9cf',// 
        '#a6bddb', '#a6bddb', '#a6bddb', '#a6bddb','#a6bddb',//
        '#d0d1e6', '#d0d1e6', '#d0d1e6', '#d0d1e6', //
        '#f1eef6', '#f1eef6', '#f1eef6', //
        'white' ];
        return haloColors;

        // Interpolated colors
        var count = 5;
        var haloColors = [];
        var interpolate = d3_interpolate.interpolateRgb('#810082', '#FFA500');
        var interpolate = d3_interpolate.interpolateCubehelix.gamma(2.2)(
                "purple", "yellow");
        var interpolate = d3_interpolate.interpolateHclLong('#810082',
                '#FFA500');
        // var interpolate = d3_scale.interpolateInferno;
        // console.log('>>>>>', interpolate);
        for (var i = 0; i <= count; i++) {
            var color = interpolate(i / count);
            haloColors.push(color);
        }
        return haloColors;
    }

    var haloWidth = transform([ 4, 12 ], [ 16, 64 ], d3_ease.easeQuadIn);
    var haloUrl = dir + '/marker-light.png';

    return function(zoom) {
        var result = {};
        var opacity = 1;
        var style = {
            '::halo' : {
                'image-filters' : 'colorize-alpha(' + //
                haloColors(zoom).join(',') + ')',
                // 'marker-comp-op' : 'multiply',
                'marker-file' : 'url("' + haloUrl + '")',
                'marker-allow-overlap' : true,
                'marker-opacity' : 1,
                'marker-width' : haloWidth(zoom)
            }
        };
        if (zoom >= 9) {
            style['::outline'] = {
                'marker-width' : outlineWidth(zoom),
                'marker-fill' : 'yellow',
                'marker-allow-overlap' : true,
                'marker-line-color' : 'transparent',
                'marker-line-opacity' : 0
            };
            style['::marker'] = {
                'marker-allow-overlap' : true,
                'marker-width' : width(zoom),
                'marker-fill' : color(zoom, 'gray'),

                'marker-line-width' : lineWidth(zoom),
                'marker-line-color' : lineColor(zoom),
                'marker-line-opacity' : 0.9,

                '[category="Archéologie"]' : {
                    'marker-fill' : color(zoom, '#1b9e77'),
                },
                '[category="Sciences"]' : {
                    'marker-fill' : color(zoom, '#d95f02'),
                },
                '[category="Peinture"]' : {
                    'marker-fill' : color(zoom, '#7570b3'),
                },
                '[category="Objets d\'art"]' : {
                    'marker-fill' : color(zoom, '#e7298a'),
                },
                '[category="Autre"]' : {
                    'marker-fill' : color(zoom, '#66a61e'),
                },
                '[category="Art contemporain"]' : {
                    'marker-fill' : color(zoom, '#e6ab02'),
                },
                '[category="Architecture"]' : {
                    'marker-fill' : color(zoom, 'navy'),
                },
            };
        }
        return style;
    }
}
module.exports = function(options) {
    var generator = newStyleGenerator();
    options = options || {};
    var styles = {};
    for (var z = 0; z <= 22; z++) {
        var style = generator(z);
        styles['[zoom=' + z + ']'] = style;
    }
    return styles;
}
