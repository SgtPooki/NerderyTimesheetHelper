(function($, undefined) {
    /**
     * Switch the contents of the element to an input field
     */
    $.fn.switchToInput = function() {
        return this.each(function() {

            $(this).data('previous_value', $(this).html());

            if (!$(this).hasClass('editing') && !$(this).hasClass('noneditable')) {
                // this is old school so that if the description has an apostrophe, it doesn't break.
                var newInput = document.createElement('input');
                newInput.setAttribute('type', 'text');
                newInput.setAttribute('class', 'text inline_time_edit');
                newInput.setAttribute('name', $(this).attr('class'));
                $(newInput).val($.trim($(this).text()));

                $(this).empty();
                $(this).append(newInput);
            }
            $(this).addClass('editing');
        });
    };

    /**
     * Switch the contents of the element to a text area
     * @param rows
     * @param cols
     */
    $.fn.switchToTextArea = function(rows, cols) {
        if (!rows) { rows = 3; }
        if (!cols) { cols = 20; }

        return this.each(function() {

            $(this).data('previous_value', $(this).html());

            if (!$(this).hasClass('editing') && !$(this).hasClass('noneditable')) {

                var textarea = $("<textarea class='inline_text_edit' />")
                                    .attr({rows:rows, cols:cols, name:$(this).attr('class')})
                                    .val( $.trim($(this).text()) );
                $(this).html(textarea);

            }
            $(this).addClass('editing');
        });
    };

    /**
     * Switch the contents of the element to a hidden field
     */
    $.fn.switchToHidden = function() {
        return this.each(function() {
            $(this).data('previous_value', $(this).html());

            if (!$(this).hasClass('editing') && !$(this).hasClass('noneditable')) {

                $(this).html("<input type='hidden' name='"+$(this).attr('class')+"' value='"+$.trim($(this).text())+"' />");

            }
            $(this).addClass('editing');
        });
    };
})(jQuery);