var stream = require('stream');
var StringDecoder = require('string_decoder').StringDecoder;
var Transform = stream.Transform;
var util = require('util');

var JsonReadStream = function(options) {
	Transform.call(this, {
		readableObjectMode : true
	});
	this._buffer = '';
	this._decoder = new StringDecoder('utf8');
};
util.inherits(JsonReadStream, Transform);
JsonReadStream.prototype._transform = function(chunk, encoding, cb) {
	try {
		this._buffer += this._decoder.write(chunk);
		// split on newlines
		var lines = this._buffer.split(/\r?\n/);
		// keep the last partial line buffered
		this._buffer = lines.pop();
		for (var l = 0; l < lines.length; l++) {
			var line = lines[l];
			this._parseObject(line);
		}
		cb();
	} catch (err) {
		cb(err);
	}
}

JsonReadStream.prototype._flush = function(cb) {
	try {
		// Just handle any leftover
		var rem = this._buffer.trim();
		this._parseObject(rem);
		cb();
	} catch (err) {
		cb(err);
	}
}

var counter = 0;
JsonReadStream.prototype._parseObject = function(line) {
	if (line) {
		var obj = JSON.parse(line);
		this.push(obj);
	}
}

module.exports = JsonReadStream;