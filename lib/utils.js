var utils = (function($, root, undefined) {
	var utils = {};

	// A new version of slice which will work with the arguments object
	utils.slice = function(arr, start, length) {
		return Array.prototype.slice.call(arr, start, length);
	};

	// Concatenate a variable number of arrays into a single array
	utils.concat = function() {
		var args = utils.slice(arguments);
		return args.reduce(function(result, arg) {
			return Array.prototype.concat.call(result, arg);
		}, []);
	};

	// Find the first object that matches the provided predicate
	utils.find = function(arr, predicate) {
		if (!arr || !arr.constructor || arr.constructor.name !== 'Array')
			throw new Error('Utils.find: `arr` is not an array: ' + console.debug(arr));
		if (!predicate || typeof predicate !== 'function')
			throw new Error('Utils.find: `predicate` is not a function: ' + console.debug(predicate));

		for (var i = 0; i < arr.length; i++) {
			if (predicate(arr[i])) return arr[i];
		}

		return null;
	};

	// Find the index of the first object that matches the provided predicate
	utils.locate = function(arr, predicate) {
		if (!arr || !arr.constructor || arr.constructor.name !== 'Array')
			throw new Error('Utils.find: `arr` is not an array: ' + console.debug(arr));
		if (!predicate || typeof predicate !== 'function')
			throw new Error('Utils.find: `predicate` is not a function: ' + console.debug(predicate));

		for (var i = 0; i < arr.length; i++) {
			if (predicate(arr[i])) return i;
		}

		return -1;
	};

	/*
	 * Generate a new function which when called will
	 * execute the original function with the partially
	 * applied arguments along with any arguments provided
	 * to the generated function.
	 * Explained generally:
	 * 		partial(f, arg1, arg2)(arg 3) == f(arg1, arg2, arg3);
	 * Example:
	 *      var add3 = partial(add, 3);
	 *		add3(5) => 8;
	 */
	utils.partial = function(func) {
		var args = utils.slice(arguments, 1);
		return function() {
			args = utils.concat(args, arguments);
			return func.apply(this, args);
		};
	};

	/* 
	 * Return a function which will apply it's arguments to the last
	 * function, the result of that to the second last, and so on
	 * Explained generally:
	 *		curry(f, g)(x) == f(g(x)); 
	 */
	utils.curry = function() {
		var funcs = utils.slice(arguments);
		return function() {
			var args = utils.slice(arguments);
			return funcs.reduceRight(function(arg, func) {
				return func(arg);
			}, args);
		}
	}

	return utils;
})(jQuery, window);