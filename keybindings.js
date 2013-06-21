(function($, root) {
    var empty     = Function.prototype.valueOf();
    var log       = toolbox.log;
    // Supplant ApplicationException with it's enhanced counterpart
    var ApplicationException = toolbox.ApplicationException;

    root.Keys = {
        'A': 65,
        'B': 66,
        'C': 67,
        'D': 68,
        'E': 69,
        'F': 70,
        'G': 71,
        'H': 72,
        'I': 73,
        'J': 74,
        'K': 75,
        'L': 76,
        'M': 77,
        'N': 78,
        'O': 79,
        'P': 80,
        'Q': 81,
        'R': 82,
        'S': 83,
        'T': 84,
        'U': 85,
        'V': 86,
        'W': 87,
        'X': 88,
        'Y': 89,
        'Z': 90,
        '0': 48,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        'Numpad 0': 96,
        'Numpad 1': 97,
        'Numpad 2': 98,
        'Numpad 3': 99,
        'Numpad 4': 100,
        'Numpad 5': 101,
        'Numpad 6': 102,
        'Numpad 7': 103,
        'Numpad 8': 104,
        'Numpad 9': 105,
        'Multiply': 106,
        'Add': 107,
        'Subtract': 109,
        'Decimal': 110,
        'Divide': 111,
        'F1': 112,
        'F2': 113,
        'F3': 114,
        'F4': 115,
        'F5': 116,
        'F6': 117,
        'F7': 118,
        'F8': 119,
        'F9': 120,
        'F11': 122,
        'F12': 123,
        'F13': 124,
        'F14': 125,
        'F15': 126,
        'Backspace': 8,
        'Tab': 9,
        'Enter': 13,
        'SHIFT': 16,
        'CTRL': 17,
        'ALT': 18,
        'META': 91,
        'META_RIGHT': 93,
        'Caps Lock': 20,
        'Esc': 27,
        'Spacebar': 32,
        'Page Up': 33,
        'Page Down': 34,
        'End': 35,
        'Home': 36,
        'Left': 37,
        'Up': 38,
        'Right': 39,
        'Down': 40,
        'Insert': 45,
        'Delete': 46,
        'Num Lock': 144,
        'ScrLk': 145,
        'Pause/Break': 19,
        '; :': 186,
        '= +': 187,
        '- _': 189,
        '/ ?': 191,
        '` ~': 192,
        '[ {': 219,
        '\\ |': 220,
        '] }': 221,
        '" \'': 222,
        ',': 188,
        '.': 190,
        '/': 191,
        // Get the name for the keycode provided
        getName: function(which) {
            if (typeof which !== 'number')
                throw new ApplicationException('Combo.getName: `which` must be a keycode (number)', which);

            for (var key in this) {
                var keycode = this[key];
                if ((typeof keycode === 'number') && which === keycode) {
                    return key;
                }
            }

            return 'Unknown';
        },
        // Get the keycode for the name provided
        getCode: function(key) {
            if (typeof key !== 'string')
                throw new ApplicationException('Combo.getCode: `key` must be a string', key);
            return this[key];
        },
        /* Determine if the provided key was pressed
         * key: The expected key (can be either a keycode or the letter)
         * which: The keyCode (from e.which) of the currently pressed key
         */
        isKeyPressed: function(key, which) {
            if (typeof which !== 'number')
                throw new ApplicationException('Combo.isKeyPressed: `which` must be a keycode (number)', arguments);

            var self = this;
            if (typeof key === 'string') {
                return which === this.getCode(key);
            } else if (typeof key === 'number') {
                return which === key;
            } else if (toolbox.object.isType(key, 'array')) {
                // Map each key to it's keyCode, and check for the presence of `which`
                return key.map(function(k) {
                    if (typeof k === 'string') return self.getCode(k);
                    else return k;
                }).indexOf(which) > -1;
            } else {
                // Not a number or string? Not a valid keycode
                return false;
            }
        },
        // Return true if the provided key is a meta key
        isMetaKey: function(which) {
            if (typeof which !== 'number')
                throw new ApplicationException('Combo.isMetaKey: `which` must be a keycode (number)', which);

            switch (which) {
                case this.CTRL:
                case this.SHIFT:
                case this.ALT:
                case this.META:
                case this.META_RIGHT:
                    return true;
                default:
                    return false;
            }
        }
    };

    function Combo(keyCode, meta) {
        if (arguments.length === 2 && toolbox.object.isType(meta, 'array')) {
            if (typeof keyCode === 'string')
                this.keyCode = Keys.getCode(keyCode);
            else
                this.keyCode = keyCode;
            this.ctrl  = meta.indexOf('ctrl') > -1  || meta.indexOf(Keys.CTRL) > -1;
            this.shift = meta.indexOf('shift') > -1 || meta.indexOf(Keys.SHIFT) > -1;
            this.alt   = meta.indexOf('alt') > -1   || meta.indexOf(Keys.ALT) > -1;
            this.meta  = meta.indexOf('meta') > -1  || meta.indexOf(Keys.META) > -1 || meta.indexOf(Keys.META_RIGHT) > -1;
        } else if (arguments.length === 1) {
            if (typeof keyCode === 'string')
                this.keyCode = Keys.getCode(keyCode);
            else
                this.keyCode = keyCode;
            this.ctrl  = this.keyCode === Keys.CTRL;
            this.shift = this.keyCode === Keys.SHIFT;
            this.alt   = this.keyCode === Keys.ALT;
            this.meta  = this.keyCode === Keys.META || this.keyCode === Keys.META_RIGHT;
        } else {
            throw new ApplicationException('Combo: Invalid number of arguments provided', arguments);
        }
    }
    // Pretty print the combo
    Combo.prototype.toString = function() {
        var meta = (this.ctrl  ? 'CTRL+'  : '') +
                   (this.alt   ? 'ALT+'   : '') +
                   (this.shift ? 'SHIFT+' : '') +
                   (this.meta  ? 'META+'  : '');
        return meta + (Keys.getName(this.keyCode) || '');
    };
    // Encode Combo as JSON
    Combo.prototype.serialize = function() {
        return JSON.stringify(this);
    };
    // Decode Combo from JSON string
    Combo.deserialize = function(serialized) {
        return JSON.parse(serialized);
    };
    // Clone this Combo as a new one, optionally ignoring the key
    Combo.prototype.clone = function(ignoreKey) {
        var combo   = new Combo(this.keyCode);
        combo.ctrl  = this.ctrl;
        combo.alt   = this.alt;
        combo.shift = this.shift;
        combo.meta  = this.meta;
        return combo;
    };
    // Create a Combo from an arbitrary object, useful for shorthand notation, or when deserializing Bindings
    // so that the Binding's combo is of type Combo.
    Combo.fromObject = function(obj) {
        if (!obj || !toolbox.object.isType(obj.keyCode, 'number'))
            throw new ApplicationException('Combo.fromObject: Cannot create Combo from provided object', obj);
        var combo = new Combo(obj.keyCode);
        combo.ctrl  = obj.ctrl  || false;
        combo.alt   = obj.alt   || false;
        combo.shift = obj.shift || false;
        combo.meta  = obj.meta  || false;
        return combo;
    };
    // Given a keypress event, convert to a Combo
    Combo.fromEvent = function(e) {
        var combo = new Combo(e.which);
        combo.shift = combo.shift || e.shiftKey;
        combo.alt   = combo.alt   || e.altKey;
        combo.meta  = combo.meta  || e.metaKey;
        combo.ctrl  = combo.ctrl  || e.ctrlKey;
        return combo;
    };
    // Reverse of toString, you should get the original combo if you call Combo.fromString(combo.toString())
    Combo.fromString = function(str) {
        var parts     = str.split('+');
        if (parts.length >= 1) {
            var combo     = new Combo(Keys.getCode(parts[parts.length - 1]));
            combo.ctrl    = parts.indexOf('CTRL') > -1;
            combo.alt     = parts.indexOf('ALT') > -1;
            combo.shift   = parts.indexOf('SHIFT') > -1;
            combo.meta    = parts.indexOf('META') > -1 || parts.indexOf('META_RIGHT') > -1;
            return combo;
        } else throw ApplicationException('Combo.fromString: Invalid string', str);
    };
    // Determine if the provided combo was pressed
    // ignoreKey: true/false - Set to true if you only want to match on meta keys
    Combo.prototype.isMatch = function (combo, ignoreKey) {
        if (!combo)
            throw new ApplicationException('Combo.isMatch called without a combo to match against.');

        // If the key itself is the same, we just have to ensure the expected meta key is pressed
        if (!ignoreKey && (this.keyCode !== combo.keyCode)) return false;
        if (this.shift   && !combo.shift)   return false;
        if (this.alt     && !combo.alt)     return false;
        if (this.ctrl    && !combo.ctrl)    return false;
        if (this.meta    && !combo.meta)    return false;
        else return true;
    };
    // Check if a Combo requires the presence of the provided key
    Combo.prototype.requires = function(which) {
        if (typeof which !== 'number')
            throw new ApplicationException('Combo.requires: `which` must be a keycode (number)', which);

        if (this.keyCode === which) return true;
        else if (this.ctrl  && keyCode === Keys.CTRL)  return true;
        else if (this.shift && keyCode === Keys.SHIFT) return true;
        else if (this.alt   && keyCode === Keys.ALT)   return true;
        else if (this.meta  && (keyCode === Keys.META || keyCode === Keys.META_RIGHT))
            return true;
        else return false;
    };
    Combo.prototype.containsMetaKeys = function() {
        return this.ctrl || this.shift || this.alt || this.meta;
    };

    root.Combo = Combo;

    root.Keybindings = (function() {

        function Keybindings() {
            var self = this;
            $(root.document).on('keydown', function(e) { handleKeydown(e, self); });
            $(root.document).on('keyup',   function(e) { handleKeyup(e, self); });

            this.bindings = [];
            this.handlers = [];
        }

        Keybindings.prototype.get = function(name) {
            return toolbox.array.find(this.bindings, function(b) { return b.name === name; });
        };

        Keybindings.prototype.add = function(name, combo) {
            if (!name || !combo)
                throw new ApplicationException('Keybindings.add: Invalid arguments provided', arguments);
            if (!toolbox.object.isType(combo, 'combo'))
                throw new ApplicationException('Keybindings.add: `combo` must be an instance of Combo', arguments);

            // If the binding name already exists, overwrite it
            var binding = toolbox.array.find(this.bindings, function(b) { return b.name === name; });
            if (binding) {
                binding.combo = combo;
            } else {
                this.bindings.push({
                    name:  name,
                    combo: combo
                });
            }
        };

        Keybindings.prototype.registerHandler = function(bindingName, eventType, handler) {
            // Permit eventType to be omitted and defaulted to keydown
            if (arguments.length === 2 && typeof eventType === 'function') {
                handler = eventType;
                eventType = 'keydown';
            }

            if (!bindingName || !eventType || !handler || typeof handler !== 'function')
                throw new ApplicationException('Keybindings.registerHandler: Invalid arguments provided', arguments);

            this.handlers.push({
                name:      bindingName,
                eventType: eventType,
                handler:   handler
            });
        };

        Keybindings.prototype.registerToggle = function(bindingName, toggleOn, toggleOff) {
            if (arguments.length !== 3) {
                throw new ApplicationException('Keybindings.registerToggle: You must provide all three arguments to this function.');
            }

            this.handlers.push({
                name: bindingName,
                eventType: 'keydown',
                handler: toggleOn
            });
            this.handlers.push({
                name: bindingName,
                eventType: 'keyup',
                handler: toggleOff
            });
        };

        Keybindings.prototype.serialize = function() {
            return JSON.stringify(this);
        };

        Keybindings.prototype.deserialize = function(serialized) {
            var parsed = JSON.parse(serialized);
            if (!parsed || !parsed.bindings || !toolbox.object.isType(parsed.bindings, 'array'))
                throw new ApplicationException('Keybindings.deserialize: Unable to deserialize keybindings', parsed);
            // Deserialize bindings
            var mapped = parsed.bindings.map(function(b) {
                b.combo = Combo.fromObject(b.combo);
                return b;
            });
            this.bindings = mapped;
        };

        function handlesEvent(handler, bindings, combo) {
            var binding = null;
            for (var i = 0; i < bindings.length; i++) {
                if (bindings[i].name === handler.name) {
                    binding = bindings[i];
                    break;
                }
            }

            if (!binding) return false;
            else {
                var isMetaBinding = handler.name.indexOf('$$META') > -1;
                // If this is a meta binding, ignore the keycode
                return isMetaBinding ? binding.combo.isMatch(combo, true) : binding.combo.isMatch(combo);
            }
        }

        function handleKeydown(e, instance) {
            e.stopImmediatePropagation();

            var combo = Combo.fromEvent(e);
            instance.handlers
                .filter(function(h) {
                    return h.eventType === 'keydown' && handlesEvent(h, instance.bindings, combo);
                })
                .forEach(function(h) {
                    h.handler();
                });

            return false;
        }

        function handleKeyup(e, instance) {
            e.stopImmediatePropagation();

            var combo = Combo.fromEvent(e);
            instance.handlers
                .filter(function(h) {
                    return h.eventType === 'keyup' && handlesEvent(h, instance.bindings, combo);
                }).forEach(function(h) {
                    h.handler();
                });

            return false;
        }

        return Keybindings;

    })();
})(jQuery, window);
