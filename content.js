(function ($) {
    var NRD = {};

    NRD.TimesheetHelper = {
        center: function() {
            this.setDomItems();
            window.scrollTo(0, this.currentDomItems.$notes.offset().top - ($(window).height()/2));
        },
        selectors: {
            entryForm:  '#TSEntryForm',
            notes:      '[name="notes"]',
            startTime:  '[name="start_time"]',
            endTime:    '[name="end_time"]'
        },
        setDomItems: function () {
            $notes      = $(this.selectors.notes);
            $notes      = $notes.length > 1 ? $notes.eq(1) : $notes.eq(0);
            $startTime  = $(this.selectors.startTime);
            $startTime  = $startTime.length > 1 ? $startTime.eq(1) : $startTime.eq(0);
            $endTime    = $(this.selectors.endTime);
            $endTime    = $endTime.length > 1 ? $endTime.eq(1) : $endTime.eq(0);
            this.currentDomItems = {
                '$notes':       $notes,     'notes':     $notes[0],
                '$startTime':   $startTime, 'startTime': $startTime[0],
                '$endTime':     $endTime,   'endTime':   $endTime[0]
            };
            return this.currentDomItems;
        },
        _appState: {
            editingEntries: false
        },

        init: function () {
            this._loadBindings();
            this._bind();
        },

        _loadBindings: function() {
            // Restores bindings from localStorage
            _.each(BINDINGS, function(combo, name) {
                var comboString = localStorage[name];
                if (comboString) {
                    BINDINGS[name] = KEYS.comboFromString(comboString);
                }
            });
        },

        _bind: function () {
            var self = this;
            $(this.selectors.notes).on('keydown', function (e) {
                var combo = KEYS.getComboForEvent(e);
                // Set DOM
                self.setDomItems();
                // Hilight start/end fields if their associated key combinations are meta
                if (KEYS.isComboMeta(combo, BINDINGS.inc_start_time) || KEYS.isComboMeta(combo, BINDINGS.dec_start_time)) {
                    self.currentDomItems.$startTime.css('background', 'yellow');
                }
                if (KEYS.isComboMeta(combo, BINDINGS.inc_end_time) || KEYS.isComboMeta(combo, BINDINGS.dec_end_time)) {
                    self.currentDomItems.$endTime.css('background', 'yellow');
                }

                // If ENTER is pressed by itself when the editor is not active, submit the time entry
                if (KEYS.isKeyPressed(KEYS.Enter, combo.keyCode) && (!combo.ctrl || !combo.meta || !combo.shift) && !self.EntryEditor.active) {
                    e.preventDefault();
                    // Submit entry form
                    $(self.selectors.entryForm).submit();
                    // Exit early
                    return false;
                } 
                else {
                    // Check for time modifications
                    var timeUpdated = false;
                    if (KEYS.isComboPressed(e, BINDINGS.inc_start_time)) {
                        timeUpdated = true;
                        self.TimeManipulator.increase(self.currentDomItems.$startTime);
                    }
                    if (KEYS.isComboPressed(e, BINDINGS.inc_end_time)) {
                        timeUpdated = true;
                        self.TimeManipulator.increase(self.currentDomItems.$endTime);
                    }
                    if (KEYS.isComboPressed(e, BINDINGS.dec_start_time)) {
                        timeUpdated = true;
                        self.TimeManipulator.increase(self.currentDomItems.$startTime);
                    }
                    if (KEYS.isComboPressed(e, BINDINGS.dec_end_time)) {
                        timeUpdated = true;
                        self.TimeManipulator.increase(self.currentDomItems.$endTime);
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
                        self.EntryEditor.increaseRow();
                    }
                    if (KEYS.isComboPressed(e, BINDINGS.dec_row)) {
                        changedRow = true;
                        self.EntryEditor.decreaseRow();
                    }
                    if (changedRow) {
                        self.center();
                        self.currentDomItems.$notes.focus().select();
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
                            self.EntryEditor.reset();
                            self.center();
                            self.currentDomItems.$notes.focus();
                        } else if (KEYS.isKeyPressed(KEYS.Delete, combo.keyCode) && combo.alt) {
                            // Delete the currently highlighted entry. (trigger click on delete button);
                            self.EntryEditor.unhighlightRow();

                            var $deleteButton = self.EntryEditor.$currentRow.find('.delete_entry');
                            var paramArray = $deleteButton.attr('href').split('(').splice(1)[0].replace(')', '').replace(', ', ',').replace(/'/gm, '').split(',');
                            var week       = paramArray[0];
                            var row        = paramArray[1];
                            var url        = url = '/timesheet.php?&week_ending=' + week + '&delete=' + row;

                            self.EntryEditor.$currentRow.remove();
                            self.EntryEditor.highlightRow();

                            $.ajax({
                                type: "GET",
                                url: url,
                                success: function (data) {
                                    var $data = $(data);
                                    var $successfullyDeletedRow = jQuery('<div />').text('Entry deleted!').addClass('success');
                                    self.ui.displayMessage($successfullyDeletedRow);
                                    self.EntryEditor.replaceEntryHTML($data);
                                }
                            });
                        }
                    }
                }
            }).on('keyup', function (e) {
                var combo = KEYS.getComboForEvent(e);
                // Remove hilight from start/end fields when meta is removed
                if (KEYS.isComboMeta(combo, BINDINGS.inc_start_time) || KEYS.isComboMeta(combo, BINDINGS.dec_start_time)) {
                    self.currentDomItems.$startTime.css('background', '');
                }
                if (KEYS.isComboMeta(combo, BINDINGS.inc_end_time) || KEYS.isComboMeta(combo, BINDINGS.dec_end_time)) {
                    self.currentDomItems.$endTime.css('background', '');
                }
            });


            // Capture POST, change form POST to ajax post.
            $(this.selectors.entryForm).submit(function (e) {
                // Prevent the normal form submission
                e.preventDefault();

                var $this    = $(this);
                var formData = $this.serialize();

                $.ajax({
                    type: "POST",
                    url: '',
                    data: formData,
                    dataType: 'html',
                    success: function (data) {
                        //remove loading gif.
                        $('.ajax_loading_bigdark').remove();

                        //replace save button
                        var $btnSave = $('#save_ts_entry_button');
                        $('.entry_save').append($btnSave);

                        $data = $(data);

                        var $errors = $data.find('.error');
                        if ($errors.length > 2) {
                            var $errorMsg = $data.find('.error').first();
                            NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                        }
                        else {
                            //let Nerd know their time was saved properly!
                            var $successMsg = $('<div />').text('Entry saved!').addClass('success');
                            NRD.TimesheetHelper.ui.displayMessage($successMsg);
                            NRD.TimesheetHelper.TimeManipulator.shiftTimes(self.currentDomItems.$startTime, self.currentDomItems.$endTime);
                            self.currentDomItems.$notes.val('');
                            $('#TSEntryInline').html($data.find('#TSEntryInline').html());
                        }
                    }
                });

                return false;
            });
        } //end bind.
    };

    NRD.TimesheetHelper.EntryEditor = {
        // flag that says whether we're currently editing entries or not.
        active: false,  
        // keeps track of current index of row for entries
        entryIndex: -1, 
        _originalText : '',
        $currentRow: null,
        setRow: function($entryRow) {
            this.active = true;
            if (this.entryIndex === -1) {
                $entryRow = null;
            } else {
                $entryRow = (typeof $entryRow === 'undefined') ? $('.entry_row').eq(this.entryIndex) : $entryRow;
                this.$currentRow = $entryRow;
            }
        },
        rowToString: function(){
            var tempString = '';
            if (this.active) {
                this.$currentRow.find('input, textarea').each(function(i,o){
                    tempString = tempString + $(o).val();
                });
            }

            return tempString;
        },
        hasRowChanged: function(){
            if (this.active) {
                return this._originalText === this.rowToString();
            } else {
                return false;
            }
        },
        saveRowIfChanged: function($entryRow) {
            if (this.active) {
                if (this.hasRowChanged()) {
                    return; // data is the same, no need to save.
                }

                this.submitAjax();
            }
        },
        reset: function() {
            this.saveRowIfChanged();
            this.unhighlightRow();
            this.entryIndex = -1;
            this.$currentRow = null;
            this.active = false;
            this._originalText = '';
        },
        highlightRow: function(){
            this.setRow();

            if (this.$currentRow !== null) {
                this.$currentRow.find('.edit_entry').trigger('click');
                this.$currentRow.find('#notes').focus().select();
                this._originalText = this.rowToString();
            }
        },
        unhighlightRow: function() {
            if (this.$currentRow !== null) {

                var tempText = this.$currentRow.find('.inline_text_edit').val();
                //remove the editing elements of the row.
                this.$currentRow.find('.cancel_edit').filter(function () {
                    return $(this).css('display') !== 'none';
                }).click();

                this.$currentRow.find('td.notes').text(tempText);
            }
        },
        increaseRow: function() {
            this.saveRowIfChanged();
            if (this.entryIndex + 1 >= this.maxRows()) {
                this.entryIndex = this.maxRows() - 1;
            } else {
                this.unhighlightRow();
                this.entryIndex++;
                this.highlightRow();
            }
        },
        decreaseRow: function() {
            this.entryIndex--;

            if (this.entryIndex > -1) {
                this.saveRowIfChanged();
                this.unhighlightRow();
                this.highlightRow();
            } else {
                this.reset();
            }
        },
        maxRows: function() {
            return $('.entry_row').length;
        },
        submitAjax: function() {
            self = this;
            url = $.trim(window.location.pathname);
            var data = this.$currentRow.find(':input:not(.unflag_input)').serializeArray();

            $.ajax({
                type: "POST",
                url: url,
                data: data,
                dataType: 'html',
                success: function (data) {

                    $data = $(data);

                    var $errors = $data.find('.error');
                    if ($errors.length > 2) {
                        var $errorMsg = $data.find('.error').first();
                        NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                    }
                    else {
                        //let Nerd know their time was saved properly!
                        var $successMsg = $('<div />').text('Entry saved!').addClass('success');
                        NRD.TimesheetHelper.ui.displayMessage($successMsg);

                        self.replaceEntryHTML($data);

                    }
                }
            });
        },
        replaceEntryHTML: function($data) {
            if (this.entryIndex > -1) {
                //block all input temporarily.
                var buffer = ''; // use to collect and enter keys lost while blocking input
                $(window).live('keydown keyup', function(e) {
                    e.preventDefault();
                    return false;
                });
                var savedText = this.$currentRow.find('.notes textarea').val();
                this.unhighlightRow();
                $('#TSEntryInline').html($data.find('#TSEntryInline').html());
                this.highlightRow();
                var $textBox = this.$currentRow.find('.notes textarea');
                $textBox.focus();
                $textBox.val('');
                $textBox.val(savedText);
                NRD.TimesheetHelper.center();
                $(window).die('keydown keyup');
            }
        }
    };

    NRD.TimesheetHelper.TimeManipulator = {
        increase: function ($element, value) {
            value = (typeof value !== 'undefined') ? value : 15;
            var currentValue = this._getElementTime($element);
            var newValue     = this.getNewTime(currentValue, value);
            $element.val(newValue);
        },
        decrease: function ($element, value) {
            value = (typeof value !== 'undefined') ? value * -1 : -15;
            var currentValue = this._getElementTime($element);
            var newValue     = this.getNewTime(currentValue, value);
            $element.val(newValue);
        },
        _getElementTime: function ($element) {
            return Date.parse($element.val());
        },
        getNewTime: function (baseValue, additionalValue) {
            var newVal = new Date(baseValue.getTime() + (additionalValue * 60000));
            return this.formatTime(newVal);
        },
        formatTime: function (value) {
            return value.toString('h:mm tt');
        },
        shiftTimes: function ($element1, $element2) {
            var time = $element2.val();
            var endTime = Date.parse(time);

            var startTime = Date.parse($element1.val());

            var timeDifference = (endTime - startTime) / 1000 / 60;
            var newEndTime = new Date(endTime.getTime() + timeDifference * 60000);

            var amOrPm = '';

            var endHour = newEndTime.getHours();
            var endMin = newEndTime.getMinutes();

            var newEndTimeString = endHour + ':' + ((endMin === 0) ? '00' : endMin) + ' ' + newEndTime.toString('tt');
            var newEndTimeString = this.formatTime(newEndTime); //.toString('h:mm tt');


            //empty timesheet input fields.
            $element1.val($element2.val());
            $element2.val(newEndTimeString);

            $('#orig_time_remaining').val($('#orig_time_remaining').val() - (timeDifference / 60));
            updateRemainingTime();
        }
    };

    NRD.TimesheetHelper.ajaxHelper = {
        submit: function (url, data, success) {
            var URL      = (typeof url === 'undefined') ? '' : url;
            var postData = (typeof data === 'undefined') ? '' : data;

            $.ajax({
                type: "POST",
                url: URL,
                data: postData,
                dataType: 'html',
                success: function (data) {

                    //remove loading gif.
                    $('.ajax_loading_bigdark').remove();

                    //replace save button
                    $('.entry_save').append($btnSave);

                    $data = $(data);

                    var $errors = $data.find('.error');
                    if ($errors.length > 2) {
                        var $errorMsg = $data.find('.error').first();
                        NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                    }
                    else {
                        //let Nerd know their time was saved properly!
                        var $successMsg = $('<div />').text('Entry saved!').addClass('success');
                        NRD.TimesheetHelper.ui.displayMessage($successMsg);

                        NRD.TimesheetHelper.TimeManipulator.shiftTimes();

                        $('#notes').val('');
                        $('#TSEntryInline').html($data.find('#TSEntryInline').html());


                    }
                },
            });
        }
    };

    NRD.TimesheetHelper.ui = {
        _config: {
            messageDisplayTime: 1000 * 5,
            beforeSelector: '#TSEntryForm'
        },
        displayMessage: function ($element) {
            $element.insertBefore(this._config.beforeSelector);
            setTimeout(function () {
                $element.remove()
            }, this._config.messageDisplayTime);
        }
    };

    NRD.TimesheetHelper.init();

})(jQuery);