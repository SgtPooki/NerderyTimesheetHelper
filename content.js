(function($, root, undefined) {

    // Delay the execution of a function by a set time
    function delay(func, time) {
        var timeout = null;
        timeout = setTimeout(function() { 
            func(); 
            timeout = null; 
        }, time || 100);
    }

    var app = {};

    var TimeManager = {
        getTimeFromElement: function($el) {
            var time = $el.val() || moment().format('h:mm A');
            return moment(time, 'h:mm A');
        },
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
        getNextTime: function(relativeFrom) {
            if (relativeFrom) {
                return relativeFrom.clone().add('minutes', 15);
            } else {
                var now = moment();
                return moment().add('minutes', 15 - (now.minutes() % 15));
            }
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
            var startTime  = start ? moment(start, 'h:mm A') : getNearestTime();
            // Get the current selected end time, or use the next time in it's place
            var end        = $end.val();
            var endTime    = end ? moment(end, 'h:mm A') : getNextTime();
            // Calculate the difference between the start and end
            var diffInMin  = endTime.diff(startTime, 'minutes');
            var shiftedEnd = endTime.clone().add('minutes', diffInMin);
            // Set the shifted values
            $start.val(endTime.format('h:mm A'));
            $end.val(shiftedEnd.format('h:mm A'));
            // Update the time remaining
            var $timeRemaining  = $('#orig_time_remaining');
            var origTimeRemaining = parseFloat($timeRemaining.val());
            var duration        = moment.duration(origTimeRemaining * 60 - diffInMin, 'minutes');
            var hours           = duration.hours();
            var hourFraction    = parseFloat((duration.minutes() / 60).toPrecision(2));
            var totalDiff       = hours + hourFraction;
            // Calculate the new time remaining
            var newTimeRemaining  = origTimeRemaining - totalDiff;
            $timeRemaining.val(newTimeRemaining);
            app.updateRemainingTime();
        }
    };

    app = {

        // App-wide configurables
        config: {
            messageDisplayTime: 1000 * 2,
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
            endTime:                '[name="end_time"]',
            deleteRow:              'a.delete_entry'
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
            // Intercept deletes in order to perform them asynchronously
            $(this.selectors.deleteRow).on('click', function(e) {
                e.stopImmediatePropagation();

                var re       = /deleteRow\('(.+)', '([\w]+)\*([\d\w]+)'\)/;
                var parsed   = re.exec($(this).attr('href'));
                var tr       = $(this).parents('tr')
                var deleting = {
                    date:     parsed[1],
                    user:     parsed[2],
                    id:       parsed[3],
                    elements: [ tr ]
                };

                // Delete any gap warnings between this entry and the next in the list
                tr.nextUntil('.entry_row').map(function(i, el) {
                    if ($(el).hasClass('gap_detection')) {
                        deleting.elements.push($(el));
                    }
                });

                self.deleteEntry(deleting);

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
                    this.updateRemainingTime(); // Mainframe function.
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
            var self = this;
            $element.hide().insertBefore(this.selectors.displayMessageBefore).slideDown('fast');
            delay(function() {
                $element.slideUp('fast');
                delay(function() { $element.remove(); }, self.config.messageDisplayTime);
            }, this.config.messageDisplayTime);
        },
        showOverlapWarning: function($row) {
            var warning = $('<tr class="gap_detection"><td colspan="8">Timesheet overlap detected. Double-check your work, and fix if needed.</td></tr>');
            $row.after(warning);
        },
        showGapWarning: function($row, startTime, endTime) {
            var day = moment().format('dddd');
            var timeRange = startTime.format('h:mmA') + ' to ' + endTime.format('h:mmA');
            var params = '\'' + startTime.format('h:mmA') + '\', \'' + endTime.format('h:mmA') + '\', \'' + day + '\'';
            var warning = $('<td colspan="8">' + timeRange + ':Take a break? Cool. Otherwise, <a href="javascript:fillTimesheetGap(' + params + ')">fill your timesheet</a>.</td>');
            $row.after(warning);
        },
        // Center the display on the current row
        center: function() {
            this.resetElements();
            window.scrollTo(0, this.elements.$notes.offset().top - ($(window).height() / 2));
        },
        refreshTimeEntries: function(html) {
            var self = this;

            if (html) {
                $('#TSEntryInline').html(html);
            }

            var entries = $('.entry_row');
            // Starts at the most recent and goes backwards through time
            _.each(entries, function(i, entry) {
                var $entry = $(entry);

                var startTime = moment($('.start_time', $entry).text(), 'h:mmA');
                var endTime   = moment($('.end_time', $entry).text(), 'h:mmA');

                // We don't need to do anything if this is the last entry
                if (i + 1 < entries.length) {
                    var $previousEntry = $(entries[i + 1]);
                    var prevStart = moment($('.start_time', $previousEntry), 'h:mmA');
                    var prevEnd   = moment($('.end_time', $previousEntry), 'h:mmA');

                    var overlapped = false;
                    if (startTime.isAfter(prevStart) && startTime.isBefore(prevEnd))
                        overlapped = true;
                    else if (startTime.isBefore(prevStart) && endTime.isAfter(prevStart))
                        overlapped = true;

                    // Cannot be overlapped and gapped at the same time
                    if (overlapped) {
                        self.showOverlapWarning($entry);
                    } else {
                        // Determine if there is a gap
                        var difference = startTime.diff(prevEnd, 'minutes');
                        // Less than 15 minutes we can safely ignore
                        if (difference > 15) {
                            self.showGapWarning($entry, prevEnd, startTime);
                        }
                    }
                }
            });

            // Set the start time and end time relative to the most recent entry
            var $first = entries.first();
            var start = $('.start_time', $first);
            var startTime = $('.start_time', $first).val();
            console.log('start', start, startTime);
            var newStart = moment(startTime, 'h:mmA');
            var newEnd  = TimeManager.getNextTime(newStart);
            $('#start_time2').val(newStart.format('h:mmA'));
            $('#end_time2').val(newEnd.format('h:mmA'));
        },
        // Delete a time entry row asynchronously
        deleteEntry: function(deleting) {
            var self = this;
            var del = deleting.user + '*' + deleting.id;
            var url = '/timesheet.php?ts_user=' + deleting.user + '&week_ending=' + deleting.date + '&delete=' + del;
            $.ajax({
                type: 'POST',
                url:  url,
                dataType: 'html',
                success: function() {
                    deleting.elements.map(function(el) {
                        el.remove();
                    });
                    self.refreshTimeEntries();
                }
            });
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
                        self.refreshTimeEntries($result.find('#TSEntryInline').html());
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
                        console.log($data);
                        this.$currentRow.html($data);
                        //self.replaceEntryHtml($data);
                        self.refreshTimeEntries();
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
        // Update the display of remaining time on the current work order
        updateRemainingTime: function() {
            // Elements
            var currentProject    = $('#project').val();
            var $woInfoRemaining  = $('#time_entry_table #time_remaining');
            var $woTableRemaining = $('#' + currentProject).prevUntil('tr').filter(function(i, el) {
                return $(el).html().indexOf('hours') > -1;
            });
            // Get the original time remaining value
            var $origTime         = $('#orig_time_remaining');
            var origTimeRemaining = parseFloat($origTime.val());
            // Get the start and end times as moments
            var startTime         = TimeManager.getTimeFromElement(this.elements.$startTime);
            var endTime           = TimeManager.getTimeFromElement(this.elements.$endTime);
            // Calculate the duration of the difference between start and end time
            var duration          = moment.duration(endTime.diff(startTime));
            // Determine the hours, fraction of an hour, and the total in hours, of the duration
            var hours             = duration.hours();
            var hourFraction      = parseFloat((duration.minutes() / 60).toPrecision(2));
            var totalDiff         = hours + hourFraction;
            // Calculate the new time remaining
            var newTimeRemaining  = origTimeRemaining - totalDiff;
            // Set Work Order Information to the fractional difference
            $woInfoRemaining.text(newTimeRemaining);
            // Set Work Order table Remaining column to the humanized difference
            $woTableRemaining.text(Math.round(newTimeRemaining) + ' hours');
        }
    };

    if (!BINDINGS || !KEYS) {
        console.log('Unable to load keybindings.js. Timesheet helper is unable to continue.');
    } else {
        app.start();
    }


})(jQuery, window);