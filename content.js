var NRD = NRD || {};

(function () {
    NRD.TimesheetHelper = {
        center: function() {
            this.setDomItems();
            window.scrollTo(0, this.currentDomItems.$notes.offset().top - ($(window).height()/2));
        },
        _config: {
            keys: {
                ENTER: 13,
                SHIFT: 16,
                CTRL: 17,
                ALT: 18,
                ESC: 27,
                ARROW_LEFT: 37,
                ARROW_UP: 38,
                ARROW_RIGHT: 39,
                ARROW_DOWN: 40,
                DEL: 46
            },
            defaults: {

            },
            keyMappings: {

            },
            selectors: {
                notes: '[name="notes"]',
                startTime: '[name="start_time"]',
                endTime: '[name="end_time"]'
            }
        },
        setDomItems: function () {
            $notes = jQuery(this._config.selectors.notes);
            $notes = ($notes.length > 1) ? $notes.eq(1) : $notes.eq(0);
            $startTime = jQuery(this._config.selectors.startTime);
            $startTime = ($startTime.length > 1) ? $startTime.eq(1) : $startTime.eq(0);
            $endTime = jQuery(this._config.selectors.endTime);
            $endTime = ($endTime.length > 1) ? $endTime.eq(1) : $endTime.eq(0);
            this.currentDomItems = {'$notes': $notes, 'notes': $notes[0],
                '$startTime': $startTime, 'startTime': $startTime[0],
                '$endTime': $endTime, 'endTime': $endTime[0]};
            return this.currentDomItems;
        },
        _appState: {
            editingEntries: false
        },
        _keyState: {
            SHIFTdown: false,
            CTRLdown: false,
            ALTdown: false
        },
        init: function () {
            this._bind();
        },
        _bind: function () {
            var self = this;
            jQuery(this._config.selectors.notes).live('keydown',function (e) {
                var key = self.keyMappings.getKey(e);
                self.setDomItems();
                switch (key) {
                    case self._config.keys.CTRL:
                        self._keyState.CTRLdown = true;
                        self.currentDomItems.$endTime.css('background', 'yellow');
                        break;
                    case self._config.keys.SHIFT:
                        self._keyState.SHIFTdown = true;
                        self.currentDomItems.$startTime.css('background', 'yellow');
                        break;
                    case self._config.keys.ALT:
                        self._keyState.ALTdown = true;
                        break;
                    default:
                }
                    if (key == self._config.keys.ENTER && !self._keyState.CTRLdown && !self.EntryEditor.active) {
                        e.preventDefault();

                        //jQuery('#save_ts_entry_button').trigger('click');
                        jQuery('#TSEntryForm').submit();

                        return false;

                    } else if (self._keyState.CTRLdown && self._keyState.SHIFTdown && (key == self._config.keys.ARROW_UP || key == self._config.keys.ARROW_DOWN)) {
                        if (key == self._config.keys.ARROW_UP) {
                            self.TimeManipulator.increase(self.currentDomItems.$startTime);
                            self.TimeManipulator.increase(self.currentDomItems.$endTime);
                        } else {
                            self.TimeManipulator.decrease(self.currentDomItems.$startTime);
                            self.TimeManipulator.decrease(self.currentDomItems.$endTime);
                        }
                        updateRemainingTime(); //mainframe function.
                        return false;

                    } else if (self._keyState.CTRLdown && (key == self._config.keys.ARROW_UP || key == self._config.keys.ARROW_DOWN)) {
                        if (key == self._config.keys.ARROW_UP) {
                            self.TimeManipulator.increase(self.currentDomItems.$endTime);
                        } else {
                            self.TimeManipulator.decrease(self.currentDomItems.$endTime);
                        }
                        updateRemainingTime();
                        return false;

                    } else if (self._keyState.SHIFTdown && (key == self._config.keys.ARROW_UP || key == self._config.keys.ARROW_DOWN)) {
                        if (key == self._config.keys.ARROW_UP) {
                            self.TimeManipulator.increase(self.currentDomItems.$startTime);
                        } else {
                            self.TimeManipulator.decrease(self.currentDomItems.$startTime);
                        }
                        updateRemainingTime();
                        return false;

                    } else if (self._keyState.ALTdown && (key == self._config.keys.ARROW_DOWN || key == self._config.keys.ARROW_UP)) {

                        if (key == self._config.keys.ARROW_DOWN) {
                            self.EntryEditor.increaseRow();
                        } else {
                            self.EntryEditor.decreaseRow();
                        }

                        self.center();
                        self.currentDomItems.$notes.focus().select();

                    } else if (self.EntryEditor.active &&
                            (key == self._config.keys.ENTER ||
                            key == self._config.keys.ESC ||
                            key == self._config.keys.DEL)) {
                        e.preventDefault();
                        console.log('Entry editor is active');
                        //self.EntryEditor.setRow(jQuery('.entry_row').eq(self.EntryEditor.entryIndex));

                        if (key == self._config.keys.ENTER) {
                            //save the text.
                            console.log('ENTER was hit and ENTRY editor is active');
                            //self.EntryEditor.saveRowIfChanged();
                        } else if (key == self._config.keys.ESC) {
                            //Go back to entering a new entry
                            self.EntryEditor.reset();

                            self.center();
                            self.currentDomItems.$notes.focus();

                        } else if (key == self._config.keys.DEL && self._keyState.ALTdown) {
                            //delete the currently highlighted entry. (trigger click on delete button);
                            self.EntryEditor.unhighlightRow();
                            var $deleteButton = self.EntryEditor.$currentRow.find('.delete_entry');
                            var paramArray = $deleteButton.attr('href').split('(').splice(1)[0].replace(')', '').replace(', ', ',').replace(/'/gm, '').split(',');
                            var week = paramArray[0];
                            var row = paramArray[1];
                            var url = url = '/timesheet.php?&week_ending=' + week + '&delete=' + row;
                            self.EntryEditor.$currentRow.remove();
                            self.EntryEditor.highlightRow();

                            $.ajax({
                                type: "GET",
                                url: url,
                                success: function (data) {
                                    var $data = jQuery(data);
                                    var $successfullyDeletedRow = jQuery('<div />').text('Entry deleted!').addClass('success');
                                    self.ui.displayMessage($successfullyDeletedRow);

                                    self.EntryEditor.replaceEntryHTML($data);
                                }
                            });
                        }
                    }

            }).live('keyup', function (e) {
                    var key = NRD.TimesheetHelper.keyMappings.getKey(e);

                    switch (key) {
                        case self._config.keys.CTRL:
                            self._keyState.CTRLdown = false;
                            self.currentDomItems.$endTime.css('background', '');
                            break;
                        case self._config.keys.SHIFT:
                            self._keyState.SHIFTdown = false;
                            self.currentDomItems.$startTime.css('background', '');
                            break;
                        case self._config.keys.ALT:
                            self._keyState.ALTdown = false;
                            break;
                        default:
                    }
                });

            var $btnSave = jQuery('#save_ts_entry_button');

            //capture POST, change form POST to ajax post.
            jQuery('#TSEntryForm').submit(function (e) {
                e.preventDefault();
                var $this = jQuery(this);
                var formData = $this.serialize();

                $.ajax({
                    type: "POST",
                    url: '',
                    data: formData,
                    success: function (data) {

                        //remove loading gif.
                        jQuery('.ajax_loading_bigdark').remove();

                        //replace save button
                        jQuery('.entry_save').append($btnSave);

                        $data = jQuery(data);
                        //console.log(JSON.stringify(data));

                        var $errors = $data.find('.error');
                        if ($errors.length > 2) {
                            var $errorMsg = $data.find('.error').first();
                            NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                        }
                        else {
                            //let Nerd know their time was saved properly!
                            var $successMsg = jQuery('<div />').text('Entry saved!').addClass('success');
                            NRD.TimesheetHelper.ui.displayMessage($successMsg);

                            NRD.TimesheetHelper.TimeManipulator.shiftTimes(self.currentDomItems.$startTime, self.currentDomItems.$endTime);

                            self.currentDomItems.$notes.val('');
                            jQuery('#TSEntryInline').html($data.find('#TSEntryInline').html());


                        }
                    },
                    dataType: 'html'
                });
                return false;
            });
        } //end bind.
    };

    NRD.TimesheetHelper.EntryEditor = {
        active: false, // flag that says whether we're currently editing entries or not.
        entryIndex: -1, //keeps track of current index of row for entries
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
/*
                this.$currentRow.children().each(function (i, o) {
                    jQuery(o).css('background-color', '#FFFFCC');
                });
                */

                this._originalText = this.rowToString();
            }
        },
        unhighlightRow: function() {
            if (this.$currentRow !== null) {

                var tempText = this.$currentRow.find('.inline_text_edit').val();
                //remove the editing elements of the row.
                this.$currentRow.find('.cancel_edit').filter(function () {
                    return jQuery(this).css('display') !== 'none';
                }).click();

/*
                //unhighlight the current row
                this.$currentRow.children().each(function (i, o) {
                    jQuery(o).css('background-color', '');
                });
                */

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
            //this.active = true;
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
                success: function (data) {

                    $data = jQuery(data);

                    var $errors = $data.find('.error');
                    if ($errors.length > 2) {
                        var $errorMsg = $data.find('.error').first();
                        NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                    }
                    else {
                        //let Nerd know their time was saved properly!
                        var $successMsg = jQuery('<div />').text('Entry saved!').addClass('success');
                        NRD.TimesheetHelper.ui.displayMessage($successMsg);

                        self.replaceEntryHTML($data);

                    }
                },
                dataType: 'html'
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
                jQuery('#TSEntryInline').html($data.find('#TSEntryInline').html());
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
            var newValue = this.getNewTime(currentValue, value);
            $element.val(newValue);
        },
        decrease: function ($element, value) {
            value = (typeof value !== 'undefined') ? value * -1 : -15;
            var currentValue = this._getElementTime($element);
            var newValue = this.getNewTime(currentValue, value);
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


            jQuery('#orig_time_remaining').val(jQuery('#orig_time_remaining').val() - (timeDifference / 60));
            updateRemainingTime();
        }
    };

    NRD.TimesheetHelper.ajaxHelper = {
        submit: function (url, data, success) {
            var URL = (typeof url === 'undefined') ? '' : url;
            var postData = (typeof data === 'undefined') ? '' : data;
            $.ajax({
                type: "POST",
                url: URL,
                data: postData,
                success: function (data) {

                    //remove loading gif.
                    jQuery('.ajax_loading_bigdark').remove();

                    //replace save button
                    jQuery('.entry_save').append($btnSave);

                    $data = jQuery(data);

                    var $errors = $data.find('.error');
                    if ($errors.length > 2) {
                        var $errorMsg = $data.find('.error').first();
                        NRD.TimesheetHelper.ui.displayMessage($errorMsg);
                    }
                    else {
                        //let Nerd know their time was saved properly!
                        var $successMsg = jQuery('<div />').text('Entry saved!').addClass('success');
                        NRD.TimesheetHelper.ui.displayMessage($successMsg);

                        NRD.TimesheetHelper.TimeManipulator.shiftTimes();

                        jQuery('#notes').val('');
                        jQuery('#TSEntryInline').html($data.find('#TSEntryInline').html());


                    }
                },
                dataType: 'html'
            });
        }
    };

    NRD.TimesheetHelper.keyMappings = {
        getKey: function (e) {
            return (e.keyCode ? e.keyCode : e.which);
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
})();