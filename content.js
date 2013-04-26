(function($, root, undefined) {

    // Delay the execution of a function by a set time
    function delay(func, time) {
        var timeout = null;
        timeout = setTimeout(function() { 
            func(); 
            clearTimeout(timeout);
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
            // We've rolled over to the next day
            if (shiftedEnd.isBefore(endTime)) {
                shiftedEnd.add(1, 'days');
            }
            // Set the shifted values
            app.elements.$startTime.val(endTime.format('h:mm A'));
            app.elements.$endTime.val(shiftedEnd.format('h:mm A'));
        },
        // Gets a duration in minutes as XX.XX hours, i.e. 12.75
        getMinutesAsFractionalTime: function(minutes) {
            var duration          = moment.duration(minutes, 'minutes');
            var hours             = duration.hours();
            var hourFraction      = parseFloat((duration.minutes() / 60).toPrecision(2));
            return hours + hourFraction;
        },
        // Gets the difference between a start and end time as XX.XX hours, i.e. 12.75
        getDiffAsFractionalTime: function(startTime, endTime) {
            var duration          = moment.duration(endTime.diff(startTime));
            var hours             = duration.hours();
            var hourFraction      = parseFloat((duration.minutes() / 60).toPrecision(2));
            return hours + hourFraction;
        },
        setTotalRecordedTime: function(hours) {
            var $recordedInfo = $('#info_bar').find('.ts_recorded'),
                $headline     = $recordedInfo.find('.ts_headline'),
                $caption      = $recordedInfo.find('.caption'),
                contents      = $recordedInfo.contents();
            contents.slice(contents.index($headline) + 1, contents.index($caption)).remove();
            $headline.after(hours);
        },
        getProjectRemainingTime: function(project) {
            var $woTableRemaining = $('#' + project).prevUntil('tr').filter(function(i, el) {
                return $(el).html().indexOf('hours') > -1;
            });
            return parseFloat(_.first($woTableRemaining.text().split(' ')));
        },
        setProjectRemainingTime: function(project, remaining) {
            var $woTableRemaining = $('#' + project).prevUntil('tr').filter(function(i, el) {
                return $(el).html().indexOf('hours') > -1;
            });
            $woTableRemaining.text(remaining + ' hours');
        },
        getTimeEntries: function() {
            var entries = $('.entry_row');
            return entries;
        },
        getMostRecentEntry: function(entries) {
            entries = entries || this.getTimeEntries();
            return $(_.first(entries));
        },
        getMostRecentStartTime: function(entry) {
            entry = entry || this.getMostRecentEntry();
            var mostRecentStartTime = $('.start_time', entry).text();
            return moment(mostRecentStartTime, 'h:mmA');
        },
        getMostRecentEndTime: function(entry) {
            entry = entry || this.getMostRecentEntry();
            var mostRecentEndTime   = $('.end_time', entry).text();
            return moment(mostRecentEndTime, 'h:mmA');
        },
        incrementRemainingProjectTime: function(project, amount) {
            project = project || $('#project').val();

            // Get the original time remaining value
            var origTimeRemaining = this.getProjectRemainingTime(project);
            var newTimeRemaining = origTimeRemaining + amount;
            this.setProjectRemainingTime(project, newTimeRemaining);
        },
        decrementRemainingProjectTime: function (project, amount) {
            project = project || $('#project').val();

            var origTimeRemaining = this.getProjectRemainingTime(project);
            var newTimeRemaining = origTimeRemaining - amount;
            this.setProjectRemainingTime(project, newTimeRemaining);
        },
        incrementRemainingWorkOrderTime: function(project, amount) {
            project = project || $('#project').val();

            var origTimeRemaining = this.getProjectRemainingTime(project);
            var $woInfoRemaining  = $('#time_entry_table #time_remaining');
            $woInfoRemaining.text(origTimeRemaining + amount);
        },
        decrementRemainingWorkOrderTime: function(project, amount) {
            project = project || $('#project').val();

            var origTimeRemaining = this.getProjectRemainingTime(project);
            var $woInfoRemaining  = $('#time_entry_table #time_remaining');
            $woInfoRemaining.text(origTimeRemaining - amount);
        },
        predictProjectTimeDeduction: function(project) {
            project = project || $('#project').val();
            // Get the start and end times as moments
            var startTime         = this.getTimeFromElement(app.elements.$startTime);
            var endTime           = this.getTimeFromElement(app.elements.$endTime);
            // Roll over to the next day if the end is 'before' the start
            if (endTime.isBefore(startTime)) {
                endTime.add(1, 'days');
            }
            var diff = this.getDiffAsFractionalTime(startTime, endTime);
            return diff;
        },
        areTimesOverlapped: function(prevStart, prevEnd, startTime, endTime) {
            if (startTime.isAfter(prevStart) && startTime.isBefore(prevEnd))
                return true;
            else if (startTime.isBefore(prevStart) && endTime.isAfter(prevStart))
                return true;
            else return false;
        },
        sumAllEntries: function(entries, filter) {
            entries = entries || this.getTimeEntries();
            return this._sumEntries(entries, filter);
        },
        sumTodaysEntries: function(entries, filter) {
            entries = entries || $('#time_entries thead').first().next().find('.entry_row');
            return this._sumEntries(entries, filter);
        },
        _sumEntries: function(entries, filter) {
            filter  = filter || function(entry) { return true; };

            var self  = this;
            var total = 0.0;
            entries = _.filter(entries, filter);
            _.each(entries, function(entry) {
                var $entry    = $(entry);
                var startTime = self.getMostRecentStartTime($entry);
                var endTime   = self.getMostRecentEndTime($entry);
                // Roll over to the next day if the end is before the start
                if (endTime.isBefore(startTime)) {
                    endTime.add(1, 'days');
                }

                // Calculate the duration and increment totalHours
                total += self.getDiffAsFractionalTime(startTime, endTime);
            });
            return total;
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

        // Are we currently selecting an entry
        selecting: false,

        // The current row we've selected
        $currentRow: null,
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
            var $mostRecentEntry    = TimeManager.getMostRecentEntry();
            var mostRecentStartTime = TimeManager.getMostRecentStartTime($mostRecentEntry);
            var mostRecentEndTime   = TimeManager.getMostRecentStartTime($mostRecentEntry);
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
            $billTo.focus();

            // Update predicted work time
            var predicted = TimeManager.predictProjectTimeDeduction();
            TimeManager.decrementRemainingWorkOrderTime(predicted);

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
            // If ENTER is pressed by itself when not navigationg or not editing, submit the time entry
            if (!self.selecting && !self.editing && KEYS.isKeyPressed(KEYS.Enter, combo.keyCode) && (!combo.ctrl || !combo.meta || !combo.shift) && !self.editing) {
                e.preventDefault();
                // Submit entry form
                $(self.selectors.entryForm).submit();
                // Exit early
                return false;
            } 
            else {
                // TIME MANIPULATION
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
                // If the time was updated, update remaining work order info time
                if (timeUpdated) {
                    var predicted = TimeManager.predictProjectTimeDeduction();
                    TimeManager.decrementRemainingWorkOrderTime(null, predicted);
                    return false;
                }
                // NAVIGATION
                if (KEYS.isComboPressed(combo, BINDINGS.inc_row)) {
                    self.navigateUp();
                }
                if (KEYS.isComboPressed(combo, BINDINGS.dec_row)) {
                    self.navigateDown();
                }
                // COMMANDS
                if (KEYS.isKeyPressed([KEYS.Enter, KEYS.Esc, KEYS.Delete], combo.keyCode)) {

                    // If Enter is pressed while not editing, but with a row selected, enter edit mode
                    if (self.selecting && KEYS.isKeyPressed(KEYS.Enter, combo.keyCode)) {
                        e.stopImmediatePropagation();
                        self.editRow(this.currentRowIndex);
                    }
                    // If Enter is pressed while editing, save changes and exit edit mode, 
                    // return to navigation mode on current row
                    else if (self.editing && KEYS.isKeyPressed(KEYS.Enter, combo.keyCode)) {
                        e.stopImmediatePropagation();
                        self.cancelRow(true);
                        console.log('cancel called');
                        self.selectRow(this.currentRowIndex);
                        console.log('select called');
                    } 
                    // If Esc is pressed while editing, exit edit mode, discarding changes
                    // return to navigation mode on current row
                    else if (self.editing && KEYS.isKeyPressed(KEYS.Esc, combo.keyCode)) {
                        e.stopImmediatePropagation();
                        self.cancelRow(false);
                        self.selectRow(this.currentRowIndex);
                    }
                    // If Delete Entry combination is pressed, delete the current row, regardless of mode
                    else if (KEYS.isComboPressed(combo, BINDINGS.delete_entry)) {
                        e.stopImmediatePropagation();
                        self.cancelRow(false);

                        var $deleteButton = self.$currentRow.find('.delete_entry');
                        var paramArray = $deleteButton.attr('href').split('(').splice(1)[0].replace(')', '').replace(', ', ',').replace(/'/gm, '').split(',');
                        var week       = paramArray[0];
                        var row        = paramArray[1];
                        var url        = url = '/timesheet.php?&week_ending=' + week + '&delete=' + row;

                        $.ajax({
                            type: "GET",
                            url: url,
                            success: function (data) {
                                var $data = $(data);
                                var $message = $('<div />').text('Entry deleted!').addClass('success');
                                self.displayMessage($message);
                                // Delete entry from DOM
                                self.$currentRow.remove();
                                // Go to next entry
                                self.navigateDown();
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
        refreshTimeEntries: function(html) {
            var self = this;

            // If html is provided, reset entries html
            if (html) $('#TSEntryInline').html(html);

            // Reset DOM elements
            this.resetElements();

            var entries = $('.entry_row');
            // Starts at the most recent and goes backwards through time
            _.each(entries, function(entry, i) {
                var $entry = $(entry);

                var startTime = TimeManager.getMostRecentStartTime($entry);
                var endTime   = TimeManager.getMostRecentEndTime($entry);

                // Roll over to the next day if the end is before the start
                if (endTime.isBefore(startTime)) {
                    endTime.add(1, 'days');
                }

                // We don't need to do anything if this is the last entry
                if (i + 1 < entries.length) {
                    var $previousEntry = $(entries[i + 1]);
                    var prevStart  = TimeManager.getMostRecentStartTime($previousEntry);
                    var prevEnd    = TimeManager.getMostRecentEndTime($previousEntry);
                    var overlapped = TimeManager.areTimesOverlapped(prevStart, prevEnd, startTime, endTime);
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
            var todaysHours = TimeManager.sumTodaysEntries();
            $('#time_entries thead').first().children('.day_of_week').find('span').text(todaysHours + ' hours');

            // Update recorded time
            var totalHours = TimeManager.sumAllEntries(entries);
            TimeManager.setTotalRecordedTime(totalHours);

            // If deleting, then set the start/end time relative to the most recent entry
            var mostRecentStartTime = TimeManager.getMostRecentStartTime();
            var mostRecentEndTime   = TimeManager.getMostRecentEndTime();
            TimeManager.shiftTimes(mostRecentStartTime, mostRecentEndTime);
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
                    var hoursRemoved = parseFloat(_.first(deleting.elements).find('.hours').text());
                    deleting.elements.map(function(el) {
                        el.remove();
                    });
                    self.refreshTimeEntries(null);
                    // Update remaining time
                    TimeManager.incrementRemainingWorkOrderTime(null, hoursRemoved);
                    TimeManager.incrementRemainingProjectTime(null, hoursRemoved);
                    // Predict new deduction
                    var predicted = TimeManager.predictProjectTimeDeduction();
                    TimeManager.decrementRemainingWorkOrderTime(null, predicted);
                }
            });
        },
        // Handle the time entry form submission
        submitForm: function($form) {
            var self = this;
            var startTime = TimeManager.getTimeFromElement($form.find('#start_time2'));
            var endTime   = TimeManager.getTimeFromElement($form.find('#end_time2'));
            var timeAdded = TimeManager.getDiffAsFractionalTime(startTime, endTime);
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
                        // Update remaining time
                        var predicted = TimeManager.predictProjectTimeDeduction();
                        TimeManager.decrementRemainingWorkOrderTime(null, timeAdded + predicted);
                        TimeManager.decrementRemainingProjectTime(null, timeAdded);
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
                        self.refreshTimeEntries();
                    }
                }
            });
        },
        // Generate a hash of the row's contents for change tracking
        hashRow: function($row) {
            return _.reduce($('input, textarea', $row), function(acc, el) {
                return acc + $(el).val();
            }, '');
        },
        // Begin editing the selected row
        editRow: function(row){
            if (row instanceof jQuery)
                this.$currentRow = row;
            else {
                var entries = $('#time_entries .entry_row');
                if (row && typeof row === 'number')
                    this.$currentRow = entries.eq(row);
                else
                    this.$currentRow = entries.eq(this.currentRowIndex);
            }

            if (this.$currentRow) {
                this.editing = true;
                this.injectScript('$(".entry_row").eq(' + this.currentRowIndex + ').find(".edit_entry").click();');

                this.$currentRow.find('textarea[name=notes]').focus().select();
                this.currentHash = this.hashRow(this.$currentRow);
            }
        },
        // Cancel edits on the selected row
        cancelRow: function(save) {
            save = save || false;
            if (this.$currentRow) {
                // Save changes if there are any
                if (save && this.editing && this.currentHash !== this.hashRow(this.$currentRow)) {
                    // Save
                    this.saveChanges();
                    // Pull inline editor changes over to readonly display
                    var tempText = this.$currentRow.find('.inline_text_edit').val();
                    // Cancel editing
                    this.injectScript('$(".entry_row").eq(' + this.currentRowIndex + ').find(".cancel_edit").click();');
                    // Set the notes text with text from the inline editor
                    this.$currentRow.find('td.notes').text(tempText);
                } else {
                    // Cancel editing
                    this.injectScript('$(".entry_row").eq(' + this.currentRowIndex + ').find(".cancel_edit").click();');
                }

                // Reset internal state
                this.editing = false;
                this.currentHash = '';
            }
        },
        selectRow: function(row) {
            if (row instanceof jQuery)
                this.$currentRow = row;
            else {
                var entries = $('#time_entries .entry_row');
                if (row && typeof row === 'number')
                    this.$currentRow = entries.eq(row);
                else
                    this.$currentRow = entries.eq(this.currentRowIndex);
            }

            this.center();
            this.selecting = true;
            this.elements.$notes.trigger('blur');
            this.$currentRow.css('background-color', 'white');
            this.$currentRow.children('td').css('background-color', 'transparent');
        },
        deselectRow: function($row) {
            if ($row) {
                $row.css('background-color', 'transparent');
                $row.children('td').css('background-color', '#f0f0e8');
            }
        },
        // Row navigation
        navigateDown: function() {
            var entries = $('#time_entries .entry_row');
            var maxRows = entries.length;
            if (this.currentRowIndex < maxRows - 1) {
                // Cancel edit mode if editing
                this.cancelRow(false);
                this.currentRowIndex++;
                // Deselect previous row
                this.deselectRow(this.$currentRow);
                // Select new row
                this.selectRow(entries.eq(this.currentRowIndex));
            }
        },
        navigateUp: function() {
            if (this.currentRowIndex - 1 >= 0) {
                // Cancel edit mode if editing
                this.cancelRow(false);
                this.currentRowIndex--;
                // Deselect previous row
                this.deselectRow(this.$currentRow);
                // Select new row
                this.selectRow(this.currentRowIndex);
            }
        },
        injectScript: function(scriptText) {
            var script = document.createElement('script');
            script.textContent = scriptText;
            document.body.appendChild(script);
            setTimeout(function() { document.body.removeChild(script); }, 200);
        }
    };

    if (!BINDINGS || !KEYS) {
        console.log('Unable to load keybindings.js. Timesheet helper is unable to continue.');
    } else {
        app.start();
    }


})(jQuery, window);