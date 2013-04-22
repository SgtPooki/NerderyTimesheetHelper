$(function() {

    // Options we want to store
    var options = {
        "keybindings": [
            "inc_start_time": newCombo(KEYS.getCodeFor('UP'),   ["shift"]),
            "dec_start_time": newCombo(KEYS.getCodeFor('DOWN'), ["shift"]),
            "inc_end_time":   newCombo(KEYS.getCodeFor('UP'),   ["ctrl"]),
            "dec_end_time":   newCombo(KEYS.getCodeFor('DOWN'), ["ctrl"])
        ]
    };

    // Notifications
    var $status = $('#status');
    function success(message) {
        $status.removeClass('success error').addClass('success').html(message).fadeIn('fast').delay(1000).fadeOut('fast');
    }
    function error(message) {
        $status.removeClass('success error').addClass('error').html(message).fadeIn('fast').delay(1000).fadeOut('fast');
    }

    // Saves options to localStorage.
    function save() {
        var select = document.getElementById("color");
        var color = select.children[select.selectedIndex].value;

        // Update stored options
        localStorage["options"] = options;

        success('Options Saved.');
    }

    // Restores options from localStorage
    function restore() {
        var restored = localStorage["options"];
        if (restored) {
            options = restored;
            // Display keybindings
            _.each(options.keybindings, function(combo, name) {
                var $input = $('#' + name);
                $input.val(KEYS.getComboString(combo));
            });
        }
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
            options.keybindings[$(this).attr('name')] = combo;
            $(this).val(meta + (KEYS.getNameFor(combo.keyCode) || ''));
        }
        return false;
    });

});