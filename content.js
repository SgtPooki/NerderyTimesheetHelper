(function($, root, undefined) {

    var TimeManager = {
        increase: function ($element, interval) {
            var time = $element.val() || moment().format('h:mm A');
            var increased = moment(time, 'h:mm A').add('minutes', interval || 15);
            $element.val(increased.format('h:mm A'));
        },
        decrease: function ($element, interval) {
            var time = $element.val() || moment().format('h:mm A');
            var decreased = moment(time, 'h:mm A').subtract('minutes', interval || 15);
            $element.val(decreased.format('h:mm A'));
        },
        getNextTime: function() {
            return moment().add('minutes', 15 - (now.minutes() % 15));
        },
        getNearestTime: function() {
            var now = moment();
            var diff = now.minutes() % 15;
            // If no difference, then we are already at the nearest quarter hour
            if (diff === 0) return now;
            // If the difference is greater than half of the interval, go to the next 15 minute mark
            else if (diff > 7.5) return now.add('minutes', 15 - (now.minutes() % 15));
            // If the difference is less than half of the interval, go back to the most recent 15 minute mark
            else return now.subtract('minutes', now.minutes() % 15);
        },
        shiftTimes: function ($start, $end) {
            // Get the current selected start time, or use the nearest time in it's place
            var start      = $start.val();
            var startTime  = start ? moment(start) : getNearestTime();
            // Get the current selected end time, or use the next time in it's place
            var end        = $end.val();
            var endTime    = end ? moment(end) : getNextTime();
            // Calculate the difference between the start and end
            var diffInMin  = endTime.diff(startTime, 'minutes');
            var shiftedEnd = endTime.clone().add('minutes', diffInMin);
            // Set the shifted values
            $start.val(endTime.format('h:mm A'));
            $end.val(shiftedEnd.format('h:mm A'));
            // Update the time remaining
            var $timeRemaining = $('#orig_time_remaining');
            $timeRemaining.val(parseInt($timeRemaining.val()) - diffInMin);
            updateRemainingTime();
        }
    };

    var app = {

        // App-wide configurables
        config: {
            messageDisplayTime: 1000 * 5,
        },

        // Selectors for elements used by the extension
        selectors: {
            displayMessageBefore:   '#TSEntryForm',
            ajaxLoader:             '.ajax_loading_bigdark',
            entrySave:              '.entry_save',
            notesEditor:            '.notes textarea',
            inlineEntry:            '#TSEntryInline',
            entryForm:              '#TSEntryForm',
            notes:                  '[name="notes"]',
            startTime:              '[name="start_time"]',
            endTime:                '[name="end_time"]'
        },

        // The current set of elements as jQuery objects
        elements: {
            $notes:     null,
            $startTime: null,
            $endTime:   null
        },

        // Reset selected DOM elements
        resetElements: function() {
            $notes      = $(this.selectors.notes);
            $notes      = $notes.length > 1 ? $notes.eq(1) : $notes.eq(0);
            $startTime  = $(this.selectors.startTime);
            $startTime  = $startTime.length > 1 ? $startTime.eq(1) : $startTime.eq(0);
            $endTime    = $(this.selectors.endTime);
            $endTime    = $endTime.length > 1 ? $endTime.eq(1) : $endTime.eq(0);

            this.elements.$notes     = $notes;
            this.elements.$startTime = $startTime;
            this.elements.$endTime   = $endTime;
        },

        // Are we currently editing entries?
        editing: false,

        // The current row we are editing
        $currentRow: '',
        // The currently selected row index
        currentRowIndex: -1,
        // The hash of $currentRow's original contents
        currentHash: '',

        // Entry point for the application
        start: function() {
            var self = this;

            // Restore keybindings from localStorage
            this.loadBindings();

            // Bind keybindings to all keypresses for the page
            $(root).on('keydown', function(e) { self.handleKeydown(e); });
            $(root).on('keyup',   function(e) { self.handleKeyup(e); });
            // Handle submission of the time entry form
            $(this.selectors.entryForm).on('submit', function(e) { 
                e.preventDefault();
                self.submitForm($(this)); 
                return false;
            });
        },

        // Restores bindings from localStorage
        loadBindings: function() {
            _.each(BINDINGS, function(combo, name) {
                chrome.extension.sendRequest({method: 'getLocalStorage', key: name}, function(response) {
                    if (response) {
                        BINDINGS[name] = KEYS.comboFromString(response);
                    }
                });
            });
        },

        // Handle all keypresses on the page
        // NOTE: This needs to remain light and fast, or it could slow down typing
        handleKeydown: function(e) {
            var self  = this;
            var combo = KEYS.getComboForEvent(e);
            // Fetch current elements
            this.resetElements();
            // Hilight start/end fields if their associated key combinations are meta
            if (KEYS.metaSatisfied(combo, BINDINGS.inc_start_time) || KEYS.metaSatisfied(combo, BINDINGS.dec_start_time)) {
                this.elements.$startTime.css('background-color', 'yellow');
            }
            if (KEYS.metaSatisfied(combo, BINDINGS.inc_end_time) || KEYS.metaSatisfied(combo, BINDINGS.dec_end_time)) {
                this.elements.$endTime.css('background-color', 'yellow');
            }
            // If ENTER is pressed by itself when the editor is not active, submit the time entry
            if (KEYS.isKeyPressed(KEYS.Enter, combo.keyCode) && (!combo.ctrl || !combo.meta || !combo.shift) && !self.editing) {
                console.log('Submit');
                e.preventDefault();
                // Submit entry form
                $(self.selectors.entryForm).submit();
                // Exit early
                return false;
            } 
            else {
                // Check for time modifications
                var timeUpdated = false;
                if (KEYS.isComboPressed(combo, BINDINGS.inc_start_time)) {
                    timeUpdated = true;
                    TimeManager.increase(self.elements.$startTime);
                }
                if (KEYS.isComboPressed(combo, BINDINGS.inc_end_time)) {
                    timeUpdated = true;
                    TimeManager.increase(self.elements.$endTime);
                }
                if (KEYS.isComboPressed(combo, BINDINGS.dec_start_time)) {
                    timeUpdated = true;
                    TimeManager.decrease(self.elements.$startTime);
                }
                if (KEYS.isComboPressed(combo, BINDINGS.dec_end_time)) {
                    timeUpdated = true;
                    TimeManager.decrease(self.elements.$endTime);
                }
                // If the time was updated, trigger updateRemainingTime and exit
                if (timeUpdated) {
                    updateRemainingTime(); // Mainframe function.
                    return false;
                }

                // Then check for navigation
                var changedRow = false;
                if (KEYS.isComboPressed(e, BINDINGS.inc_row)) {
                    changedRow = true;
                    self.navigateDown();
                }
                if (KEYS.isComboPressed(e, BINDINGS.dec_row)) {
                    changedRow = true;
                    self.navigateUp();
                }
                if (changedRow) {
                    self.center();
                    self.elements.$notes.focus().select();
                }

                // Lastly, look for editor commands
                if (KEYS.isKeyPressed(['Enter', 'Esc', 'Delete'], combo.keyCode)) {
                    e.preventDefault();
                    console.log('Entry editor is active.');

                    if (KEYS.isKeyPressed(KEYS.Enter, combo.keyCode)) {
                        // Save text
                        console.log('ENTER was hit and ENTRY editor is active');
                        // self.EntryEditor.saveRowIfChanged();
                    } else if (KEYS.isKeyPressed(KEYS.Esc, combo.keyCode)) {
                        // Go back to entering a new entry
                        self.cancelRow(false);
                        self.center();
                        self.elements.$notes.focus();
                    } else if (KEYS.isKeyPressed(KEYS.Delete, combo.keyCode) && combo.alt) {
                        // Delete the currently highlighted entry. (trigger click on delete button);
                        self.cancelRow();

                        var $deleteButton = self.$currentRow.find('.delete_entry');
                        var paramArray = $deleteButton.attr('href').split('(').splice(1)[0].replace(')', '').replace(', ', ',').replace(/'/gm, '').split(',');
                        var week       = paramArray[0];
                        var row        = paramArray[1];
                        var url        = url = '/timesheet.php?&week_ending=' + week + '&delete=' + row;

                        self.$currentRow.remove();
                        self.editRow();

                        $.ajax({
                            type: "GET",
                            url: url,
                            success: function (data) {
                                var $data = $(data);
                                var $message = $('<div />').text('Entry deleted!').addClass('success');
                                self.displayMessage($message);
                                self.resetRow();
                            }
                        });
                    }
                }
            }
        },

        // Handle all keyup events (primarily for cleaning up hilights, etc)
        handleKeyup: function(e) {
            if (KEYS.isKeyMeta(e.which)) {
                // Remove hilight from start/end fields when meta is removed
                if (KEYS.requiredBy(e.which, BINDINGS.inc_start_time) || KEYS.requiredBy(e.which, BINDINGS.dec_start_time)) {
                    this.elements.$startTime.css('background-color', '');
                }
                if (KEYS.requiredBy(e.which, BINDINGS.inc_end_time) || KEYS.requiredBy(e.which, BINDINGS.dec_end_time)) {
                    this.elements.$endTime.css('background-color', '');
                }
            }
        },

        // Display a message to the user
        displayMessage: function ($element) {
            $element.insertBefore(this.selectors.displayMessageBefore);
            setTimeout($element.remove, this.config.messageDisplayTime);
        },

        // Center the display on the current row
        center: function() {
            this.resetElements();
            window.scrollTo(0, this.elements.$notes.offset().top - ($(window).height() / 2));
        },
        // Handle the time entry form submission
        submitForm: function($form) {
            var self = this;
            $.ajax({
                type:     'POST',
                url:      '',
                data:     $form.serialize(),
                dataType: 'html',
                success: function (result) {
                    // Remove loading gif.
                    $('.ajax_loading_bigdark').remove();

                    // Replace save button
                    var $saveBtn = $('#save_ts_entry_button');
                    $('.entry_save').append($saveBtn);

                    $result = $(result);

                    var $errors = $result.find('.error');
                    if ($errors.length > 2) {
                        var $errorMessage = $result.find('.error').first();
                        self.displayMessage($errorMessage);
                    }
                    else {
                        // Let Nerd know their time was saved properly!
                        var $successMessage = $('<div />').text('Entry saved!').addClass('success');
                        self.displayMessage($successMessage);
                        // Shift the times forward
                        TimeManager.shiftTimes(self.elements.$startTime, self.elements.$endTime);
                        // Reset the time entry notes field
                        self.elements.$notes.val('');
                        // Update the inline entry html
                        $('#TSEntryInline').html($result.find('#TSEntryInline').html());
                    }
                }
            });
        },
        // Submit the currently edited row's data
        saveChanges: function () {
            var self = this;
            var url  = $.trim(window.location.pathname);
            var data = this.$currentRow.find(':input:not(.unflag_input)').serializeArray();

            $.ajax({
                type:     'POST',
                dataType: 'html',
                url:      url,
                data:     data,
                success: function (data) {

                    $data = $(data);

                    var $errors = $data.find('.error');
                    if ($errors.length > 2) {
                        var $errorMessage = $data.find('.error').first();
                        self.displayMessage($errorMessage);
                    }
                    else {
                        // Let Nerd know their time was saved properly!
                        var $successMessage = $('<div />').text('Entry saved!').addClass('success');
                        self.displayMessage($successMessage);
                        self.replaceEntryHtml($data);
                    }
                }
            });
        },
        // Reset the currently selected row's data
        resetRow: function($data) {
            if (this.currentRowIndex > -1) {
                var savedText = this.$currentRow.find(this.selectors.notesEditor).val();
                this.cancelRow(false);
                $(this.selectors.inlineEntry).html($data.find(this.selectors.inlineEntry).html());
                this.editRow();
                var $textBox = this.$currentRow.find('.notes textarea');
                $textBox.focus();
                $textBox.val(savedText);
                this.center();
            }
        },
        // Generate a hash of the row's contents for change tracking
        hashRow: function() {
            if (this.editing) {
                return this.$currentRow.find('input, textarea').reduce(function(acc, el) {
                    return acc + $(el).val();
                }, '');
            } else return '';
        },
        // Enable/Disable input on the current row
        disableCurrentRow: function() {
            this.$currentRow.children('input').attr('disabled', 'disabled');
        },
        enableCurrentRow: function() {
            this.$currentRow.children('input').removeAttr('disabled');
        },
        // Begin editing the selected row
        editRow: function($row){
            this.editing = true;
            if (this.currentRowIndex === -1) {
                $row = null;
            } else {
                $row = $row || $('.entry_row').eq(this.currentRowIndex);
                this.$currentRow = $row;
            }

            if (this.$currentRow) {
                this.$currentRow.find('.edit_entry').trigger('click');
                this.$currentRow.find('#notes').focus().select();
                this.currentHash = this.hashRow();
            }
        },
        // Cancel edits on the selected row
        cancelRow: function(save) {
            // If save is not provided, or is truthy, then save changes
            save = typeof save === 'undefined' ? true : save || false;
            if (this.$currentRow) {
                // Save changes if there are any
                if (save && this.editing && this.currentHash !== this.hashRow()) {
                    this.saveChanges();
                }

                // Pull inline editor changes over to readonly display
                var tempText = this.$currentRow.find('.inline_text_edit').val();
                // Cancel editing
                this.$currentRow.find('.cancel_edit').trigger('click');
                // Set the notes text with text from the inline editor
                this.$currentRow.find('td.notes').text(tempText);

                // Reset internal state
                this.editing = false;
                this.currentRowIndex = -1;
                this.currentHash = '';
                this.$currentRow = null;
            }
        },
        // Row navigation
        navigateDown: function() {
            // Cancel current edits
            this.cancelRow();

            var maxRows = $('.entry_row').length;
            if (this.currentRowIndex + 1 >= maxRows) {
                this.currentRowIndex = maxRows - 1;
            } else {
                this.currentRowIndex++;
                this.editRow();
            }
        },
        navigateUp: function() {
            // Cancel current edits
            this.cancelRow();

            if (this.currentRowIndex - 1 < 0) {
                this.currentRowIndex = 0;
            } else {
                this.currentRowIndex--;
                this.editRow();
            }
        },

    };

    if (!BINDINGS || !KEYS) {
        console.log('Unable to load keybindings.js. Timesheet helper is unable to continue.');
    } else {
        app.start();
    }


})(jQuery, window);