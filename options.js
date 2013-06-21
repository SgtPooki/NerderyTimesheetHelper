(function($) {

    var options = {

        keybinder: new Keybindings(),

        elements: {
            $status:   $('#status'),
            $form:     $('form'),
            $keybinds: $('input[data-keybinder]')
        },

        // Notifications
        success: function(message) {
            this.elements.$status.removeClass('success error').addClass('success');
            this.elements.$status.html(message).fadeIn('fast').delay(1000).fadeOut('fast');
        },
        error: function(message) {
            this.elements.$status.removeClass('success error').addClass('error');
            this.elements.$status.html(message).fadeIn('fast').delay(1000).fadeOut('fast');
            // Show debugging info if provided
            if (arguments.length > 1) {
                toolbox.log.debug(toolbox.slice(arguments, 1));
            }
        },

        // Persistence
        // Saves options to localStorage.
        save: function() {
            localStorage['Keybindings'] = this.keybinder.serialize();
            this.success('Options Saved.');
        },
        // Restores options from localStorage
        restore: function() {
            var restored = localStorage['Keybindings'];
            if (restored) {
                this.keybinder.deserialize(restored);
            }

            // Display keybindings
            this.keybinder.bindings.forEach(function(binding) {
                var $input = $('#' + binding.name);
                $input.val(binding.combo.toString());
            });
        },

        init: function() {
            var self = this;

            // Set up default option values
            this.loadDefaults();

            // Restore persisted options over the top of the defaults
            this.restore();

            // When form is submitted, save options
            this.elements.$form.on('submit', function(e) {
                e.preventDefault();
                self.save();
            });

            // Wire up key bind input fields
            this.elements.$keybinds.on('keydown', function(e) {
                self.bindKeys(e, $(this));
            });
        },

        loadDefaults: function() {
            var self = this;
            // Load default keybindings from name and data-default-bind attributes on data-keybinder inputs
            this.elements.$keybinds.each(function(_, input) {
                var $input   = $(input);
                var name     = $input.attr('name');
                var comboStr = $input.attr('data-default-bind');
                if (name && comboStr) {
                    self.keybinder.add(name, Combo.fromString(comboStr));
                }
            });
        },

        bindKeys: function(e, $element) {
            // Get the current key combo
            var combo = Combo.fromEvent(e);

            // On ESC or BACKSPACE, clear the input
            if (Keys.isKeyPressed([ Keys.Esc, Keys.Backspace ], e.which) && !combo.containsMetaKeys()) {
                $element.val('');
            }
            // Allow normal tab behavior
            else if (Keys.isKeyPressed(Keys.Tab, e.which) && !combo.containsMetaKeys(combo)) {
                return;
            }
            // Otherwise, bind the current key combination
            else {
                var name = $element.attr('name');
                // Create new binding or update the current keybinding
                this.keybinder.add(name, combo);
                // Display new binding
                $element.val(combo.toString());
            }
            return false;
        }
    };

    // Bootstrap options app
    options.init();

})(jQuery);