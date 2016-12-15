'use strict';

var $ = require('jquery');
var ListItemControl = require('./listitemcontrol');
var FormatDef = require('./formatdef');


var ListItemVariableLabel = function(params) {

    ListItemControl.extendTo(this, params);

    this.registerSimpleProperty("format", FormatDef.variable);

    this.onUpdateView = function(data, format, properties) {
        var imageClasses = 'silky-variable-type-img';
        if (properties.root !== null && properties.root.type !== undefined)
            imageClasses = imageClasses + ' silky-variable-type-' + properties.root.type;
        else
            imageClasses = imageClasses + ' silky-variable-type-none';

        this.$el.find(".silky-variable-type-img").removeClass().addClass(imageClasses);
        var $label = this.$el.find(".silky-list-item-value");
        $label.empty();
        if (data !== null)
            $label.append(format.toString(data));
    };

    this.onRender = function(data, format, properties) {
        var imageClasses = 'silky-variable-type-img';
        if (properties.root !== null && properties.root.type !== undefined)
            imageClasses = imageClasses + ' silky-variable-type-' + properties.root.type;
        else
            imageClasses = imageClasses + ' silky-variable-type-none';

        var $item = $('<div style="white-space: nowrap;" class="silky-list-item silky-format-variable"></div>');
        $item.append('<div style="display: inline-block; overflow: hidden;" class="' + imageClasses + '"></div>');

        var displayValue = "";
        if (data !== null)
            displayValue = format.toString(data);
        $item.append('<div style="white-space: nowrap;  display: inline-block;" class="silky-list-item-value">' + displayValue + '</div>');

        this.$el.append($item);
    };
};

module.exports = ListItemVariableLabel;
