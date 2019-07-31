var EditorControl_textarea = (function() {

    var editor;
    var control;

    function EditorControl_textarea(editorInstance) {
        editor = editorInstance; 
        control = this;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_textarea.load = function() {

        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_textarea.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
    	var config = settings['control'] || {};
        
        var rows = config['rows'] || 3;
        
        var inp = $('<textarea></textarea>').attr('rows', rows);
    	inp.attr('data-bind', "value: "+ panelKey + "." + controlKey + ".val, valueUpdate: 'afterkeydown'");
        $control.append(inp);
        
        return $.when();
    }

    return EditorControl_textarea;

}());