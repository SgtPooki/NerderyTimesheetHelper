// ==UserScript==
// @name		Nerdery TimeSheet helper
// @require		http://code.jquery.com/jquery-1.9.1.min.js
// @namespace	http://use.i.E.your.homepage/
// @version		0.5
// @description helpful things when using the nerdery's timesheet
// @match		https://mainframe.nerdery.com/timesheet.php*
// @copyright	2012+, Russell Dempsey
// ==/UserScript==



/*
 * To-Do:
 *DONE** Block submit while a submit is still processing (OR allow multiple time entries to be submitted at the same time by updating input fields before return results of ajax post. IF there was an error, add to array and require fixing of errors prior to submitting another entry)
 * add quick ajax posting ability to all timesheet fields (remove timesheet entry, etc..)
 *DONE** aad ability to up/down arrow to increase or decrease the time set. (when focused on time entries): jQuery('#start_time2').unbind()
 * allow up and down arrow (with ALT) to scroll through previous timesheet logs and either delete or edit them. (edit with enter, delete with
 *DONE** automatically set times to the most appropriate time slots (from last submitted time to blank)
 * Make window scroll when the trying to edit entries and the element is lower than the screen
 * finish
 *
 *
 */

jQuery(function() {
var ENTER = 13;
var CTRL = 17;
var SHIFT = 16;
var ALT = 18;
var ARROW_LEFT = 37;
var ARROW_UP = 38;
var ARROW_RIGHT = 39;
var ARROW_DOWN = 40;
var ESC = 27;
var DEL = 46;

var CTRLdown = false;
var SHFTdown = false;
var ALTdown = false;

var $endTime = jQuery('.entry_end > input');
var $startTime = jQuery('.entry_start > input');

var entryIndex = -1;
var editingEntries = false;

jQuery('.time_entry_inputs').live('keydown', function(e){
    var key = getKey(e);

    switch (key)
    {
        case CTRL:
            CTRLdown = true;
            $endTime.css('background', 'yellow');
            break;
        case SHIFT:
            SHFTdown = true;
            $startTime.css('background', 'yellow');
            break;
        case ALT:
            ALTdown = true;
            break;
        default:
    }
}).live('keyup', function(e){
        var key = getKey(e);

        switch (key)
        {
            case CTRL:
                CTRLdown = false;
                $endTime.css('background', '');
                break;
            case SHIFT:
                SHFTdown = false;
                $startTime.css('background', '');
                break;
            case ALT:
                ALTdown = false;
                break;
            default:
        }
    });


jQuery('#notes').live('keydown', function(e){
    var key = getKey(e);
    if(key == ENTER && !CTRLdown && !editingEntries ) {
        e.preventDefault();

        jQuery('#save_ts_entry_button').trigger('click');

        return false;

    } else if (CTRLdown && SHFTdown && (key == ARROW_UP || key == ARROW_DOWN)) {
        if (key == ARROW_UP) {
            incrementEndTime();
            incrementStartTime();
        } else {
            decrementEndTime();
            decrementStartTime();
        }
        updateRemainingTime();
        return false;

    } else if (CTRLdown && (key == ARROW_UP || key == ARROW_DOWN)) {
        if (key == ARROW_UP) {
            incrementEndTime();
        } else {
            decrementEndTime();
        }
        updateRemainingTime();
        return false;

    } else if (SHFTdown && (key == ARROW_UP || key == ARROW_DOWN)) {
        if (key == ARROW_UP) {
            incrementStartTime();
        } else {
            decrementStartTime();
        }
        updateRemainingTime();
        return false;

    } else if (ALTdown && (key == ARROW_DOWN || key == ARROW_UP)) {

        //we're going down/up to edit the previously entered entries.
        var numberOfEntries = jQuery('.entry_row').length;
        var $cancelButton = jQuery('.entry_row').eq(entryIndex).find('.cancel_edit').filter(function(){return jQuery(this).css('display') !== 'none';});

        if ($cancelButton.length === 1) {
            $cancelButton.click();
        }

        //unhighlight the previous element (or fail..)
        jQuery('.entry_row').eq(entryIndex).children().each(function(i,o){ jQuery(o).css('background-color', '');});

        //increment entry index
        if (key == ARROW_DOWN) {
            entryIndex++;
        } else {
            entryIndex--;
        }


        if (entryIndex <= -1) {
            entryIndex = -1;
            editingEntries = false;
            return;
        } else if (entryIndex >= numberOfEntries) {
            entryIndex = numberOfEntries-1;
        }

        //highlight the entry
        jQuery('.entry_row').eq(entryIndex).children().each(function(i,o){ jQuery(o).css('background-color', '#FFFFCC');});

        jQuery('.entry_row').eq(entryIndex).find('.edit_entry').trigger('click');
        editingEntries = true;

    } else if (editingEntries && (key == ENTER || key == ESC || key == DEL)) {
        e.preventDefault();
        var $currentRow = jQuery('.entry_row').eq(entryIndex);

        if (key == ENTER) {
            //save the text.
        } else if (key == ESC) {
            //Go back to entering a new entry
            $currentRow.children().each(function(i,o){ jQuery(o).css('background-color', '');});
            jQuery('.entry_row').eq(entryIndex).find('.cancel_edit').trigger('click');
            entryIndex = -1;
            jQuery('#notes').focus();
        } else if (key == DEL && ALTdown) {
            //delete the currently highlighted entry. (trigger click on delete button);
            jQuery('.entry_row').eq(entryIndex).find('.cancel_edit').trigger('click');
            var $deleteButton = $currentRow.find('.delete_entry');
            var paramArray = $deleteButton.attr('href').split('(').splice(1)[0].replace(')', '').replace(', ', ',').replace(/'/gm, '').split(',');
            var week = paramArray[0];
            var row = paramArray[1];
            var url = url = '/timesheet.php?ts_user=rdempsey&week_ending=' + week + '&delete=' + row;
            $currentRow.remove();
            //jQuery('.entry_row').eq(entryIndex).children().each(function(i,o){ jQuery(o).css('background-color', '#FFFFCC');});
            //jQuery('.entry_row').eq(entryIndex).find('.edit_entry').trigger('click');

            $.ajax({
                type: "GET",
                url: url,
                success: function(data){
                    var $data = jQuery(data);
                    var $successfullyDeletedRow = jQuery('<div />').text('Entry deleted!').addClass('success');
                    displayMessage($successfullyDeletedRow);
                    jQuery('#TSEntryInline').html($data.find('#TSEntryInline').html());
                    jQuery('.entry_row').eq(entryIndex).children().each(function(i,o){ jQuery(o).css('background-color', '#FFFFCC');});
                    jQuery('.entry_row').eq(entryIndex).find('.edit_entry').trigger('click');

                }
            });

        }
        return false;
    }

});


//save save button to allow us to be able to regenerate it after ajax load
var $btnSave = jQuery('#save_ts_entry_button');

//capture POST, change form POST to ajax post.
jQuery('#TSEntryForm').submit(function(e){

    e.preventDefault();
    var $this = jQuery(this);
    var formData = $this.serialize();
    console.log(formData);

    $.ajax({
        type: "POST",
        url: '',
        data: formData,
        success: function(data){

            //remove loading gif.
            jQuery('.ajax_loading_bigdark').remove();

            //replace save button
            jQuery('.entry_save').append($btnSave);

            $data = jQuery(data);
            //console.log(JSON.stringify(data));

            var $errors = $data.find('.error');
            if ($errors.length > 2)
            {
                var $errorMsg = $data.find('.error').first();
                displayMessage($errorMsg);
            }
            else
            {
                //let Nerd know their time was saved properly!
                var $successMsg = jQuery('<div />').text('Entry saved!').addClass('success');
                displayMessage($successMsg);

                setNextTimes();

                jQuery('#notes').val('');
                jQuery('#TSEntryInline').html($data.find('#TSEntryInline').html());


            }
        },
        dataType: 'html'
    });
    return false;
});

function getKey(e)
{
    return (e.keyCode ? e.keyCode : e.which);
}

function setNextTimes() {

    //timeArr = "6:30 PM".split(' '); timeArr[0] = timeArr[0].split(':')

    var time = jQuery('#end_time2').val();
    var endTime = Date.parse(time);

    var startTime = Date.parse(jQuery('#start_time2').val());

    var timeDifference = (endTime - startTime) / 1000 / 60;
    var newEndTime = new Date(endTime.getTime() + timeDifference *60000);

    var amOrPm = '';


    var endHour = newEndTime.getHours();
    var endMin = newEndTime.getMinutes();

    var newEndTimeString = endHour + ':' + ((endMin === 0) ? '00' : endMin) + ' ' + newEndTime.toString('tt');
    var newEndTimeString = timesheetFormat(newEndTime); //.toString('h:mm tt');


    //empty timesheet input fields.
    jQuery('#start_time2').val(jQuery('#end_time2').val());
    jQuery('#end_time2').val(newEndTimeString);


    jQuery('#orig_time_remaining').val(jQuery('#orig_time_remaining').val() - (timeDifference/60));
    updateRemainingTime();
}

function timesheetFormat(value) {
    return value.toString('h:mm tt');
}

function incrementBy15Min(value) {
    var result = new Date(value.getTime() + 15 * 60000);
    return timesheetFormat(result);
}
function decrementBy15Min(value) {
    var result = new Date(value.getTime() - 15 * 60000);
    return timesheetFormat(result);
}
function incrementEndTime() {
    var currentEndTime = Date.parse($endTime.val());
    $endTime.val(incrementBy15Min(currentEndTime));
}
function decrementEndTime() {
    var currentEndTime = Date.parse($endTime.val());
    $endTime.val(decrementBy15Min(currentEndTime));
}
function incrementStartTime() {
    var currentStartTime = Date.parse($startTime.val());
    $startTime.val(incrementBy15Min(currentStartTime));
}
function decrementStartTime() {
    var currentStartTime = Date.parse($startTime.val());
    $startTime.val(decrementBy15Min(currentStartTime));
}
function displayMessage($element) {
    $element.insertBefore('#TSEntryForm');
    setTimeout(function(){$element.remove()}, 5000);
}
});