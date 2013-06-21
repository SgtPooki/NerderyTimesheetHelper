/**
 * @author Paul Schoenfelder
 */
(function (root, builder, undefined) {
    if (typeof exports === 'object') {
        // CommonJS Native
        exports = builder(root, exports, false, builder);
    }
    if (typeof define === 'function') {
        // CommonJS AMD
        define('toolbox', null, function() {
            return builder(root, null, false, builder);
        });
    }
    else {
        // Vanilla environments (browser)
        root.toolbox = builder(root, null, false, builder);
    }
})(this, function (root, exports, config, builder, undefined) {

    exports = exports || {};

    /** 
     *  The root Toolbox.js namespace
     *  @namespace toolbox 
     */

    /**
     * Print the current Toolbox.js version
     * @memberof toolbox
     * @name version
     * @type string
     */
    exports.version = '2.1.4';

    var defaultConfig = {
        extendPrototypes:    false,
        createGlobalAliases: false
    };
    var enabledConfig = {
        extendPrototypes:    true,
        createGlobalAliases: true
    };
    // Choose which config to use based on the value given to the builder function
    switch (getType(config)) {
        case 'null':
        case 'undefined':
        case 'boolean':
            config = config ? enabledConfig : defaultConfig;
            break;
        case 'object':
            // Rewrite config to contain only whitelisted properties,
            // with defaults pulled from defaultConfig
            var custom = {};
            for (var key in defaultConfig) {
                if (config[key] !== null && config[key] !== undefined)
                    custom[key] = config[key];
                else
                    custom[key] = defaultConfig[key];
            }
            config = custom;
            break;
        default:
            config = defaultConfig;
            break;
    }

    /**
     *  Re-configure the toolbox.
     *
     *  A null or undefined configuration object assumes the most restrictive defaults. This is to prevent someone who simply
     *  forgot to call configure with proper settings from throwing a wrench in their application. Configuration is completely
     *  optional, but recommended to get the most out of the library.
     * 
     *  `config === true || config === false`
     *
     *     This is an all or nothing configuration setting. It's mostly for those who want everything, but don't want to clutter up
     *     code by setting all the config values explicitly.
     *     
     *  `config === object`
     *
     *     When passed an object for configuration, all unspecified options are defaulted to false. To enable or change the default for an
     *     option, you need to explicitly set it.
     *     
     *  **Configurable Options**
     *     
     *  extendPrototypes: 
     *      Enables extension of system prototypes with new features. This option only applies to features which do not alter the behavior of those classes.
     *
     *  createGlobalAliases:
     *      Creates aliases to exported functions. i.e., `$toolbox.forEach` would also have a global `forEach` alias.
     *
     *  @param {object} config - Either true/false or an object that defines the configuration values desired
     *  @memberof toolbox
     *  @type Toolbox
     */
    function configure(config) {
        return builder.call(null, root, exports, config, builder);
    }
    exports.configure = configure;

    /**
     *  Retreive the current configuration object. Read-only.
     *  @memberof toolbox
     *  @type object
     */
    function getConfig() {
        return config;
    }
    exports.config = getConfig;

    /**
     *  Useful string values/functions
     *  @namespace toolbox.string
     */
    exports.string = {};

    /**
     *  An empty string
     *  @constant
     *  @memberof toolbox.string
     *  @name empty
     */
    exports.string.empty = '';

    /**
     *  A newline string: `\r\n`
     *  @constant
     *  @memberof toolbox.string
     *  @name newline
     */
    exports.string.newline = '\r\n';

    /**
     *  Trims a string of leading and trailing whitespace
     *  @param {string} s - The string to trim
     *  @memberof toolbox.string
     *  @type string
     */
    function trim(s) {
        return String.prototype.trim.call(s);
    }
    exports.string.trim = trim;

    /**
     *  Determine if the provided string is empty
     *  @param {string} s - The string to test
     *  @memberof toolbox.string
     *  @type string
     */
    function isEmpty(s) {
        var emptyPattern = /[\S]+/g;
        return !exists(s) || !emptyPattern.test(s);
    }
    exports.string.isEmpty = isEmpty;

    if (config.extendPrototypes) {
        String.prototype.isEmpty = function() {
            return isEmpty.call(null, this);
        };
    }

    /**
     * Repeats the provided string n-times. Returns a new string.
     * @param {string} s - The string to repeat
     * @param {nubmer} n - The number of times to repeat the string
     * @memberof toolbox.string
     * @type string
     */
    function repeatString(s, n) {
        n = n || 1;

        if (!isType(s, 'string'))
            throw new Exception('repeat: str must be a string.');
        if (!isType(n, 'number'))
            throw new Exception('repeat: n must be a number.');

        var result = s;
        for (var i = 1; i < n; i++) {
            result = result + s;
        }

        return result;
    }
    exports.string.repeat = repeatString;

    if (config.extendPrototypes) {
        String.prototype.repeat = function(n) {
            return repeatString.call(null, this, n);
        };
    }

    /**
     *  With no args, returns an empty string. With one arg x, returns
     *  x.toString(). str(null) returns an empty string. With more than
     *  one arg, returns the concatenation of the str values of the args.
     * 
     *  @param {string} seperator - The seperator string to use. Defaults to string.empty
     *  @param {*} args* - A variable number of arguments to transform
     *  @memberof toolbox.string
     */
    function str(seperator) {
        var args = slice(arguments);
        // If no seperator was provided, the first argument should be part of the result
        if (!isType(seperator, 'string')) {
            seperator = '';
        } else {
            args = slice(args, 1);
        }

        if (args.length) {
            return reduce(args, function (memo, arg) {
                var append = '';
                // Reduce an array to a string
                if (isType(arg, 'array'))
                    append = reduce(arg, function(m, a) {
                        if (isEmpty(m)) return a.toString();
                        else return m + seperator + a.toString();
                    }, '');
                else if (exists(arg.toString))
                    append = arg.toString();
                else
                    append = Object.prototype.toString.call(arg);

                if (isEmpty(memo))
                    return append;
                else if (exists(seperator))
                    return memo + seperator + append;
                else return memo + append;
            }, '');
        } else return '';
    }
    exports.string.str = str;

    /**
     *  Returns a new string or RegExp (depending on which one was passed in as target).
     *  EXAMPLES:
     *
     *      string.format('yellow #{0}', 'moon')    #=> 'yellow moon'
     *      string.format(/^[#{0}]$/g, '\\w')       #=> /^[\w]$/g
     *      string.format('My #{0} is #{name}', 'name', {
     *          name: 'Paul'
     *      })                                             #=> 'My name is Paul'
     *
     *  **NOTES:**
     *
     *  1. The arguments object is used here to allow for an unlimited number of parameters.
     *  2. You can mix and match interpolation types (named, indexed), but in order to
     *     use named variables, you must pass in an object with those names as properties.
     *     Objects are ignored for indexing (they will only be used for replacing named variables)
     *     so the order of the parameters is important, with Objects being the only exception.
     *
     *  @param {string} - The format string
     *  @param {*} args* - A variable number of arguments to apply to the format string.
     *  @memberof toolbox.string
     */
    function format(s) {
        function interpolate(s, args) {
            if (isType(s, 'regexp') || isType(s, 'string')) {

                // The pattern to match for interpolation variables
                var interpolated, interpolationPattern = /#\{[\d]+\}|#\{[\w-_]+\}/g;
                // An array of strings that were split by matching on the interpolation pattern
                var matches = [];
                // Regular expression parts to be reassembled later
                var flags, regex;

                if (isType(s, 'regexp')) {
                    // Get the array of matches for flags, and use
                    // shift to remove the pattern match element
                    flags = /.+\/([gim]+)?$/.exec(s.toString());
                    flags.shift();
                    // Get the raw pattern without the js jive
                    regex = /^\/(.+)\/[gim]+?$/.exec(s.toString());
                    regex.shift();

                    // We're assuming that to reach this point, this is a valid regexp,
                    // so regex will always contain one element, which is the raw pattern
                    interpolated = regex[0];
                }
                else {
                    interpolated = s;
                }

                if (args.length) {
                    // For every argument passed in, find the interpolation variable with
                    // the same index value (minus one to account for the string var istelf).
                    // So: interpolate("Hello, #{0}. #{1}", 'Paul', "It's nice to meet you.") will
                    // render "Hello, Paul. It's nice to meet you."
                    matches = interpolationPattern.test(interpolated) ? interpolated.match(interpolationPattern).length : 0;

                    if (matches === args.length) {
                        // There was an argument supplied for all interpolations
                        interpolated = doReplace(interpolated, args);
                    }
                    else if (matches < args.length) {
                        // There were more arguments supplied than interpolations
                        interpolated = doReplace(interpolated, args);
                    }
                    else if (matches > args.length) {
                        // There were fewer arguments supplied than interpolations
                        var memo = args[args.length - 1];
                        // Replace the provided arguments
                        interpolated = doReplace(interpolated, args);
                        // Replace remaining interpolations with the last provided argument value
                        interpolated = doReplaceAll(interpolated, memo);
                    }
                }

                return interpolated;
            }
            else {
                throw new Error('Invalid type passed as interpolation target. Must be string or RegExp.');
            }

        }

        // Iterate through the arguments, peforming either an indexed or named interpolation depending on param type
        function doReplace(target, replacements) {
            var result = target;
            forEach(replacements, function (arg, index) {
                if (isType(arg, 'object')) {
                    for (var key in arg) {
                        var pattern = new RegExp('#\\{' + key + '\\}', 'g');
                        result = result.replace(pattern, arg[key]);
                    }
                }
                else {
                    var pattern = new RegExp('#\\{' + index + '\\}', 'g');
                    result = result.replace(pattern, arg.toString());
                }
            });
            return result;
        }

        // Replace all instances of #{[\d]+}
        function doReplaceAll(target, replace) {
            var result = target.replace(interpolationPattern, replace.toString());
            return result;
        }

        return interpolate(s, slice(arguments, 1));
    }
    exports.string.format = format;


    /**
     *  Object related functions
     *  @namespace toolbox.object
     */
    exports.object = {};

    /** 
     *  Get the type string for the provided object. Calls to this function are memoized.
     *
     *  @param {object} obj - The object whose type we want to inspect
     *  @memberof toolbox.object
     */
    function getType(obj) {
        if (typeof obj === 'undefined')
            return 'undefined';
        else if (obj === null)
            return 'null';
        else if (obj.constructor && obj.constructor.name)
            return obj.constructor.name.toLowerCase();
        else
            return Object.prototype.toString.call(obj).toLowerCase();
    }

    if (config.extendPrototypes) {
        Object.prototype.getType = function() {
            return getType.call(null, this);
        };
    }
    exports.object.getType = getType;

    /**
     *  Determine if the first object is of the same type as the second object.
     *  Alternatively, you can pass in a string representing the name of the type
     *  you are comparing for. A few examples
     *
     *      isType({}, Object.prototype) ==> true
     *      isType(obj, undefined)       ==> true
     *      isType(5, 'number')          ==> true
     *
     *  **IMPORTANT**: Referencing constructors instead of the prototype for the object
     *  you are comparing against will fail! Remember, constructors are of type Function.
     *  
     *  Example: `Object == [object Function]` and `Object.prototype == [object Object]`
     *
     *  @param {object} obj - The object to test
     *  @param {string} args* - A variable number of type names to test for
     *  @memberof toolbox.object
     */
    function isType(obj) {
        var args = slice(arguments, 1);
        if (!args.length)
            throw new Exception('isType requires at least two arguments.');

        for (var i = 0; i < args.length; i++) {
            var y = typeof args[i] === 'string' ? args[i] : getType(args[i]);

            if (obj === undefined && (y === 'undefined' || y === undefined))
                return true;
            else if (obj === null && (y === 'null' || y === null))
                return true;
            else {
                if (getType(obj) === y)
                    return true;
            }
        }

        return false;
    }
    exports.object.isType = isType;

    if (config.extendPrototypes) {
        Object.prototype.isType = function() {
            var args = concat(this, slice(arguments));
            return isType.apply(null, args);
        };
    }

    /**
     *  Determine if an object is null or undefined
     *
     *  @param {object} obj - The object to test
     *  @memberof toolbox.object
     */
    function exists(obj) {
        return !isType(obj, 'null', 'undefined');
    }
    exports.object.exists = exists;

    /**
     *  Determine if an object has it's own property with the provided name
     *
     *  @param {object} obj - The object to check
     *  @param {string} name - The property name to look up
     *  @memberof toolbox.object
     */
    function has(obj, name) {
        if (!exists(obj))
            throw new Exception('has: Object does not exist.', arguments);

        // If no property name is provided, return all property names which this object owns
        if (!exists(name)) {
            return reduce(Object.keys(obj), function(result, key) {
                if (Object.prototype.hasOwnProperty.call(obj, key))
                    result.push(key);
                return result;
            }, []);
        }
        // Otherwise, return true or false depending on whether the object has that property
        else {
            if (Object.prototype.hasOwnProperty.call(obj, name))
                return true;
            else
                return false;
        }
    }
    exports.object.has = has;

    if (config.extendPrototypes) {
        Object.prototype.has = Object.prototype.hasOwnProperty || function(key) {
            return has.call(null, this, key);
        };
    }

    /**
     *  Safely extend the toolbox, or another object
     *
     *  @param {object} target - The object to mix into
     *  @param {object} source - The object we're mixing
     *  @param {Array} blacklist - A list of function names that cannot be mixed over
     *  @memberof toolbox.object
     */
    function mixin(target, source, blacklist) {
        // Make sure that if we're mixing into the toolbox, certain properties cannot be overwritten
        if (this === target)
            blacklist = union(['configure', 'config'], blacklist);

        var isBlacklisted = partial(contains, blacklist || []);
        // Ignore all functions/properties that are blacklisted by name
        var functionNames = pick(functions(source), 'name');
        var propertyNames = pick(properties(source), 'name');
        var valid = reject(concat(functionNames, propertyNames), isBlacklisted);

        forEach(valid, function(name) { target[name] = source[name]; });

        return target;
    }
    exports.object.mixin = mixin;

    if (config.extendPrototypes) {
        Object.prototype.mixin = function(source, blacklist) {
            return mixin.call(null, this, source, blacklist);
        };
    }

    /**
     *  Extend an object with properties from one or more other objects.
     *  Last definition wins, so the last object to define a property will
     *  have it's value set for that property on the resulting object.
     *
     *  @param {object} target - The object to extend
     *  @param {object} args* - A variable number of objects to extend the target with
     *  @memberof toolbox.object
     */
    function extend(target) {
        if (this === target)
            throw new Exception('extend: Cannot extend toolbox. Use mixin instead.', this);

        var extensions = slice(arguments, 1);
        if (extensions.length)
        {
            forEach(extensions, function(extension) {
                var functions  = pick(functions(extension), 'name');
                var properties = pick(properties(extension), 'name');
                forEach(concat(functions, properties), function(prop) {
                    target[prop] = extension[prop];
                });
            });
        }

        return target;
    }
    exports.object.extend = extend;

    if (config.extendPrototypes) {
        Object.prototype.extend = function() {
            var args = concat(this, slice(arguments));
            return extend.apply(null, args);
        };
    }

    /**
     *  Determines if an object property is callable as a function
     *
     *  @param {object} obj - The object to test
     *  @memberof toolbox.object
     */
    function isFunction(obj) {
        return isType(obj, 'function');
    }
    exports.object.isFunction = isFunction;

    /**
     *  Return all of an object's own functions/methods with the following schema
     *
     *      descriptor = {
     *          name: The name of the function
     *          fn: The function object itself, prebound with the object's context
     *          arguments: The number of arguments the function takes
     *      }
     *
     *  @param {object} obj - The object to look for functions on
     *  @memberof toolbox.object
     */
    function functions(obj) {
        var funcs = [];

        for (var key in obj) {
            if (has(obj, key) && isFunction(obj[key])) {
                var createExecutor = function(k) { return bind(obj[k], obj); };
                var func = {
                      name: key
                    , fn: createExecutor(key)
                    , arguments: obj[key].length
                };
                funcs.push(func);
            }
        }

        return funcs;
    }
    exports.object.functions = functions;

    if (config.extendPrototypes) {
        Object.prototype.functions = function() {
            return functions.call(null, this);
        };
    }

    /**
     *  Return all of an object's own properties that are not functions with the following schema
     *
     *      descriptor = {
     *          name: The property name
     *          get: A function to get the property's value (prebound to the object's context)
     *          set: A function to set the property's value (prebound to the object's context)
     *      }
     *
     *  @param {object} obj - The object to look for properties on
     *  @memberof toolbox.object
     */
    function properties(obj) {
        var props = [];

        for (var key in obj) {
            if (has(obj, key) && !isFunction(obj[key])) {
                var createGet = function(k) { return bind(function() { return this[k]; }, obj); };
                var createSet = function(k) { return bind(function(value) { this[k] = value; }, obj); };
                var prop = {
                      name: key
                    , get: createGet(key)
                    , set: createSet(key)
                };
                props.push(prop);
            }
        }

        return props;
    }
    exports.object.properties = properties;

    if (config.extendPrototypes) {
        Object.prototype.properties = function() {
            return properties.call(null, this);
        };
    }

    /**
     *  Pick the value associated with the specified property for
     *  forEach object in an array of objects.
     *
     *  @param {object[]} objs - The array of objects to iterate over
     *  @param {string} prop - The property name to select
     *  @memberof toolbox.object
     */
    function pick(objs, prop) {
        return reduce(objs, function(result, obj) {
            if (obj[prop])
                result.push(obj[prop]);
            return result;
        }, []);
    }
    exports.object.pick = pick;

    if (config.extendPrototypes) {
        Object.prototype.pick = function(property) {
            return pick.call(null, this, property);
        };
    }

    /**
     *  Perform a deep comparison to check if two objects are equal.
     *
     *  The guts of this function are basically ripped straight from Underscore.js
     *  with small modifications. Internal recursive comparison function for `areEqual`
     *
     *  @param {object} a - The first object to compare
     *  @param {object} b - The second object to compare
     *  @memberof toolbox.object
     */
    function areEqual(a, b) {
        return eq(a, b, [], []);
    }
    exports.object.areEqual = areEqual;
    function eq(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
        if (a === b) return a !== 0 || 1 / a == 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a === null || b === null) return a === b;
        // Compare types
        if (!isType(a, b)) return false;
        switch (getType(a)) {
            // Strings, numbers, dates, and booleans are compared by value.
            case 'string':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return a == String(b);
            case 'number':
                // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
                // other numeric values.
                return a !== +a ? b !== +b : (a === 0 ? 1 / a === 1 / b : a === +b);
            case 'date':
            case 'boolean':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a == +b;
            // RegExps are compared by their source patterns and flags.
            case 'regexp':
                return  a.source == b.source &&
                        a.global == b.global &&
                        a.multiline == b.multiline &&
                        a.ignoreCase == b.ignoreCase;
        }
        if (typeof a != 'object' || typeof b != 'object') return false;
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] == a) return bStack[length] == b;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        var size = 0, result = true;
        // Recursively compare objects and arrays.
        if (isType(a, 'array')) {
            // Compare array lengths to determine if a deep comparison is necessary.
            size = a.length;
            result = size == b.length;
            if (result) {
                // Deep compare the contents, ignoring non-numeric properties.
                while (size--) {
                    if (!(result = eq(a[size], b[size], aStack, bStack))) break;
                }
            }
        } else {
            // Objects with different constructors are not equivalent, but `Object`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && (aCtor instanceof aCtor) &&
                                     isFunction(bCtor) && (bCtor instanceof bCtor))) {
                return false;
            }
            // Deep compare objects.
            for (var key in a) {
                if (has(a, key)) {
                    // Count the expected number of properties.
                    size++;
                    // Deep compare forEach member.
                    if (!(result = has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
                }
            }
            // Ensure that both objects contain the same number of properties.
            if (result) {
                for (key in b) {
                    if (has(b, key) && !(size--)) break;
                }
                result = !size;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return result;
    }

    if (config.extendPrototypes) {
        Object.prototype.areEqual = function(obj) {
            return areEqual.call(null, this, obj);
        };
    }



    /**
     *  Functions for manipulating, iterating, and searching arrays
     *  @namespace toolbox.array
     */
    exports.array = {};

    /**
     *  Call a function for forEach element in an enumerable object. Use native forEach if available or fallback on ECMA262 5th Edition implementation
     *
     *  @param {array} collection - The array to iterate over
     *  @param {function} iterator - The function to call on forEach element
     *  @param {object} context - Bind the provided object as 'this' for the iterator function
     *  @memberof toolbox.array
     */
    function forEach(collection, iterator, context) {
        if (!collection)
            throw new Exception('forEach: Array is null or undefined.', arguments);
        if (!isType(iterator, 'function'))
            throw new Exception('forEach: Iterator is not callable.', arguments);

        var len        = collection.length >>> 0; // Force collection.length to int
        var index      = 0;
        context = context || null;
        while (index < len) {
            if (has(collection, index)) {
                var val = collection[index];
                iterator.call(context, val, index, collection);
            }
            index++;
        }
    }
    exports.array.forEach = forEach;

    if (config.extendPrototypes) {
        Array.prototype.forEach = Array.prototype.forEach || function(iterator, context) {
            return forEach.call(null, this, iterator, context);
        };
    }

    /**
     *  Map a function across a collection, generating a new collection as a result.
     *
     *  @param {Array} collection - The collection to map
     *  @param {function} fn - The mapping function to apply
     *  @memberof toolbox.array
     */
    function map(collection, fn) {
        var results = [];
        forEach(collection, function(element, index, all) {
            results.push(fn.call(null, element, index, all));
        });
        return results;
    }
    exports.array.map = map;

    if (config.extendPrototypes) {
        Array.prototype.map = Array.prototype.map || function(fn) {
            return map.call(null, this, fn);
        };
    }

    /**
     *  Reduce a collection to a single value, by applying elements left to right until only one is left
     *  
     *  @param {Array} collection - The collection to reduce
     *  @param {function} accumulator - The function which will reduce the last value and the current value
     *  @param {object} memo - The object which will accumulate the final result to be returned
     *  @memberof toolbox.array
     */
    function reduce (collection, accumulator, initialValue) {
        if (!exists(initialValue))
            throw new Exception("No initial value was provided.", arguments);

        var result = initialValue;
        forEach(collection, function(element, index, all) {
             result = accumulator.call(null, result, element, index, all);
        });
        return result;
    }
    exports.array.reduce = reduce;

    if (config.extendPrototypes) {
        Array.prototype.reduce = Array.prototype.reduce || function(accumulator, initialValue) {
            return reduce.call(null, this, accumulator, initialValue);
        };
    }

    /**
     *  Remove elements from a collection that do not pass the predicate
     *
     *  @param {Array} collection - The collection to filter
     *  @param {function} predicate - The predicate function takes (in this order), the item to check, the index of the item, and the entire collection
     *  @param {object} context - The context to execute the filter in
     *  @memberof toolbox.array
     */
    function filter (collection, predicate, context) {
        if (typeof predicate !== 'function')
            throw new Exception("Predicate is not callable.", arguments);

        var results = [];
        forEach(collection, function (element, index, all) {
            if (predicate.call(context, element, index, all))
                results.push(element);
        });
        return results;
    }
    exports.array.filter = filter;

    if (config.extendPrototypes) {
        Array.prototype.filter = Array.prototype.filter || function(predicate, context) {
            return filter.call(null, this, predicate, context);
        };
    }

    /** 
     *  Join a collection with the provided seperator. 
     *
     *  @param {array} c - The collection to slice
     *  @param {number} start - (Optional) the start index of the slice
     *  @param {number} end   - (Optional) the end index of the slice
     *  @memberof toolbox.array
     */
    function slice (c, start, end) {
        return Array.prototype.slice.call(c, start, end);
    }
    exports.array.slice = slice;

    /**  
     *  Concatenate N arguments into a new array. 
     *
     *  @param {*} args* - A variable number of arguments to concatenate into a single array
     *  @memberof toolbox.array
     */
    function concat () {
        return Array.prototype.concat.apply([], slice(arguments));
    }
    exports.array.concat = concat;

    /**  
     *  Create a new array with the contents of the original collection, plus any additional 
     *  arguments provided appended to the end.
     *
     *  @param {array} c - The collection to append to
     *  @param {*} args* - A variable number of arguments to append
     *  @memberof toolbox.array
     */
    function append (c) {
        return concat(c, slice(arguments, 1));
    }
    exports.array.append = append;

    /**
     *  Create a new array given a pair of items.
     *
     *  @param {object} x - The head object
     *  @param {object} y - The tail object
     *  @memberof toolbox.array
     */
    function cons (x, y) {
        return concat(x, y);
    }
    exports.array.cons = cons;

    /** 
     *  Return the first element of the provided collection 
     *
     *  @param {array} The collection to get from
     *  @memberof toolbox.array
     */
    function first (c) {
        var result = c[0];
        return result;
    }
    exports.array.first = first;
    /** 
     *  Alias for `first` 
     *  @name head
     *  @memberof toolbox.array
     */
    exports.array.head = first;

    if (config.extendPrototypes) {
        Array.prototype.first = function() {
            return first.call(null, this);
        };
        Array.prototype.head = function() {
            return first.call(null, this);
        };
    }

    /** 
     *  Return the last element of the provided collection 
     *
     *  @param {array} c - The collection to get from
     *  @memberof toolbox.array
     */
    function last (c) {
        var result = c.length > 0 ? c[c.length-1] : null;
        return result;
    }
    exports.array.last = last;

    if (config.extendPrototypes) {
        Array.prototype.last = function() {
            return last.call(null, this);
        };
    }

    /** 
     *  Return all but the first element of the provided collection 
     * 
     *  @param {array} c - The collection to get from
     *  @memberof toolbox.array
     */
    function tail (c) {
        return slice(c, 1);
    }
    exports.array.tail = tail;
    /** 
     *  Alias for `tail` 
     *  @name tail
     *  @memberof toolbox.array
     */
    exports.array.rest = tail;

    if (config.extendPrototypes) {
        Array.prototype.tail = function() {
            return tail.call(null, this);
        };
        Array.prototype.rest = function() {
            return tail.call(null, this);
        };
    }

    /** 
     *  Returns true of the provided collection contains the given element 
     *
     *  @param {array} c - The collection to search
     *  @param {object} item - The item to search for
     *  @memberof toolbox.array
     */
    function contains (c, item) {
        return any(c, function (element) { return areEqual(item, element); });
    }
    exports.array.contains = contains;

    if (config.extendPrototypes) {
        Array.prototype.contains = function(item) {
            return contains.call(null, this, item);
        };
    }

    /**
     *  Finds the first element that matches the predicate
     *
     *  @param {array} c - The collection to search
     *  @param {function} predicate - The predicate to match against
     *  @memberof toolbox.array
     */
    function find (c, predicate) {
        for (var i = 0; i < c.length; i++) {
            if (predicate(c[i]))
                return c[i];
        }
        return null;
    }
    exports.array.find = find;

    /** 
     *  Returns only the unique elements from the provided collection 
     *
     *  @param {array} c - The collection to use
     *  @memberof toolbox.array
     */
    function unique (c) {
        var result = [];
        forEach(c, function(item) {
            if (!contains(result, item))
                result.push(item);
        });
        return result;
    }
    exports.array.unique = unique;

    if (config.extendPrototypes) {
        Array.prototype.unique = function() {
            return unique.call(null, this);
        };
    }

    /** 
     *  Returns the union of N collections 
     *
     *  @param {array} args* - A variable number of arrays to union
     *  @memberof toolbox.array
     */
    function union ()     {
        return reduce(slice(arguments), function (result, collection) {
            var unioned = cons(result, collection);
            return unique(unioned);
        }, []);
    }
    exports.array.union = union;

    if (config.extendPrototypes) {
        Array.prototype.union = function() {
            return union.call(null, this);
        };
    }

    /** 
     *  Rejects any elements from the provided collection which match the predicate 
     *
     *  @param {array} collection - The collection to use
     *  @param {function} predicate - The predicate function to test elements with
     *  @memberof toolbox.array
     */
    function reject(collection, predicate) {
        return reduce(collection, function(result, element) {
            if (!predicate(element))
                result.push(element);
            return result;
        }, []);
    }
    exports.array.reject = reject;

    if (config.extendPrototypes) {
        Array.prototype.reject = function(predicate) {
            return reject.call(null, this, predicate);
        };
    }

    /** 
     *  Check if a collection contains at least one element matching the predicate 
     *
     *  @param {array} collection - The collection to search
     *  @param {function} predicate - The predicate function to test elements with
     *  @memberof toolbox.array
     */
    function any(collection, predicate) {
        if (!isType(predicate, 'function'))
            throw new Exception("any: predicate is not callable.");
        if (!isType(collection, 'array', 'object'))
            throw new Exception("any: collection provided is not an enumerable object.");

        return reduce(collection, function(result, element) {
            if (result) return true;
            else return predicate(element);
        }, false);
    }
    exports.array.any = any;

    if (config.extendPrototypes) {
        Array.prototype.any = function(predicate) {
            return any.call(null, this, predicate);
        };
    }

    /** 
     *  Check if all elements of a collection pass a truth test 
     *
     *  @param {array} collection - The collection to search
     *  @param {function} predicate - The predicate function to test elements with
     */
    function all(collection, predicate) {
        if (!isType(predicate, 'function'))
            throw new Exception("all: predicate is not callable.");
        if (!isType(collection, 'array', 'object'))
            throw new Exception("all: collection provided is not an enumerable object.");

        return reduce(collection, function(result, element) {
            if (result) return predicate(element);
            else return false;
        }, true);
    }
    exports.array.all = all;

    if (config.extendPrototypes) {
        Array.prototype.all = function(predicate) {
            return all.call(null, this, predicate);
        };
    }

    /**
     *  Zip together the contents of two collections. The provided zipper function
     *  should take two arguments, and produce either a single element, or an array.
     *  If no zipper function is provided, the default behavior is to alternate elements
     *  between the first and second collections until there are no elements left. If
     *  one of the collections is of longer length than the other, whatever is left will
     *  be concatenated on to the end of the result.
     *
     *  @param {array} first - The first collection to zip
     *  @param {array} seoncd - The second collection to zip
     *  @param {function} zipper - The zipper function: (a, b) => [ab, ab] || ab
     *  @memberof toolbox.array
     */
    function zip(first, second, zipper) {
        if (first.length === 0) return second;
        if (second.length === 0) return first;
        if (!exists(zipper)) {
            zipper = function(a, b) {
                return cons(a, b);
            };
        }

        var heads = zipper(head(first), head(second));
        var tails = zip(tail(first), tail(second), zipper);
        return concat(heads, tails);
    }
    exports.array.zip = zip;

    if (config.extendPrototypes) {
        Array.prototype.zip = function(second, zipper) {
            return zip.call(null, this, second, zipper);
        };
    }

    /**
     *  Sum the elements of a collection
     *
     *  @param {array} collection - The collection to sum
     *  @memberof toolbox.array
     */
    function sum(collection) {
        return reduce(collection, function(result, element) {
            return result + element;
        }, 0);
    }
    exports.array.sum = sum;

    if (config.extendPrototypes) {
        Array.prototype.sum = function() {
            return sum.call(null, this);
        };
    }

    /**
     * Take N elements from a collection
     *
     * @param {array} collection - The collection to take from
     * @param {number} num - The number of elements to take
     * @memberof toolbox.array
     */
    function take(collection, num) {
        if (num > collection.length) {
            return collection;
        } else {
            var results = [];
            for (var i = 0; i < num; i++) {
                results.push(collection[i]);
            }
            return results;
        }
    }
    exports.array.take = take;

    if (config.extendPrototypes) {
        Array.prototype.take = function(num) {
            return take.call(null, this, num);
        };
    }

    /**
     *  Drop N elements from a collection
     *
     *  @param {array} collection - The collection to drop from
     *  @param {number} num - The number of elements to drop
     *  @memberof toolbox.array
     */
    function drop(collection, num) {
        if (num > collection.length) {
            return [];
        } else {
            var result = collection;
            for (var i = 0; i < num; i++) {
                result.shift();
            }
            return result;
        }
    }
    exports.array.drop = drop;

    if (config.extendPrototypes) {
        Array.prototype.drop = function(num) {
            return drop.call(null, this, num);
        };
    }

    /**
     *  Create an array of numbers that are included in the provided range.
     *
     *  @param {number} low - The low end of the range (inclusive)
     *  @param {number} high - The high end of the range (inclusive)
     *  @memberof toolbox.array
     */
    function range(low, high) {
        if (!exists(low) && !exists(high)) {
            return [];
        }
        if (!exists(high)) {
            high = low;
            low = 0;
        }
        var result = [];
        for (var i = low; i <= high; i++) {
            result.push(i);
        }
        return result;
    }
    exports.array.range = range;


    /**
     *  Generates a value from a function using a provided seed value.
     *  Every subsequent call to `next` uses the last generated value
     *  as the new seed. This can be used to generate an infinite sequence
     *  which can be iterated over using `next` as if it was a regular
     *  enumerable like an array.
     *
     *  @class
     *  @constructor
     *  @param {function} generator - The generating function
     *  @param {any} seed - The first value to send to the generator function
     *  @memberof toolbox
     */
    function Generator(generator, seed) {
        if (!exists(generator) || !isType(generator, 'function'))
            throw new Exception('Generator: generator function must be a function.');

        // Set the seed to null if it is not initialized
        if (!exists(seed)) seed = null;
        // Store the last value produced
        var last = seed;

        /**
         *  Generate and return the next element.
         *  @memberof toolbox.Generator
         */
        this.next = function () {
            last = generator.call(null, last);
            return last;
        };

        /**
         *  Generate and take the next N elements as an array
         *  @param {number} n - The number of elements to take
         *  @memberof toolbox.Generator
         */
        this.take = function(n) {
            var results = [];
            while (results.length < n) {
                results.push(this.next());
            }
            return results;
        };

        /**
         *  Drop the next N elements
         *  @param {number} n - The number of elements to drop
         *  @memberof toolbox.Generator
         */
        this.drop = function(n) {
            var count = 0;
            while (count < n) {
                this.next();
            }
        };
    }
    exports.Generator = Generator;

    /**
     *  Acts as a lazy iterator over a collection (array or object).
     *
     *  @class
     *  @constructor
     *  @param {array|object} collection - The collection to enumerate
     *  @memberof toolbox
     */
    function Enumerator(collection) {
        if (!exists(collection) || !isType(collection, 'array', 'object'))
            collection = [];

        var keys = Object.keys(collection);

        /**
         *  Move to the next element in the collection and return it.
         *  @memberof toolbox.Enumerator
         */
        this.next = function () {
            if (keys.length !== 0) {
                return collection[keys.shift()];
            }
            else {
                throw new StopIterationException();
            }
        };

        /**
         *  Reset enumeration to the start of the collection
         *  @memberof toolbox.Enumerator
         */
        this.reset = function() {
            keys = Object.keys(collection);
        };

        /**
         *  Return the length of the underlying collection
         *  @memberof toolbox.Enumerator
         */
        this.count = function() {
            return Object.keys(collection).length;
        };
    }
    exports.Enumerator = Enumerator;

    /**
     *  Functions for generating/working with random data
     *  @namespace toolbox.random
     */
    exports.random = {};

    /**
     *  Returns string of random characters with a length matching the specified limit. Excludes 0
     *  to avoid confusion between 0 and O.
     *
     *  @param {int} limit - The max length of the string returned
     *  @memberof toolbox.random
     */
    function chars(limit) {
        // If no limit was passed, return a string with a sane default limit
        limit = limit || 32;
        var strongAlphanumerics = [
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            1, 2, 3, 4, 5, 6, 7, 8, 9
        ];

        var collected = [];
        for (var i = 0; i < limit; i++) {
            collected.push(strongAlphanumerics[Math.floor(Math.random() * 61)]);
        }

        return collected.toString().replace(/[,]/g, '');
    }
    exports.random.chars = chars;

    /**
     *  Generate a string of N random digits
     *
     *  @param {int} limit - The max length of the string returned
     *  @memberof toolbox.random
     */
    function digits(limit) {
        limit = limit || 32;
        var result = '';
        while (result.length < limit) {
            result = result + Math.random().toString(10).slice(2);
        }
        return result.slice(0, limit);
    }
    exports.random.digits = digits;

    /**
     *  Generates a string of N random hexadecimal characters
     *  @param {int} limit - The length of the string to return
     *  @memberof toolbox.random
     */
    function hex(limit) {
        limit = limit || 32;
        var result = '';
        while (result.length < limit) {
            result = result + Math.random().toString(16).slice(2);
        }
        return result.slice(0, limit);
    }
    exports.random.hex = hex;

    /**
     *  Generates an RFC4122, version 4, UUID
     *
     *  References:
     *
     *  * http://www.ietf.org/rfc/rfc4122.txt (particularly version 4)
     *  * https://twitter.com/#!/kriskowal/status/157519149772447744
     *  * http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
     *  * http://note19.com/2007/05/27/javascript-guid-generator/
     *  * http://www.broofa.com/Tools/Math.uuid.js
     *  * http://www.broofa.com/blog/?p=151
     *
     *  @memberof toolbox.random
     */
    function uuid() {
        return randomHex(8) + "-" + randomHex(4) + "-4" + randomHex(3) + "-" + randomHex(8) + randomHex(4);
    }
    exports.random.uuid = uuid;


    /**
     *  Higher order functions for manipulating and composing functions
     *  @namespace toolbox.func
     */
    exports.func = {};

    /**
     *  An empty function that does nothing.
     *  @memberof toolbox.func
     */
    function noop() { }
    exports.func.noop = noop;

    if (config.extendPrototypes) {
        Function.prototype.noop = noop;
    }

    /**
     *  The identity function. Returns it's argument.
     *  @param {object} x - The object to identify
     *  @memberof toolbox.func
     */
    function identity(x) { return x; }
    exports.func.identity = identity;

    if (config.extendPrototypes) {
        Function.prototype.identity = identity;
    }

    /**
     *  Bind a function context, as well as any arguments you wish to
     *  partially apply. Returns a function that acts like the old one,
     *  but only requires whatever additional arguments you want to call
     *  it with.
     *  
     *  Note: Meant for instance methods, use partial for static functions.
     *
     *  @param {function} fn - The function to bind
     *  @param {object} context - The object to bind as `this` when executing `fn`
     *  @memberof toolbox.func
     */
    function bind(fn, context) {
        return function () {
            return fn.apply(context, slice(arguments));
        };
    }
    exports.func.bind = bind;

    if (config.extendPrototypes) {
        Function.prototype.bind = Function.prototype.bind || function(context) {
            return bind.call(null, this, context);
        };
    }

    /**
     *  Partially apply arguments to a function.
     *  Takes a function, and any arguments you want to partially apply.
     *  This will return a new function that acts like the old one, but only
     *  requires whatever additional arguments you want to call it with.
     *  
     *  Note: Meant for static functions, use bind for instance methods.
     *
     *  @param {function} fn - The function to partially apply arguments to
     *  @param {object} args* - A variable number of arguments to apply
     *  @memberof toolbox.func
     */
    function partial(fn) {
        var args = slice(arguments, 1);
        return function () {
            var additional = slice(arguments);
            return fn.apply(null, concat(args, additional));
        };
    }
    exports.func.partial = partial;

    /**
     *  Takes a set of functions and returns a fn that is the juxtaposition
     *  of those fns. The returned fn takes a variable number of args, and
     *  returns a vector containing the result of applying forEach fn to the
     *  args (left-to-right).
     *  juxt(a, b, c) => abc(x) => [a(x), b(x), c(x)]
     *
     *  @param {function} args* - A variable number of functions to juxtapose
     *  @memberof toolbox.func
     */
    function juxt() {
        var fns = slice(arguments);
        if (!fns.length)
            throw new Error('juxt requires at least one argument.');

        return function () {
            var args = slice(arguments);
            return reduce(fns, function (result, fn) {
                result.push(fn.apply(null, args));
                return result;
            }, []);
        };
    }
    exports.func.juxt = juxt;

    /**
     *  Returns a function which takes the same arguments and performs the same action, 
     *  but returns the opposite truth value of the provided function.
     *
     *  @param {function} fn - The function to complement
     *  @memberof toolbox.func
     */
    function complement(fn) {
        return function() {
            return !fn.apply(null, slice(arguments));
        };
    }
    exports.func.complement = complement;

    /**
     *
     *  Threads x through forEach fn. Applies x as the only parameter to the first
     *  fn, converting to an array if it is not one already. If there are more
     *  functions, inserts the first result as the parameter for the second fn, etc..
     *
     *  @param {object} x - The argument to thread through the provided functions
     *  @param {function} args* - A variable number of functions to thread through
     *  @memberof toolbox.func
     */
    function thread(x) {
        var fns = slice(arguments, 1);
        if (fns.length) {
            return reduce(fns, function(result, fn) {
                return fn.apply(null, [ result ]);
            }, x);
        }
        else return x;
    }
    exports.func.thread = thread;

    /**
     *  Curry allows you to compose two functions into one monolithic function.
     *  The arguments to the final function are applied from right to left.
     *  
     *  Example:
     *      curry(f, g)(2) => f(g(2))
     *
     *  @param {function} f - The outer function
     *  @param {function} g - The inner function
     *  @memberof toolbox.func
     */
    function curry(f, g) {
        if (f && g) {
            return function() {
                var args   = slice(arguments);
                var result = g.apply(null, args);
                return f.apply(null, [ result ]);
            };
        }
        else throw new Error('Curry only accepts two functions.');
    }
    exports.func.curry = curry;

    /**
     *  Define a function which dispatches to one or more functions, depending on arguments.
     *  Parameters:
     *    dispatcher: The function which tells defmulti how to find the data it needs to dispatch properly,
     *              needs to return the value to dispatch on. See the example below.
     *    $default:   The default method to run if no functions can be found to dispatch
     *    fnX:        Function descriptors (objects with a name (string), and fn (function) property)
     *
     *  Example:
     *
     *      var dispatcher = function (config) { 
     *          return { dispatch: config.environment }; 
     *      };
     *
     *  default doesn't require a descriptor object because no lookups need to
     *  be performed to determine whether or not to call it.
     *
     *      var default = function (config, query) {
     *          var repository = new Repository(new MemoryContext(config.logLevel));
     *          return query.execute(repository);
     *      };
     *
     *  All dispatched methods however require a descriptor { name, fn }.
     *  Name is used to match against the dispatcher objects 'dispatch' value
     *
     *      var sql = {
     *          name: 'MSSQL',
     *          fn: function (config, query) {
     *              try {
     *                  var connection = new Connection(config.connectionString);
     *                  var context = new SQLContext(connection, config.logLevel);
     *                  var repository = new Repository(context);
     *                  // Assume query.execute returns a Deferred object
     *                  return query.execute(repository).then(context.closeConnection);
     *              } catch (ex) { 
     *                  // handle
     *              }
     *          }
     *      };
     *      var test = {
     *          // Set up a test environment to run code against
     *      };
     *
     *  The API is simple, and encourages reusable components where possible
     *
     *      var executeQuery = defmulti(dispatcher, default, sql, test);
     *
     *  Make your exposed API even more succinct using partial application!
     *
     *      var dbConfig = { environment: 'test' };
     *      var queryDb = partial(executeQuery, dbConfig);
     *
     *  No more conditionals scattered all over your code!!
     *
     *      queryDb('SELECT * FROM NONSENSE WHERE PHRASE IN ("pies", "gerg")');
     *
     *  @param {function} dispatcher - The dispatcher function. When called should return an object with a `dispatch` property.
     *  @param {function} default - The default function to call if no alternatives are available to dispatch to.
     *  @param {object} args* - A variable number of function definition objects to act as dispatch options
     *  @memberof toolbox.func
     */
    exports.func.defmulti = defmulti;
    function defmulti (dispatcher, $default) {
        if (!isType(dispatcher, 'function'))
            throw new Exception('defmulti: dispatcher must be a function');
        if (!isType($default, 'function'))
            throw new Exception('defmulti: $default must be a function');

        var pool = [];
        // Validate dispatched functions
        var definitions = slice(arguments, 2);
        forEach(definitions, function(definition) {
            if (!validateDefinition(definition))
                throw new Exception('defmulti: Function definition is not valid.', fn);
            else
                pool.push(definition);
        });

        return function() {
            var args = slice(arguments);
            var dispatchConfig = dispatcher.apply(null, args);

            if (!isType(dispatchConfig, 'object') || !isType(dispatchConfig.dispatch, 'string'))
                throw new Exception('defmulti: expected a dispatch configuration object, but was invalid.', dispatchConfig);

            var executing = filter(pool, function(d) { return d.name === dispatchConfig.dispatch; });
            if (executing.length > 0)
                forEach(executing, function(d) { d.fn.apply(null, args); });
            else
                $default.apply(null, args);
        };

        function validateDefinition(definition) {
            return isType(definition, 'object') && isType(definition.name, 'string') && isType(definition.fn, 'function');
        }
    }

    /**
     *  Cache results for a function for calls with identical arguments
     *  Credit to @philogb, @addyosmani, @mathias, and @DmitryBaranovsk 
     *
     *  @param {function} fn - The function to memoize
     *  @memberof toolbox.func
     */
    function memoize(fn) {
        return function () {
            var args   = slice(arguments)
                , hash = ''
                , i    = args.length;

            currentArg = null;
            while (i--) {
                currentArg = args[i];
                hash += currentArg === Object(currentArg) ? JSON.stringify(currentArg) : currentArg;
                fn.memoize = fn.memoize || {};
            }
            if (hash in fn.memoize)
                return fn.memoize[hash];
            else {
                fn.memoize[hash] = fn.apply(this, args);
                return fn.memoize[hash];
            }
        };
    }
    exports.func.memoize = memoize;


    /**
     *  Takes a function and returns a wrapped version of it that will execute the original
     *  one time, and then returns that same result on all following calls to it.
     *
     *  Subsequent calls to foo simply return the result that is stored in it's closure. 
     *  This is a fast lookup and efficient especially if the conditionals used in the 
     *  previous solutions are many and complex.
     *
     *  In essence, this results in a means by which you can define a runtime optimized
     *  lookup for a function or value. Instead of calling a function which must perform
     *  potentially expensive evaluation of conditionals or feature detection before returning
     *  a result, `once` enables you to perform those computations the first time the function
     *  is called, and then return the proper result as if the function had been written without
     *  those comuptations at all!
     *
     *  This is different from memoization, where you want to return the same result for a given 
     *  set of arguments. `once` is better used in situations like: 
     *
     *  - A function which satisfies one or more conditions after the first call, but must continually 
     *    evaluate those conditions forEach time the function is called (e.g. a function which has to 
     *    perform browser feature detection prior to returning a result). These extra computations are 
     *    typically unecessary, and could be expensive to perform. 
     *  - You want to optimize a function which has variable results, but the method by which you get 
     *    those results is determined at runtime, and is unecessary or expensive to evaluate for every 
     *    call (think browser specific functions for retrieving scroll position on a web page).
     *
     *
     * Example:
     *
     *     var methodFirstCalled = once(function() {
     *         return new Date();
     *     });
     *     methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     *     ...5 seconds...
     *     methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     *     ...5 seconds...
     *     methodFirstCalled() => Thu Dec 27 2012 21:19:58 GMT-0600 (Central Standard Time)
     *
     *  [Additional Reading](http://michaux.ca/articles/lazy-function-definition-pattern)
     *
     *  @param {function} fn - The function to execute
     *  @memberof toolbox.func
     */
    function once(fn) {
        var result;
        return function () {
            if (!exists(result))
                result = fn.apply(null, arguments);
            return result;
        };
    }
    exports.func.once = once;

    /**
     *  Delay execution of a function or array of functions by a given number of milliseconds
     *
     *  @param {function|array} fn - The function, or array of functions to delay (in order of appearance)
     *  @param {number} ms - Number of milliseconds to delay (defaults to 100)
     *  @memberof toolbox.func
     */
    function delay(fn, ms) {
        // Ensure delay time is set
        ms = exists(ms) ? ms : 100;
        // Create recursive function for executing the delay
        var execute = function(target) {
            var timeout = null;
            timeout = setTimeout(function() {
                target();
                clearTimeout(timeout);
                timeout = null;
                // If we are iterating over an array of functions, recursively call execute
                if (isType(fn, 'array') && fn.length > 0) {
                    execute(fn.shift());
                }
            }, exists(ms) ? ms : 100);
        };

        execute(isFunction(fn) ? fn : fn.shift());
    }
    exports.func.delay = delay;

    /**
     *  Repeat execution of a function N times
     *
     *  @param {function} fn - The function to repeat
     *  @param {number} n - The number of times to repeat
     *  @memberof toolbox.func
     */
    function repeat(fn, n) {
        var remaining = n;
        while (remaining > 0) {
            fn();
            remaining--;
        }
    }
    exports.func.repeat = repeat;

    /**
     *  Logging related classes
     *  @namespace toolbox.logging
     */
    exports.logging = {};

    var Levels = {
          all:   new Level(0, 'all')
        , debug: new Level(1, 'debug')
        , info:  new Level(2, 'info')
        , warn:  new Level(3, 'warn')
        , error: new Level(4, 'error')
        , none:  new Level(5, 'none')
    };

    /**
     *  Predefined logging levels
     *  @memberof toolbox.logging
     */
    exports.logging.Levels = Levels;

    /**
     *  The application logger class
     *  @class
     *  @constructor
     *  @memberof toolbox.logging
     */
    function Logger() {
        this.level = Levels.all;

        function _log(message) {
            if (root.console && root.console.log)
                root.console.log(message);
        }

        function _dir(obj) {
            if (root.console && root.console.dir)
                root.console.dir(obj);
            else if (JSON !== null && JSON !== undefined)
                _log(JSON.stringify(obj));
        }

        /**
         *  Log a message of the given level to the console.
         *  @param {Level} level - The logging level to use.
         *  @param {object} args* - A variable number of arguments to log
         *  @memberof toolbox.logging.Logger
         */
        this.log = function(level) {
            var args = slice(arguments, 1);
            if (level.gte(this.level)) {
                forEach(args, function(arg) {
                    if (typeof arg === 'string')
                        _log(format('#{0}: #{1} - #{2}', new Date(), level.name, arg));
                    else if (arg instanceof Exception)
                        _log(arg);
                    else if (arg instanceof Error)
                        _log(format('#{0}: #{1} - #{2}', new Date(), level.name, prettifyException(arg)));
                    else
                        _dir(arg);
                });
            }

            function prettifyException(ex) {
                var exceptionMessage = ex.message || ex.description || String(ex);

                if (ex) {
                    var e = format('Exception: #{0}', exceptionMessage);
                    if (ex.lineNumber) {
                        e = format('#{0} on line: #{1}', e, ex.lineNumber);
                    }
                    if (ex.fileName) {
                        e = format('#{0} in file: #{1}', e, ex.fileName);
                    }
                    if (ex.stack) {
                        e = format('#{e}#{newline}Stack Trace:#{newline}#{stack}', { e: e, newline: newline, stack: ex.stack });
                    }

                    return e;
                }

                return 'N/A';
            }

            function getFileName(url) {
                return url.substr(Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\')) + 1);
            }
        };
    }

    /**
     *  Log a debug message
     *  @param {object} args* - A variable number of arguments to log.
     *  @memberof toolbox.logging.Logger
     */
    Logger.prototype.debug = function() {
        var args = concat(Levels.debug, slice(arguments));
        this.log.apply(this, args);
    };
    /**
     *  Log a info message
     *  @param {object} args* - A variable number of arguments to log.
     *  @memberof toolbox.logging.Logger
     */
    Logger.prototype.info = function() {
        var args = concat(Levels.info, slice(arguments));
        this.log.apply(this, args);
    };
    /**
     *  Log a warn message
     *  @param {object} args* - A variable number of arguments to log.
     *  @memberof toolbox.logging.Logger
     */
    Logger.prototype.warn = function() {
        var args = concat(Levels.warn, slice(arguments));
        this.log.apply(this, args);
    };
    /**
     *  Log a error message
     *  @param {object} args* - A variable number of arguments to log.
     *  @memberof toolbox.logging.Logger
     */
    Logger.prototype.error = function() {
        var args = concat(Levels.error, slice(arguments));
        this.log.apply(this, args);
    };

    /**
     *  Defines a logging level, and provides facilities for displaying and comparing them
     *
     *  @class
     *  @constructor
     *  @param {number} level - The integer representation of this level. The lower the more verbose.
     *  @param {string} name - The level name
     *  @memberof toolbox.logging
     */
    function Level(level, name) {
        this.level = level;
        this.name = name;
    }
    /** 
     *  Print the Level's name
     *  @memberof toolbox.logging.Level 
     */
    Level.prototype.toString = function() {
        return this.name;
    };
    /**
     *  See if this Level is equal to another.
     *  @param {Level} level - The Level object to compare against
     *  @memberof toolbox.logging.Level
     */
    Level.prototype.eq = function(level) {
        return this.level === level.level;
    };
    /**
     *  See if this level is higher or equal to another.
     *  @param {Level} level - The Level object to compare against
     *  @memberof toolbox.logging.Level
     */
    Level.prototype.gte = function(level) {
        return this.level >= level.level;
    };
    exports.logging.Level = Level;

    /**
     *  The global logging instance.
     *  @memberof toolbox
     *  @name log
     *  @type Logger
     */
    exports.log = new Logger();

    /**
     *  Creates a new exception
     *  @class
     *  @constructor
     *  @memberof toolbox
     *  @param {string} message - The message for this exception
     *  @param {object} context - The context to store along with this exception
     */
    function ApplicationException(message, context) {
        this.context = context;
        this.message = message;
        return this;
    }
    /** 
     *  Get the exception message as a string 
     *  @memberof toolbox.ApplicationException
     */
    ApplicationException.prototype.toString = function () {
        return 'ApplicationException: ' + this.message;
    };
    exports.ApplicationException = ApplicationException;

    /**
     *  Thrown when a Generator reaches the end of it's internal collection.
     *  @class
     *  @constructor
     *  @memberof toolbox
     */
    function StopIterationException () {
        this.message = 'Iteration of the underlying collection has been completed.';
        return this;
    }
    /** 
     *  Get the exception message as a string 
     *  @memberof toolbox.StopIterationException
     */
    StopIterationException.prototype.toString = function () {
        return 'StopIterationException: ' + this.message;
    };
    exports.StopIterationException = StopIterationException;

    /**
     *  A simulated enum object as seen in languages such as C#
     * 
     *  Initialize this class with a set of string values that represent
     *  the names of the enumeration values.
     *  
     *  Example:
     *
     *      var Weekdays = new Enumeration(['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun']);
     *      Weekdays.Mon.eq(Weekdays.Mon)   => true
     *      Weekdays.Mon.toString()         => 'Mon'
     *      Weekdays.toString()             => 'Mon, Tues, Wed, Thurs, Fri, Sat, Sun';
     *      Weekdays.next(Weekdays.Mon)     => Weekdays.Tues
     *      Weekdays.previous(Weekdays.Mon) => Weekdays.Sun
     *
     *  @class
     *  @constructor
     *  @params {array} values - The values to initialize the enumeration with
     *  @memberof toolbox
     */
    function Enumeration(values) {
        var enums = [];

        var self = this;
        forEach(values, function(value, i) {
            var name = String(value);
            var $enum = new EnumerationValue(name, i);
            self[name] = $enum;
            enums.push($enum);
        });

        this.values = function() {
            return enums;
        };
    }
    /**
     *  Render a string of all this Enumeration's values
     *  @memberof toolbox.Enumeration
     */
    Enumeration.prototype.toString = function() {
        return str(', ', pick(this.values(), 'name'));
    };
    /**
     *  Get the next value following the provided value. Wraps around the end if the last value is the one provided.
     *  @memberof toolbox.Enumeration
     */
    Enumeration.prototype.next = function($enum) {
        // Wrap around
        if (this.values().length < ($enum.value + 1))
            return this.values()[0];
        else
            return this.values()[$enum.value + 1];
    };
    /**
     *  Get the previous value before the provided value. Wraps around the start if the first value is the one provided.
     *  @memberof toolbox.Enumeration
     */
    Enumeration.prototype.previous = function($enum) {
        // Wrap around
        if ($enum.value === 0)
            return this.values()[this.values.length - 1];
        else
            return this.values()[$enum.value - 1];
    };
    /**
     *  Get the EnumerationValue object from it's underlying integer value
     *  @param {number} value - The integer value to find in this Enumeration
     *  @memberof toolbox.Enumeration
     */
    Enumeration.prototype.fromValue = function(value) {
        if (this.values().length < value)
            throw new ApplicationException('Enumeration.fromValue: Invalid value.', value);
        else
            return this.values()[value];
    };
    /**
     *  Get the EnumerationValue object from it's name
     *  @param {string} name - The name of the Enumeration value
     *  @memberof toolbox.Enumeration
     */
    Enumeration.prototype.fromName = function(name) {
        if (typeof this[name] === 'undefined') {
            // Try searching by name in case the wrong casing was used
            var values = this.values();
            for (var i = 0; i < values.length; i++) {
                if (values[i].name.toLowerCase() === name.toLowerCase()) {
                    return values[i];
                }
            }
            // No value was found that matches this name
            return null;
        } else {
            return this[name];
        }
    };

    exports.Enumeration = Enumeration;

    /**
     *  A value belonging to an Enumeration object
     *  @class
     *  @constructor
     *  @param {string} name - The name of the value
     *  @param {number} value - The integer value for this enum
     *  @memberof toolbox
     */
    function EnumerationValue(name, value) {
        this.name  = name;
        this.value = value;
    }
    /**
     *  The string representation of this enum value
     *  @memberof toolbox.EnumerationValue
     */
    EnumerationValue.prototype.toString = function() {
        return this.name;
    };
    /**
     *  Determine if this enum value is equal to another
     *  @param {EnumerationValue} $enum - The enum value to compare to
     *  @memberof toolbox.EnumerationValue
     */
    EnumerationValue.prototype.eq = function($enum) {
        return exists($enum) && this.value === $enum.value && this.name === $enum.name;
    };

    if (config.createGlobalAliases) {
        forEach([
            // Namespaces
            'string', 'object', 'array', 'func', 'random',
            // Functions
            'log',
            // Classes
            'ApplicationException', 'StopIterationException', 'Generator', 'Enumerator',
            // Enums
            'Enumeration'
        ],
        function(ns) {
            if (!exists(root[ns]))
                root[ns] = exports[ns];
            else
                exports.log.warn('Unable to add toolbox.' + ns + ' to global namespace. Name already exists.');
        });
    }


    return exports;
});
