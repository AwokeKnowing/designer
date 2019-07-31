var EditorControl_image = (function() {

    var editor;
    var control;
    
    function EditorControl_image(editorInstance) {
        editor = editorInstance; 
        control = this;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_image.load = function() {
        
        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_image.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
    	//image src
    	var inp = $('<input type="text">');
    	inp.attr('data-bind', "value: "+ panelKey + "." + controlKey + ".val, valueUpdate: 'afterkeydown'");
        $control.append(inp);
       
        return $.when();
    }

    return EditorControl_image;

}());