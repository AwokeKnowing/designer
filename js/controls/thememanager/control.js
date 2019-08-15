var EditorControl_thememanager = (function() {

    var editor;
    var control;

    function EditorControl_thememanager(editorInstance) {
        editor = editorInstance; 
        control = this;

        control.themeGroups = {};
        control.themeProperties = [
            "backgroundColor",
            "accentColor",
            "accentColorText",
            "questionBackgroundColor",
            "answerBackgroundColor",
            "questionColor",
            "answerColor"
        ]
    }

    // any one-time actions, when plugin is loaded
    EditorControl_thememanager.load = function() {
        $('head').append('<link rel="stylesheet" href="js/controls/thememanager/control'+designer.rvt+'.css" />');
        return $.when();
    }

    //called each time this type of control is encountered
    EditorControl_thememanager.prototype.build = function(ctlid, panelKey, controlKey, settings) {
    	var $control = $('#' + ctlid);
    	var config = settings['control'] || {};
        
        
        var thm  = $('<div class="thememanager"></div>');
        var sb   = $('<div class="select-box"><div class="sb-button sb-save">Save as<br>New Theme</div><div class="sb-button sb-drop" data-mui="thememanager_applyTheme">Apply a Theme</div></div>');
        var opts = $('<div class="sb-options hidden" ></div>');

        sb.append(opts)
        thm.append(sb)

        thm.on('click', '.sb-button.sb-drop',function(){


            if($(".thememanager .sb-options").hasClass('hidden')){
                //we're opening
                control.currentTheme = getCurrentTheme(); //save it in case they cancel
                //todo check if page is clean (no saves needed) and restore as clean if no changes are made

                $(".thememanager .sb-options").removeClass('hidden')

            } else {
                //we're closing (escaping without selecting something)
                $(".thememanager .sb-options").addClass('hidden')

                //restore previous  (todo make page not dirty if it was not dirty before);
                for(var themeProp in control.currentTheme)
                    $('#panel-theme-'+themeProp+' input').val(control.currentTheme[themeProp]).trigger('keydown');
            }

        })

        //handle clicking on one of the themes in dropdown box
        thm.on('click', '.sb-options > div',function(){
            //update Apply Theme button icon
            $('.pg-edit .thememanager .sb-button.sb-drop').css('backgroundImage', getThemeIcon(getCurrentTheme()));

            $(".thememanager .sb-options").addClass('hidden')
            return false;
        })

        //hover on a theme in dropdown box
        thm.on('mouseenter', '.sb-options > div',function(){
            var theme = $(this).attr('data-val');

            //find theme data and apply properties
            for (var themeGroup in control.themeGroups)
                if(theme in control.themeGroups[themeGroup])
                    for(var themeProp in control.themeGroups[themeGroup][theme].properties)
                        $('#panel-theme-'+themeProp+' input').val(control.themeGroups[themeGroup][theme].properties[themeProp]).trigger('keydown');
                
            //$(".thememanager .sb-options").toggle()
            return false;
        })

        designer.applyMui(thm);
        $control.append(thm);
        
        getThemeGroups().done(function() {
            //build dropdown list
            var opts = $('.pg-edit .thememanager .sb-options');

            //update Apply Theme button icon
            $('.pg-edit .thememanager .sb-button.sb-drop').css('backgroundImage', getThemeIcon(getCurrentTheme()));
            

            for (themeGroup in control.themeGroups) {
                var sectionTitle = $('<h3></h3>').html(designer.mui.uiLang[themeGroup]||themeGroup)
                opts.append(sectionTitle)

                for(var theme in control.themeGroups[themeGroup]) {
                    var themeData = control.themeGroups[themeGroup][theme]
                    var title = themeData.title || "";
                    title = designer.mui.uiLang[title] || title;

                    var opt = $('<div>').attr('data-val', theme).html(title);
                    opt.css('backgroundImage',getThemeIcon(themeData.properties))
                    if(!title)
                        opt.addClass("justicon");

                    opts.append(opt);
                }
            }

        });
        
        return $.when();
    }


    function getThemeGroups() {
        var prom = $.Deferred();
        
        var themeGroups = {};

        //https://colorschemedesigner.com/csd-3.5/#0041T6uE8w0w0
        $.ajax({url:"js/controls/thememanager/themegroups"+designer.rvt+".json", cache:true, dataType:"json"}).done(function(r) {
            control.themeGroups = r;

            //todo get custom themes from account

            prom.resolve(themeGroups);
        });

        return prom;
    }

    function getCurrentTheme() {
        var theme = {}
        for (let i=0;i<control.themeProperties.length;i++)
            theme[control.themeProperties[i]] = $('#panel-theme-'+control.themeProperties[i]+' input').val()
        
        return theme
    }


    function getThemeIcon(themeProperties){
        var props = control.themeProperties
        var icon = [//values are index position in props array above
            [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
            [3,3,3,5,3,5,3,3,5,5,3,3,3,5,5,3,5,3,5,3,5,5,3,3,5,5,3,3,3,3,3,3],
            [3,3,3,5,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,5,3,3,3,3],
            [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
            [3,3,3,3,3,5,3,3,5,5,3,5,3,5,3,5,5,3,3,3,5,5,3,3,5,3,5,3,3,3,3,3],
            [3,3,3,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,3,5,5,5,5,3,3,3,3,3],
            [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
            [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,2,1,2,1,1,2,2,1,1,1,2,2,1,2,1,2,1,2,2,1,1,2,2,1,1,1,1,1,1],
            [1,1,1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,6,4,6,4,4,6,6,4,4,4,6,6,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,6,6,6,6,4,6,6,6,4,6,6,6,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,6,6,4,4,4,6,6,4,4,6,4,6,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,6,6,6,4,6,6,6,4,6,6,6,6,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
      
        var canvas = document.createElement("canvas");
        canvas.setAttribute('width' ,32);
        canvas.setAttribute('height',32);
        var ctx = canvas.getContext('2d');

        for(let y=0;y<icon.length;y++)
            for(let x=0;x<icon[y].length;x++)
                ctx.fillStyle = themeProperties[props[icon[y][x]]],ctx.fillRect(x, y, 1, 1);

        return 'url(' + canvas.toDataURL() + ')';
      
    }


    return EditorControl_thememanager;

}());