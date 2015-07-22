(function($) {

    // Notifications
    var $status = $('#status');
    function success(message) {
        $status.removeClass('success error');
        $status.addClass('success');
        $status.html(message).fadeIn('fast').delay(1000).fadeOut('fast');
    }
    function error(message) {
        $status.removeClass('success error').addClass('error').html(message).fadeIn('fast').delay(1000).fadeOut('fast');
    }

    // Saves options to localStorage.
    function save() {
        // Update stored options
        _.each(BINDINGS, function(combo, name) {
            localStorage[name] = KEYS.getComboString(combo);
        });

        success('Options Saved.');
    }

    // Restores options from localStorage
    function restore() {
        _.each(BINDINGS, function(combo, name) {
            var comboString = localStorage[name];
            if (comboString) {
                BINDINGS[name] = KEYS.comboFromString(comboString);
            }
        });
        // Display keybindings
        _.each(BINDINGS, function(combo, name) {
            var $input = $('#' + name);
            $input.val(KEYS.getComboString(combo));
        });
    }

    // On load, restore options if they were previously stored
    restore();

    // When form is submitted, save options
    $('form').on('submit', function(e) {
        e.preventDefault();
        save();
    });

    // Wire up key bind input fields
    $('input[data-keybinder]').on('keydown', function(e) {
        // Get the current key combo
        var combo = KEYS.getComboForEvent(e);

        // On ESC or BACKSPACE, clear the input
        if (combo.keyCode === KEYS.Esc || combo.keyCode === KEYS.Backspace) {
            $(this).val('');
            // Allow normal tab behavior
        } else if (combo.keyCode === KEYS.Tab) {
            return;
        // Otherwise, bind the current key combination
        } else {
            // Update current keybinding
            BINDINGS[$(this).attr('name')] = combo;
            // Display new binding
            $(this).val(KEYS.getComboString(combo));
        }
        return false;
    });

})(jQuery);