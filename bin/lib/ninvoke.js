module.exports = function ninvoke(context, method) {
	var args = [];
	for (var i = 2; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	return new Promise(function(resolve, reject) {
		try {
			if (typeof method === 'string') {
				method = context[method];
			}
			args.push(function(err, result) {
				if (err)
					return reject(err);
				else
					return resolve(result);
			});
			return method.apply(context, args);
		} catch (err) {
			return reject(err);
		}
	});
}