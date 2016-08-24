var fs = require('fs');
var d3_dsv = require('d3-dsv');
var str = fs.readFileSync('./data/ListedesmuseesdeFrance.csv', 'UTF8');

var result = d3_dsv.csvParse(str);
console.log(JSON.stringify(result, null, 2));

return;


parse(str, {
    begin : function() {
        console.log('<all>');
    },
    end : function() {
        console.log('</all>');
    },
    beginRow : function() {
        console.log('  <row>');
    },
    endRow : function() {
        console.log('  </row> ');
    },
    beginCell : function() {
        console.log('    <cell>');
    },
    endCell : function() {
        console.log('    </cell> ');
    },
    onCellValue : function(str) {
        console.log('       ', str);
    }
})

function parse(str, listener) {
    var pos = 0;
    var ROW_DELIMITER = '\n';
    var CELL_DELIMITER = ',';
    listener.begin();
    while (pos < str.length) {
        parseRow();
    }
    listener.end();
    function parseRow() {
        listener.beginRow();
        try {
            while (pos < str.length) {
                parseCell();
                if (str[pos] === ROW_DELIMITER) {
                    pos++;
                    return;
                }
            }
        } finally {
            listener.endRow();
        }
    }
    function parseCell() {
        listener.beginCell();
        try {
            while (pos < str.length) {
                parseCellValue();
                if (str[pos] === CELL_DELIMITER) {
                    pos++;
                    return;
                }
            }
        } finally {
            listener.endCell();
        }
    }
    function parseCellValue() {
        var str;
        try {
            var quot, escaped = false;
            if (str[pos] === '"' || str[pos] === "'") {
                quot = str[pos];
                str = quot;
            }
            for (; pos < str.length; pos++) {
                var ch = str[pos];
                if (escaped) {
                    // Escaped symbol
                    str += ch;
                    escaped = false;
                } else if (ch === '\\') {
                    // Escape symbol
                    escaped = true;
                } else if (quot) {
                    // Quoted string
                    if (ch === quot) {
                        str += ch;
                        pos++;
                        break;
                    } else {
                        str += ch;
                    }
                } else if (ch === CELL_DELIMITER || ch === ROW_DELIMITER) {
                    // End of the line or end of the cell
                    break;
                } else {
                    str += ch;
                }
                parseCellValue();
            }
        } finally {
            listener.onCellValue(str);
        }
    }

}