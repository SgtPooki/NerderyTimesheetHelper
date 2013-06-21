var Timesheet = (function($, undefined) {

    // Shortcut aliases
    var array  = toolbox.array;
    var object = toolbox.object;
    var string = toolbox.string;
    var func   = toolbox.func;
    var ApplicationException = toolbox.ApplicationException;
    var Enumeration          = toolbox.Enumeration;

    // Time/Date Formats
    var formats = {
        shortTime:        'h:mm A',
        shortTimeGapless: 'h:mmA'
    };

    // Enums
    var Weekdays = new Enumeration([
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
        ]);

    /**
     *  The Clock class respresents a single instance of time that can be modified
     *  formatted, and displayed. Operations on the Clock allow you to advance or
     *  reverse time, get the Clock's current time, format the time as a string, and
     *  determine the duration between the Clock's current time and another time in
     *  minutes. You can additionally bind the clock to an element, and when the clock
     *  is updated, so is the value of the element.
     */
    function Clock(hour, minute, day) {
        var self = this;
        // For binding to an element
        this.attached    = false;
        this.element     = null;
        // For handling time changed events
        this.handlers    = [];
        // Default time is 7:00 AM of the current day
        this.currentDay  = day = day || Weekdays.Monday;
        this.currentTime = {
            value: moment().day(day.value).hour(hour || 7).minute(minute || 0).second(0),
            set: function(time) {
                this.value = time;
                onTimeChanged(time);
            },
            get: function() {
                return this.value;
            }
        };
        // Triggered when currentTime.set is called
        function onTimeChanged(time) {
            if (self.attached) {
                if (self.element.val) {
                    self.element.val(time.format(formats.shortTime));
                } else {
                    self.element.text(time.format(formats.shortTime));
                }
            }
            array.forEach(self.handlers, function(handler) {
                handler(time);
            });
        }

        return this;
    }
    Clock.fromElement = function($el) {
        var time  = ($el.val && $el.val()) || $el.text() || '7:00 AM';
        var m     = moment(time, formats.shortTime);
        return new Clock(m.hour(), m.minute(), Clock.today);
    };
    Clock.now   = function () { return moment(); };
    Clock.today = function () { return Weekdays.fromValue(moment().day()); };
    /**
     *  Generate a new time which is rounded to the nearest interval mark (quarter hour, half hour, etc)
     *  @param {number} interval - The interval to round to (default is 15)
     */
    Clock.nearest = function(interval) {
        interval = interval || 15;
        var now = Clock.now();
        // Get the difference between now and the nearest interval
        var diff = now.minutes() % interval;
        // If no difference, we are already at the nearest quarter hour
        if (diff === 0)
            return now;
        // If the difference is greater than half of the interval period, go to the next interval
        else if (diff > parseFloat(interval / 2))
            return now.add('minutes', interval - diff);
        // If the difference is less than half of the interval period, go back to the most recent interval
        else
            return now.subtract('minutes', diff);
    };
    Clock.prototype.attach = function(element) {
        if (!(element instanceof jQuery))
            throw new ApplicationException('Clock.attach: Invalid jQuery object provided.', element);
        else {
            this.attached = true;
            this.element  = element;
        }
        return this;
    };
    Clock.prototype.detach = function() {
        this.attached = false;
        this.element  = null;
        return this;
    };
    Clock.prototype.current = function() {
        return this.currentTime.get();
    };
    Clock.prototype.durationUntil = function(endTime) {
        return new Duration(this.current(), endTime.current());
    };
    Clock.prototype.reset = function(value) {
        if (value) {
            var cloned = moment().hour(value.hour()).minute(value.minute()).second(0);
            this.currentTime.set(cloned);
        }
        else {
            this.currentTime.set(moment().hour(7).minute(0).second(0));
        }
        return this;
    };
    Clock.prototype.advance = function(interval) {
        interval = interval || 15;
        var advanced = this.currentTime.get().clone().add(interval, 'minutes');
        this.currentTime.set(advanced);
        return this;
    };
    Clock.prototype.reverse = function(interval) {
        interval = interval || 15;
        var reversed = this.currentTime.get().clone().subtract(interval, 'minutes');
        this.currentTime.set(reversed);
        return this;
    };
    /**
     *  Peek at the value which will be set when `advance` is called.
     *  @param {number} interval - The number of minutes to advance the current time (default is 15)
     */
    Clock.prototype.peekNext = function(interval) {
        interval = interval || 15;
        var currentTime = this.currentTime.get().clone();
        return currentTime.add('minutes', interval - (currentTime.minutes() % interval));
    };
    Clock.prototype.toString = function(format) {
        format = format || formats.shortTime;
        return this.currentTime.get().format(format);
    };
    Clock.prototype.addTimeChangedHandler = function(handler) {
        if (object.isFunction(handler))
            this.handlers.push(handler);
        return this;
    };

    /**
     *  Duration can either be a range or a value
     *  Provide two moments, start and end, to build a duration from the difference
     *     or,
     *  oProvide a single integer argument to build a duration as a value
     */
    function Duration() {
        if (arguments.length === 1 && object.isType(arguments[0], 'number'))
            this.value = moment.duration(start, 'minutes');
        else if (arguments.length === 2) {
            var start  = arguments[0];
            var end    = arguments[1];
            this.value = moment.duration(end.diff(start, 'minutes'), 'minutes');
        }
    }
    /**
     *  Returns the number of minutes this duration represents
     */
    Duration.prototype.minutes = function() {
        return this.value.asMinutes();
    };
    /**
     *  Returns the number of hours this duration represents as a float rounded to the nearest hundredth of an hour, i.e 12.75
     */
    Duration.prototype.hours = function() {
        return parseFloat(this.value.asHours().toPrecision(4));
    };

    /** 
     *  Timespan defines a range of time with a specific start and end time.
     *  This can be used to determine how two spans of time compare to each other,
     *  such as whether they overlap, are split by some other span of time, etc.
     */
    function Timespan(start, end) {
        this.start    = start;
        this.end      = end;
        this.duration = new Duration(start, end);
    }
    /**
     *  Determine if the provided Timespan and the current Timespan overlap
     */
    Timespan.prototype.overlaps = function(t) {
        // |--[..t..]--[..this..]-->
        if (this.start.isAfter(t.end))
            return false;
        // |--[..this..]--[..t..]-->
        else if (this.start.isBefore(t.start) && this.end.isBefore(t.start))
            return false;
        // |--[..t..|..this..]-->
        else if (this.start.isSame(t.end))
            return false;
        // |--[..this..|..t..]-->
        else if (this.end.isSame(t.start))
            return false;
        // everything else..
        else
            return true;
    };
    /**
     *  Determine the number of minutes between two Timespans. The return value is an integer,
     *  and will be negative if the provided Timespan comes before the current Timespan; Positive
     *  if it comes after; and zero if they overlap or if there is no gap between them.
     */
    Timespan.prototype.minutesBetween = function(t) {
        if (this.start.isAfter(t.end))
            return t.end.diff(this.start, 'minutes');
        else if (this.end.isBefore(t.start))
            return this.end.diff(t.start, 'minutes');
        else
            return 0;
    };

    var ui = {};

    // Configurables
    ui.config = {
        messageDisplayTime: 1000 * 2,
        highlightColor:     'yellow'
    };

    // Summary Information
    ui.summary = {
        recordedTime: {
            view: $('.ts_recorded'),
            getHours: function() {
                var contents = this.view.contents();
                return parseFloat(contents.eq(2).text().trim());
            },
            setHours: function(hours) {
                var headline = this.view.find('.ts_headline');
                var caption  = this.view.find('.caption');
                var contents = this.view.contents();
                // Remove the old hours content
                contents.slice(contents.index(headline) + 1, contents.index(caption)).remove();
                // Re-insert the new hours content
                headline.after(hours);
            }
        }
    };

    // Workorder Information
    ui.workorders = {
        view: $('#timesheet_workorders'),
        getWorkOrder: function (wo) {
            var row = $('#' + wo, this.view).parent();
            if (row.length) {
                return {
                    client:  row.find('td:nth-child(2) a').text(),
                    proejct: row.find('td:nth-child(3) a').text(),
                    id: wo,
                    getHours: function() {
                        return parseFloat(row.find('td:nth-child(6)').text());
                    },
                    setHours: function(hours) {
                        row.find('td:nth-child(6)').text(hours.toPrecision(3) + ' hours');
                    }
                };
            } else return null;
        },
        increaseTimeRemaining: function(wo, amount) {
            var workorder = this.getWorkOrder(wo);
            if (workorder) {
                workorder.setHours(workorder.getHours() + amount);
            }
        },
        decreaseTimeRemaining: function(wo, amount) {
            var workorder = this.getWorkOrder(wo);
            if (workorder) {
                workorder.setHours(workorder.getHours() - amount);
            }
        }
    };

    // New time entry form
    ui.entryForm = {
        // Elements
        form:       $('#TSEntryForm'),
        view:       $('#time_entry_table'),
        day:        $('#day'),
        startTime:  $('#start_time2'),
        endTime:    $('#end_time2'),
        wo:         $('#bill_to'),
        client:     $('#client'),
        project:    $('#project'),
        notes:      $('#notes'),
        flag:       $('#flag_entry'),
        saveButton: $('#save_ts_entry_button'),
        startClock: null,
        endClock:   null,
        // Day Manipulation
        getDay: function() {
            return Weekdays.fromName(this.day.val());
        },
        resetDay: function() {
            this.day.val(Clock.today.toString());
        },
        nextDay: function() {
            var currentDay = this.getDay();
            this.day.val(Weekdays.next(currentDay).toString());
        },
        previousDay: function() {
            var currentDay = this.getDay();
            this.day.val(Weekdays.previous(currentDay).toString());
        },
        // Work Order Information
        startTimeChanged: function(time) {
            var timeRemaining = this.view.find('#time_remaining');
            // If the work order information section is hidden, do nothing
            if (timeRemaining.length) {
                var project = this.project.val();
                // If no project has been selected, do nothing
                if (project) {
                    var workorder = ui.workorders.getWorkOrder(project);
                    // Some work orders don't have information stored on the page (SIERRA PTO, etc.)
                    if (workorder) {
                        var duration = this.startClock.durationUntil(this.endClock);
                        timeRemaining.text(workorder.getHours() - duration.hours());
                    }
                }
            }
        },
        endTimeChanged: function(time) {
            var timeRemaining = this.view.find('#time_remaining');
            // If the work order information section is hidden, do nothing
            if (timeRemaining.length) {
                var project = this.project.val();
                // If no project has been selected, do nothing
                if (project) {
                    var workorder = ui.workorders.getWorkOrder(this.project.val());
                    // Some work orders don't have information stored on the page (SIERRA PTO, etc.)
                    if (workorder) {
                        var duration = this.startClock.durationUntil(this.endClock);
                        timeRemaining.text(workorder.getHours() - duration.hours());
                    }
                }
            }
        },
        isValid: function() {
            return this.day.val()       &&
                   this.startTime.val() &&
                   this.endTime.val()   &&
                   this.client.val()    &&
                   this.project.val()   &&
                   this.notes.val();
        },
        submitEntry: function() {
            var self = this;
            $.ajax({
                type:     'POST',
                url:      '',
                data:     this.form.serialize(),
                dataType: 'html',
                success: function (result) {
                    var $result = $(result);
                    var errors  = $result.find('.error');
                    if (errors.length > 2) {
                        ui.actions.notify($result.find('.error').first());
                    }
                    else {
                        // Let Nerd know their time was saved properly!
                        var successMessage = $('<div />').text('Entry saved!').addClass('success');
                        ui.actions.notify(successMessage);
                        // Advance the clock
                        self.startClock.advance();
                        self.endClock.advance();
                        // Reset the time entry notes field
                        self.notes.val('');
                        // Update remaining time
                        var deduction = self.startClock.durationUntil(self.endClock).hours();
                        ui.workorders.decreaseTimeRemaining(self.project.val(), deduction);
                        // Update the historical entries list
                        ui.entryTable.refresh($result.find('#TSEntryInline').html());
                    }
                }
            });

            return false;
        }
    };

    // Existing time entries
    ui.entryTable = {
        view:    func.partial($, '#TSEntryInline'),
        entries: func.partial($, '#time_entries'),
        getDays: function() {
            return array.map(this.entries().find('thead'), function(el) {
                var $el = $(el);
                // Search for the requested day
                return {
                    name: $el.find('h3').text(),
                    // A collection of time entry objects for easy manipulation and parsing
                    entries: function() {
                        var rows = $el.next().find('.entry_row');
                        return array.map(rows, function(row) {
                            var $row = $(row);
                            return {
                                element:    $row,
                                day:        $row.find('.day').text(),
                                startTime:  moment($row.find('.start_time').text(), formats.shortTime),
                                endTime:    moment($row.find('.end_time').text(),   formats.shortTime),
                                getHours: function() {
                                    return parseFloat($row.find('.hours').text());
                                }
                            };
                        });
                    },
                    getTotalHours: function(hours) {
                        return $el.find('.day_of_week span').text();
                    },
                    // Update the total hours label on for the weekday
                    setTotalHours: function(hours) {
                        $el.find('.day_of_week span').text(hours.toPrecision(2) + ' hours');
                    }
                };
            });
        },
        getDay: function(day) {
            return array.find(this.getDays(), function(d) {
                return d.name.toLowerCase() === day.toLowerCase();
            });
        },
        mostRecentEntry: function() {
            var rows = $('.entry_row', this.entries());
            if (rows.length) {
                var entry = rows.eq(0);
                return {
                    element:   entry,
                    startTime: moment(entry.find('.start_time').text(), formats.shortTimeGapless),
                    endTime:   moment(entry.find('.end_time').text(),   formats.shortTimeGapless)
                };
            }
            else return null;
        },
        sumDayEntries: function(day) {
            var result = this.getDay(day);
            return array.reduce(result.entries(), function(memo, entry) {
                return memo + entry.getHours();
            }, 0.0);
        },
        sumAllEntries: function() {
            var self = this;
            // Reduce each day's total to a single grand total
            return array.reduce(this.getDays(), function(memo, day) {
                // Reduce each entry's hours to a single total
                return memo + array.reduce(day.entries(), function(m, entry) {
                    return m + entry.getHours();
                }, 0.0);
            }, 0.0);
        },
        // Delete a time entry row asynchronously
        deleteEntry: function(entry) {
            var self         = this;
            var re           = /deleteRow\('(.+)', '([\w]+)\*([\d\w]+)'\)/;
            var parsed       = re.exec(entry.attr('href'));
            var tr           = entry.parents('tr');
            var hoursRemoved = parseFloat(tr.find('.hours').text());
            var deleting = {
                date:     parsed[1],
                user:     parsed[2],
                id:       parsed[3]
            };

            var del = deleting.user + '*' + deleting.id;
            var url = '/timesheet.php?ts_user=' + deleting.user + '&week_ending=' + deleting.date + '&delete=' + del;
            $.ajax({
                type: 'POST',
                url:  url,
                dataType: 'html',
                success: function(result) {
                    // Update remaining time
                    ui.workorders.increaseTimeRemaining(ui.entryForm.project.val(), hoursRemoved);
                    // Refresh entries
                    self.refresh($(result).find('#TSEntryInline').html());
                }
            });
        },
        refresh: function(html) {
            var self = this;
            // If html is provided, reset entries html
            if (html) {
                // Refresh DOM
                this.view().html(html);
                /**
                 *  Iterate over entries to insert gap and overlap warnings
                 *  iteration is performed top to bottom, or from present -> past
                 */
                array.forEach(this.getDays(), function(day) {
                    var entries = day.entries();
                    array.forEach(entries, function(entry, i) {
                        // Only act if this is not the last entry
                        if (i + 1 < entries.length) {
                            var previousEntry    = entries[i + 1];
                            // Get the timespans represented by this and the previous entries
                            var timespan         = new Timespan(entry.startTime, entry.endTime);
                            var previousTimespan = new Timespan(previousEntry.startTime, previousEntry.endTime);
                            // Determine if the timespans overlap, or if there is a negative nonzero difference between them
                            if (timespan.overlaps(previousTimespan)) {
                                self.showOverlapWarning(entry.element);
                            }
                            else if (timespan.minutesBetween(previousTimespan) < 0) {
                                self.showGapWarning(entry.element, previousEntry.endTime, entry.startTime);
                            }
                        }
                    });
                });
                // Update recorded time
                var totalHours = this.sumAllEntries();
                ui.summary.recordedTime.setHours(totalHours);
                // Set the start/end time relative to the most recent entry
                var mostRecent = this.mostRecentEntry();
                // If adding 15 minutes would cause the day to roll over, reset the new entry form for the next day
                if (mostRecent.endTime.day() < mostRecent.endTime.clone().add(15, 'minutes').day()) {
                    ui.entryForm.nextDay();
                    ui.entryForm.startClock.reset();
                    ui.entryForm.endClock.reset().advance();
                }
                else {
                    ui.entryForm.startClock.reset(mostRecent.endTime);
                    ui.entryForm.endClock.reset(mostRecent.endTime).advance();
                }
            }
        },
        showOverlapWarning: function(row) {
            var warning = $('<tr class="gap_detection"><td colspan="8">Timesheet overlap detected. Double-check your work, and fix if needed.</td></tr>');
            row.after(warning);
        },
        showGapWarning: function(row, startTime, endTime) {
            var day       = moment().format('dddd');
            var start     = startTime.format(formats.shortTimeGapless);
            var end       = endTime.format(formats.shortTimeGapless);
            var timeRange = start + ' to ' + end;
            var params    = '\'' + start + '\', \'' + end + '\', \'' + day + '\'';

            var warning = $('<tr class="gap_detection"><td colspan="8">' + timeRange + ':Take a break? Cool. Otherwise, <a href="javascript:fillTimesheetGap(' + params + ')">fill your timesheet</a>.</td></tr>');
            row.after(warning);
        }
    };

    // Persistent UI state
    ui.state = {
        currentRow: null,
        creating: false,
        editing: false
    };

    // UI actions
    ui.actions = {
        // Display a message to the user
        notify: function ($element) {
            if ($element) {
                // Hide before inserting in the DOM to prevent document reflow
                $element.hide()
                        .insertBefore(ui.entryForm.form)
                        .slideDown('fast');
                // In order to hide the notification smoothly, first slide up the element, and delay it's actual removal
                // by the same time it was displayed. This ensures it has plenty of time to hide itself to prevent jittery
                // rendering
                var hide   = func.partial(func.bind($element.slideUp, $element), 'fast');
                var remove = func.bind($element.remove, $element);
                func.delay([hide, remove], ui.config.messageDisplayTime);
            }
        },
        // Highlight the currently editable start time field
        highlightStartTime: function() {
            this.selectStartTime().css('background-color', ui.config.highlightColor);
        },
        unhighlightStartTime: function() {
            this.selectStartTime().css('background-color', 'white');
        },
        // Highlight the currently editable end time field
        highlightEndTime: function() {
            this.selectEndTime().css('background-color', ui.config.highlightColor);
        },
        unhighlightEndTime: function() {
            this.selectEndTime().css('background-color', 'white');
        },
        // The notes, start, and end time inputs all check to see if more than one
        // input with that name is on the page, if so, we are editing a row, and
        // we want the element being edited, rather than the new entry element
        //
        // Select the currently editable notes field
        selectNotes: function() {
            var notes = $('input[name=notes]');
            return notes.length > 1 ? notes.eq(1) : notes.eq(0);
        },
        // Select the currently editable start time field
        selectStartTime: function() {
            var startTime  = $('input[name=start_time]');
            return startTime.length > 1 ? startTime.eq(1) : startTime.eq(0);
        },
        // Select the currently editable end time field
        selectEndTime: function() {
            var endTime = $('input[name=end_time]');
            return endTime.length > 1 ? endTime.eq(1) : endTime.eq(0);
        }
    };

    // This is mostly for convenience, and a warning when you reference
    // a new binding without adding it. Keep it updated!
    ui.bindings = {
        incrementStartTime: 'inc_start_time',
        decrementStartTime: 'dec_start_time',
        incrementEndTime:   'inc_end_time',
        decrementEndTime:   'dec_end_time',
        navigateUp:         'inc_row',
        navigateDown:       'dec_row',
        deleteEntry:        'delete_entry'
    };

    ui.init = function() {
        var self = this;

        /**************************
        * Register events
        * To determine things such as when the user is editing a new entry, etc.
        ***************************/
        // Toggle 'creating' state depending on whether or not we're focused on the notes field
        ui.entryForm.notes.on('focus', function() {
            ui.state.creating = true;
        });
        ui.entryForm.notes.on('blur', function() {
            ui.state.creating = false;
        });
        // Intercept when a user manually clicks Save on a new entry
        ui.entryForm.saveButton.on('click', function(e) {
            e.preventDefault();
            if (ui.entryForm.isValid()) {
                ui.entryForm.submitEntry();
            }
        });
        // Intercept when a user clicks delete on a historical entry
        ui.entryTable.view().on('click', '.delete_entry', function(e) {
            e.preventDefault();
            ui.entryTable.deleteEntry($(this));
        });

        /**************************
        * Preload entry form with most recent data
        * For convenience
        ***************************/
        // Project
        var latestEntry   = ui.entryTable.mostRecentEntry();
        var latestClient  = latestEntry.element.find('.client a').text();
        var latestProject = latestEntry.element.find('.project a').text();
        ui.entryForm.client.val(latestClient);
        ui.entryForm.project.val(latestProject);
        ui.entryForm.wo.val(latestClient + ' ' + latestProject);
        // By focusing on the project here, when we change focus later on,
        // it will trigger actions like showing warnings, work order information, etc.
        ui.entryForm.wo.focus();
        // Change focus to the notes field for quick entry
        ui.entryForm.notes.focus();

        /**************************
        * Entry Form Clocks
        * These keep track of changes to the entry form start and end times
        * and do things such as recalculate work order information, etc
        ***************************/
        // Start Time
        ui.entryForm.startClock = new Clock()
            .attach(ui.entryForm.startTime)
            .reset(latestEntry.endTime)
            .addTimeChangedHandler(func.bind(ui.entryForm.startTimeChanged, ui.entryForm));
        // End Time (set 15 minutes ahead of the start on load)
        ui.entryForm.endClock = new Clock()
            .attach(ui.entryForm.endTime)
            .reset(latestEntry.endTime)
            .advance()
            .addTimeChangedHandler(func.bind(ui.entryForm.endTimeChanged, ui.entryForm));

        // Initialize keybinder
        ui.keybinder = new Keybindings();

        /** 
         * Meta bindings are useful for detecting when a field or action is about to
         * take place or be enabled. For instance, in this application, we highlight
         * the start and end time fields when their associated meta keys are pressed
         * to inform the user which field they are about to modify, from there they
         * can finish their key combination to take the desired action on that field.
         *
         * This particular function creates a clone of the original keybinding we want
         * to have a meta binding for, sans the keycode. We can then bind a handler to
         * this new keybinding to perform actions like highlighting a field, etc.
         */
        function createMetaBinding(name, friendlyName) {
            var old = ui.keybinder.get(name);
            var nu  = {
                name:  old.name + '$$META',
                combo: old.combo.clone(true)
            };
            ui.keybinder.add(nu.name, nu.combo);
            ui.bindings[friendlyName] = nu.name;
        }

        /****************************
        * Restore options from localStorage
        *****************************/
        chrome.extension.sendRequest({ method: 'getLocalStorage', key: 'Keybindings' }, function(response) {
            if (response) {

                ui.keybinder.deserialize(response);

                /****************************
                * Define keybinding actions
                *****************************/
                createMetaBinding(ui.bindings.incrementStartTime, 'highlightStartTime');
                createMetaBinding(ui.bindings.incrementEndTime,   'highlightEndTime');
                ui.keybinder.registerToggle(
                    ui.bindings.highlightStartTime,
                    func.bind(ui.actions.highlightStartTime, ui.actions),
                    func.bind(ui.actions.unhighlightStartTime, ui.actions)
                );
                ui.keybinder.registerToggle(
                    ui.bindings.highlightEndTime,
                    func.bind(ui.actions.highlightEndTime, ui.actions),
                    func.bind(ui.actions.unhighlightEndTime, ui.actions)
                );
                // Start Time
                ui.keybinder.registerHandler(ui.bindings.incrementStartTime, func.bind(ui.entryForm.startClock.advance, ui.entryForm.startClock));
                ui.keybinder.registerHandler(ui.bindings.decrementStartTime, func.bind(ui.entryForm.startClock.reverse, ui.entryForm.startClock));
                // End Time
                ui.keybinder.registerHandler(ui.bindings.incrementEndTime, func.bind(ui.entryForm.endClock.advance, ui.entryForm.endClock));
                ui.keybinder.registerHandler(ui.bindings.decrementEndTime, func.bind(ui.entryForm.endClock.reverse, ui.entryForm.endClock));
                // Creating a new entry
                ui.keybinder.add('createEntry', new Combo(Keys.Enter));
                ui.keybinder.registerHandler('createEntry', function() {
                    if (ui.state.creating) {
                        ui.entryForm.submitEntry();
                    }
                });

            } else {
                throw new ApplicationException('Unable to deserialize keybindings.');
            }
        });
    };

    ui.init();

    return ui;

})(jQuery);