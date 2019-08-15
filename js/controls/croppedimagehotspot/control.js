var EditorControl_croppedimagehotspot = (function() {

    var editor;
    var control;
    var num=0;

    function EditorControl_croppedimagehotspot(editorInstance) {
        editor = editorInstance; 
        control = this;
        control.activePromise = null;
    }

    // any one-time actions, when plugin is loaded
    EditorControl_croppedimagehotspot.load = function() {
        $('head').append('<link rel="stylesheet" href="js/controls/croppedimagehotspot/control'+designer.rvt+'.css" />');

        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_croppedimagehotspot.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
        $control.addClass("croppedimagehotspotcontrol");
        
        var config = settings['control'] || {};
        
        var editBtn = $('<div class="widebutton" data-mui="croppedimagehotspot_editImgHot">Edit Image Hot Spots</div>');
        editBtn.click(function(e,t){editButton_click(ctlid, panelKey, controlKey, settings)} );
        designer.applyMui(editBtn);
        $control.append(editBtn);

        var inp = $('<textarea></textarea>').attr('rows', 9).hide();
    	inp.attr('data-bind', "valueUpdate: 'afterkeydown', value: "+ panelKey + "." + controlKey + ".val.grid");
        $control.append(inp);
        
        return $.when();
    }

    function editButton_click(ctlid, panelKey, controlKey, settings) {
        var $control = $('#' + ctlid);
        var gridvaltxt = $control.find("[data-bind$='val.grid']"          ).eq(0).val() || '';
        var gridvals= JSON.parse(gridvaltxt);
        displayEditor(gridvals, ctlid, panelKey, controlKey, settings).done(function(newContent) {
            if(newContent === null) //if canceled. user may add empty text and save, so must be ===null
                return;

            $control.find("[data-bind$='val.grid']"          ).eq(0).val(newContent).trigger('keydown')
        }).fail(function(e){
            console.log(e);
        }).always(function(){
            destroyEditor();
        })
        
    }

    function displayEditor(gridvals, ctlid, panelKey, controlKey, settings) {
        //build the editor and insert it into the page (will be removed after save/cancel)
        var dialogTemplate = 
        '<div class="croppedimagehotspot container">'+
            '<div class="editor-area">'+
                '<div class="panel-buttons">'+
                    '<div class="button-group">'+
                      '<button type="button" id="grid_clearall" data-role="0" ><div><b data-mui="croppedimagehotspot_clearAll">Clear All</b></div></button>'+
                    '</div>'+
                    '<div class="button-group">'+
                      '<button type="button" id="grid_0" data-role="0" ><div><b>[&nbsp;&nbsp;]</b></div></button>'+
                      '<button type="button" id="grid_1" data-role="1" ><div style="color:green"><b>[1]</b></div></button>'+
                      '<button type="button" id="grid_2" data-role="2" ><div><b>[2]</b></div></button>'+
                      '<button type="button" id="grid_3" data-role="3" ><div><b>[3]</b></div></button>'+
                      '<button type="button" id="grid_4" data-role="4" ><div><b>[4]</b></div></button>'+
                      '<button type="button" id="grid_5" data-role="5" ><div><b>[5]</b></div></button>'+
                      '<button type="button" id="grid_6" data-role="6" ><div><b>[6]</b></div></button>'+
                      '<button type="button" id="grid_7" data-role="7" ><div><b>[7]</b></div></button>'+
                      '<button type="button" id="grid_8" data-role="8" ><div><b>[8]</b></div></button>'+
                    '</div>'+
                '</div>'+
                '<div class="editor" >'+
                    '<div class="grid">'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                        '<div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>'+
                    '</div>'+
                '</div>'+
                '<div class="htmlview"></div>'+
            '</div>'+
        '</div>';

        var $dialog = $('<div class="hotspot-dialog"><div class="hotspot-tool"></div></div>');
        
        $('<div class="hotspot-controls">')
            .append('<div class="hotspot-save" data-mui="designer_ui_save">Save</div>')
            .append('<div class="hotspot-cancel" data-mui="designer_ui_cancel">Cancel</div')
            .appendTo($dialog);



        var gridui=$(dialogTemplate);
        //wsw.css({top:50,right:280,left:100,bottom:0});
        
        $dialog.find(".hotspot-tool").append(gridui);

        var $shape = $('.pg-edit .lesson.preview > div');
        var top =    $shape.offset().top*1;
        var left =   $shape.offset().left*1;
        var width =  $shape.width();
        var height = $shape.height();

        //if control provides custom size (to overlay just the area) apply it
        if(settings.control['position']) { 
            let type = settings.control.position.type || "default";
            
            if(type == "default") {
                let p  = settings.control.position;
                top   += p.top*1;
                left  += p.left*1;
                width  = p.width*1;
                height = p.height*1;
            }
            //top +=0;left+=0;width-=0;height-=280;
        }

        var tool= $dialog.find(".hotspot-tool .editor");
        tool.offset({top:top,left:left})
        tool.width(width);
        tool.height(height);


        //apply grid tool.append(content);
        var $cells = $dialog.find('.grid > div > div');
        for(var j=0, xy=0;j<gridvals.length;j++)
            for(var i=0;i<gridvals[0].length;i++)
                $cells.eq(xy++).addClass('c'+gridvals[j][i]);//xy works because this is order jquery finds them

        designer.applyMui($dialog);
        $('.pg-edit').append($dialog);
        $('#grid_1').click();

        $('.pg-edit').on('click', '.croppedimagehotspot .grid > div > div', function(){
            $(this).attr('class', 'c'+num);
        })

        control.activePromise = $.Deferred();
        return control.activePromise;

    }

    // these functions control stuff that happens while the editor is open. they assume there is 
    // only ever one editor in the page. The editor is created and destroyed each time it opens, 
    // so it is correct.

    $('.pg-edit').on('click', '.hotspot-save', function() {
        var $dialog = $('.pg-edit .croppedimagehotspot .editor');
        var gridvals=[];
        var $cells = $dialog.find('.grid > div > div');
        var h = $dialog.find('.grid').children().length
        var w = $dialog.find('.grid').children().eq(0).children().length
        for(var j=0, xy=0;j<h;j++) {
            gridvals.push([])
            for(var i=0;i<w;i++)
                gridvals[j].push($cells.eq(xy++).attr('class').replace('c','')*1);//xy works because this is order jquery finds them
        }

        control.activePromise.resolve(JSON.stringify(gridvals));
    });

    $('.pg-edit').on('click', '.hotspot-cancel', function() {
        control.activePromise.resolve(null);
    });

    function destroyEditor() {
        $('.hotspot-dialog').remove();
    }

    
    $('.pg-edit').on('click', '.editor-area button', function(){
        var id = $(this).attr('id');
        var clickedbtn = id.replace("grid_",'');
        
        if(clickedbtn=="clearall") {
            $('.pg-edit .croppedimagehotspot .grid > div > div[class^="c"').attr("class", '');
            return;
        }
        
        num = clickedbtn;
        $('.pg-edit .croppedimagehotspot .grid').css({"cursor": "url(js/controls/croppedimagehotspot/"+ num +".svg) 12 12, pointer"})

    });

    $('.pg-edit').on('keyup','.croppedimagehotspot',function(){
        //check if key is pressed like 1 2 3 4 5 on keyboard
    });

    return EditorControl_croppedimagehotspot;

}());