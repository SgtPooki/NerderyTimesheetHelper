/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(2);
	__webpack_require__(3);
	module.exports = __webpack_require__(4);


/***/ },
/* 1 */,
/* 2 */
/***/ function(module, exports) {

	/* global moment */
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
	        shiftTimes: function (startTime, endTime) {
	            // If start/end times are provided, use them
	            // Otherwise, use the currently selected start time, or
	            // the nearest time block from now as a final fallback
	            if (startTime === undefined) {
	                var start  = app.elements.$startTime.val();
	                startTime  = start ? moment(start, 'h:mm A') : getNearestTime();
	            }
	            if (endTime === undefined) {
	                // Get the current selected end time, or use the next time in it's place
	                var end = app.elements.$endTime.val();
	                endTime = end ? moment(end, 'h:mm A') : getNextTime();
	            }
	            // Calculate the difference between the start and end
	            var diffInMin  = endTime.diff(startTime, 'minutes');
	            var shiftedEnd = endTime.clone().add('minutes', diffInMin);
	            // Set the shifted values
	            app.elements.$startTime.val(endTime.format('h:mm A'));
	            app.elements.$endTime.val(shiftedEnd.format('h:mm A'));
	            // Update the time remaining
	            var $timeRemaining    = $('#orig_time_remaining');
	            var origTimeRemaining = parseFloat($timeRemaining.val());
	            var duration          = moment.duration(origTimeRemaining * 60 - diffInMin, 'minutes');
	            var hours             = duration.hours();
	            var hourFraction      = parseFloat((duration.minutes() / 60).toPrecision(2));
	            var totalDiff         = hours + hourFraction;
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
	            var $notes      = $(this.selectors.notes);
	            $notes          = $notes.length > 1 ? $notes.eq(1) : $notes.eq(0);
	            var $startTime  = $(this.selectors.startTime);
	            $startTime      = $startTime.length > 1 ? $startTime.eq(1) : $startTime.eq(0);
	            var $endTime    = $(this.selectors.endTime);
	            $endTime        = $endTime.length > 1 ? $endTime.eq(1) : $endTime.eq(0);

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

	            // Bind DOM elements
	            this.resetElements();

	            // Bind keybindings to all keypresses for the page
	            $(root).on('keydown', function(e) { self.handleKeydown(e); });
	            $(root).on('keyup',   function(e) { self.handleKeyup(e); });
	            // Handle submission of the time entry form
	            $(root.document).on('submit', this.selectors.entryForm, function (e) {
	                e.preventDefault();
	                self.submitForm($(this)); 
	                return false;
	            });
	            // Intercept deletes in order to perform them asynchronously
	            $(root.document).on('click', this.selectors.deleteRow, function (e) {
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

	            this.resetTimeEntry();
	        },

	        // Bind the start/end and project fields based on the most recent entry, and focus on the notes field
	        resetTimeEntry: function() {
	            var entries             = $('.entry_row');
	            var $mostRecentEntry    = entries.first();
	            var mostRecentStartTime = $('.start_time', $mostRecentEntry).text();
	            var mostRecentEndTime   = $('.end_time', $mostRecentEntry).text();
	            mostRecentStartTime     = moment(mostRecentStartTime, 'h:mmA');
	            mostRecentEndTime       = moment(mostRecentEndTime, 'h:mmA');
	            TimeManager.shiftTimes(mostRecentStartTime, mostRecentEndTime);

	            // Current entry work order elements
	            var $workOrder = $('#time_entry_table').find('.entry_wo');
	            var $billTo    = $('#bill_to', $workOrder);
	            var $client    = $('#client',  $workOrder);
	            var $project   = $('#project', $workOrder);

	            // Most recent entry work order values
	            var lastClient  = $mostRecentEntry.find('.client a').text();
	            var lastProject = $mostRecentEntry.find('.project a').text();

	            // Update work order
	            $billTo.val(lastClient + ' ' + lastProject);
	            $client.val(lastClient);
	            $project.val(lastProject);

	            // Focus on the notes field
	            $('#time_entry_table').find('#notes').focus();
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
	                    this.updateRemainingTime();
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
	            var warning = $('<tr class="gap_detection"><td colspan="8">' + timeRange + ':Take a break? Cool. Otherwise, <a href="javascript:fillTimesheetGap(' + params + ')">fill your timesheet</a>.</td></tr>');
	            $row.after(warning);
	        },
	        // Center the display on the current row
	        center: function() {
	            this.resetElements();
	            window.scrollTo(0, this.elements.$notes.offset().top - ($(window).height() / 2));
	        },
	        refreshTimeEntries: function(html, deleting) {
	            var self = this;

	            deleting = deleting || false;

	            if (html) {
	                $('#TSEntryInline').html(html);
	            }

	            this.resetElements();

	            var entries = $('.entry_row');
	            // Starts at the most recent and goes backwards through time
	            _.each(entries, function(entry, i) {
	                var $entry = $(entry);

	                var startTime = moment($('.start_time', $entry).text(), 'h:mmA');
	                var endTime   = moment($('.end_time', $entry).text(), 'h:mmA');

	                // We don't need to do anything if this is the last entry
	                if (i + 1 < entries.length) {
	                    var $previousEntry = $(entries[i + 1]);
	                    var prevStart = moment($('.start_time', $previousEntry).text(), 'h:mmA');
	                    var prevEnd   = moment($('.end_time', $previousEntry).text(), 'h:mmA');

	                    var overlapped = false;
	                    if (startTime.isAfter(prevStart) && startTime.isBefore(prevEnd))
	                        overlapped = true;
	                    else if (startTime.isBefore(prevStart) && endTime.isAfter(prevStart))
	                        overlapped = true;

	                    // Cannot be overlapped and gapped at the same time
	                    if (overlapped && !$entry.next().hasClass('.gap_detection')) {
	                        self.showOverlapWarning($entry);
	                    } else {
	                        // Determine if there is a gap
	                        var difference = startTime.diff(prevEnd, 'minutes');
	                        // Less than 15 minutes we can safely ignore
	                        if (difference > 15 && !$entry.next().hasClass('.gap_detection')) {
	                            self.showGapWarning($entry, prevEnd, startTime);
	                        }
	                    }
	                }
	            });

	            // Update total hours in time entry table for the current day
	            var todaysHours    = 0.0;
	            var $todaysEntries = $('#time_entries thead').first();
	            _.each($todaysEntries.next().find('.entry_row'), function(entry) {
	                var $entry    = $(entry);
	                var startTime = moment($('.start_time', $entry).text(), 'h:mmA');
	                var endTime   = moment($('.end_time', $entry).text(), 'h:mmA');

	                // Calculate the duration and increment totalHours
	                var duration          = moment.duration(startTime.diff(endTime));
	                var hours             = duration.hours();
	                var hourFraction      = parseFloat((duration.minutes() / 60).toPrecision(2));
	                var totalDiff         = hours + hourFraction;
	                todaysHours += totalDiff;
	            });
	            $('#time_entries thead').first().children('.day_of_week').find('span').text(todaysHours + ' hours');

	            // If deleting, then set the start/end time relative to the most recent entry
	            if (deleting) {
	                var $mostRecentEntry    = entries.first();
	                var mostRecentStartTime = $('.start_time', $mostRecentEntry).text();
	                var mostRecentEndTime   = $('.end_time', $mostRecentEntry).text();
	                mostRecentStartTime     = moment(mostRecentStartTime, 'h:mmA');
	                mostRecentEndTime       = moment(mostRecentEndTime, 'h:mmA');
	                TimeManager.shiftTimes(mostRecentStartTime, mostRecentEndTime);
	            }
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
	                    self.refreshTimeEntries(null, true);
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
	                        TimeManager.shiftTimes();
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

/***/ },
/* 3 */
/***/ function(module, exports) {

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


/***/ },
/* 4 */
/***/ function(module, exports) {

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

/***/ }
/******/ ]);