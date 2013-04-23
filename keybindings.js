var KEYS = {
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
    'Enter': 13,
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
    getNameFor: function(which) {
        for (key in this) {
            //console.log(key);
            var keycode = this[key]
            if ((typeof keycode === 'number') && which === keycode) {
                return key;
            }
        }

        return null;
    },
    // Get the keycode for the name provided
    getCodeFor: function(key) {
        return this[key];
    },
    /* Determine if the provided key was pressed
     * key: The expected key (can be either a keycode or the letter)
     * which: The keyCode (from e.which) of the currently pressed key
     */
    isKeyPressed: function(key, which) {
        var self = this;
        if (typeof key === 'string') {
            return which === this.getCodeFor(key);
        } else if (typeof key === 'number') {
            return which === key;
        } else if (key && key.constructor.name === 'Array') {
            // Map each key to it's keyCode, and check for the presence of `which`
            return key.map(function(k) {
                if (typeof k === 'string') return self.getCodeFor(k);
                else return k;
            }).indexOf(which) > -1;
        } else {
            // Not a number or string? Not a valid keycode
            return false;
        }
    },
    // Determine if the provided combo was pressed
    isComboPressed: function (combo, binding) {
        if (!combo || !binding) return false;

        // If the key itself is the same, we just have to ensure the expected meta key is pressed
        if (binding.keyCode !== combo.keyCode) return false;
        if (binding.shift && !combo.shift) return false;
        if (binding.alt && !combo.alt) return false;
        if (binding.ctrl && !combo.ctrl) return false;
        if (binding.meta && !combo.meta) return false;
        else return true;
    },
    // Return true if the provided key is a meta key
    isKeyMeta: function(keyCode) {
        switch (keyCode) {
            case this.CTRL:
            case this.SHIFT:
            case this.ALT:
            case this.META:
            case this.META_RIGHT:
                return true;
            default:
                return false;
        }
    },
    // Return an empty combo object
    getEmptyCombo: function() {
        return {
            shift:   false,
            alt:     false,
            meta:    false,
            ctrl:    false,
            keyCode: 0,
        };
    },
    // Given a keypress event, get the keycombo it contains
    getComboForEvent: function(e) {
        var combo = this.getEmptyCombo();
        combo.shift   = e.shiftKey || false;
        combo.alt     = e.altKey   || false;
        combo.meta    = e.metaKey  || false;
        combo.ctrl    = e.ctrlKey  || false;
        combo.keyCode = e.which    || 0;
        return combo;
    },
    // Create a new key combination
    newCombo: function(keyCode, meta) {
        var combo = KEYS.getEmptyCombo();
        meta = meta || [];
        if (typeof keyCode === 'string')
            combo.keyCode = this.getCodeFor(keyCode);
        else
            combo.keyCode = keyCode || 0;
        combo.shift   = meta.indexOf('shift') > -1
        combo.ctrl    = meta.indexOf('ctrl') > -1
        combo.alt     = meta.indexOf('alt') > -1
        combo.meta    = meta.indexOf('meta') > -1
        return combo;
    },
    // Pretty print the provided combo
    getComboString: function(combo) {
        var meta = (combo.ctrl  ? 'CTRL+'  : '') + 
                   (combo.alt   ? 'ALT+'   : '') +
                   (combo.shift ? 'SHIFT+' : '') +
                   (combo.meta  ? 'META+'  : '');
        return meta + (this.getNameFor(combo.keyCode) || '');
    },
    // Reverse of getComboString, you should get the original combo if you call comboFromString(getComboString)
    comboFromString: function(str) {
        var parts     = str.split('+');
        var combo     = this.getEmptyCombo();
        combo.keyCode = this.getCodeFor(parts[parts.length - 1]);
        combo.ctrl    = parts.indexOf('CTRL') > -1;
        combo.alt     = parts.indexOf('ALT') > -1;
        combo.shift   = parts.indexOf('SHIFT') > -1;
        combo.meta    = parts.indexOf('META') > -1;
        return combo;
    },
    // Check if a key combo requires the presence of the provided key
    requiredBy: function(keyCode, combo) {
        if (combo.keyCode === keyCode)
            return true;
        else if (combo.ctrl && keyCode === this.CTRL)
            return true;
        else if (combo.shift && keyCode === this.SHIFT)
            return true;
        else if (combo.alt && keyCode === this.ALT)
            return true;
        else if (combo.meta && (keyCode === this.META || keyCode === this.META_RIGHT))
            return true;
        else return false;
    },
    // Check to see if the provided combo satisfies all the meta requirements for the provided binding combo
    metaSatisfied: function(currentCombo, binding) {
        if (binding.ctrl && !currentCombo.ctrl)
            return false;
        else if (binding.shift && !currentCombo.shift)
            return false;
        else if (binding.alt && !currentCombo.alt)
            return false;
        else if (binding.meta && !currentCombo.meta)
            return false;
        else return true;
    }
};

var BINDINGS = {
    'inc_start_time': KEYS.newCombo('Up',   ['shift']),
    'dec_start_time': KEYS.newCombo('Down', ['shift']),
    'inc_end_time':   KEYS.newCombo('Up',   ['ctrl']),
    'dec_end_time':   KEYS.newCombo('Down', ['ctrl']),
    'inc_row':        KEYS.newCombo('Up',   ['alt']),
    'dec_row':        KEYS.newCombo('Down', ['alt'])
};
