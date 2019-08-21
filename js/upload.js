function Uploader(settings, uploadDoneCallback){
  var s = settings;
  var formAction = "https://api.knowledgecity.com/v2/external/apps/designer/accounts/" + settings.accountId + "/assets"
  //var formAction = "https://api.knowledgecity.com/v2/echo"
  var assets;
  formFields = {
      "token":         s.token,
      "lang":          s.lessonLang
  }

  var fileSizeLimit = 30; // In MB

  function fileDragHover(e) {
    var fileDrag = document.getElementById('upload_file-drag');
    e.stopPropagation();
    e.preventDefault();
    fileDrag.className = (e.type === 'dragover' ? 'hover' : 'modal-body file-upload');
  }
  function fileSelectHandler(e) {
    var files = e.target.files || e.dataTransfer.files;// Fetch FileList object
    fileDragHover(e);// Cancel event and hover styling
    for (var i = 0, f; f = files[i]; i++) { // Process all File objects
      parseFile(f);
      uploadFile(f);
    }
  }
  function output(msg) {
    var m = document.getElementById('upload_messages');    // Response
    m.innerHTML = msg;
  }
  function parseFile(file) {
    console.log(file.name);
    output('<strong>' + encodeURI(file.name) + '</strong>');
    // var fileType = file.type;
    // console.log(fileType);
    var imageName = file.name;
    var isGood = (/\.(?=gif|jpg|png|jpeg)/gi).test(imageName);
    if (isGood) {
      document.getElementById('upload_start').classList.add("hidden");
      document.getElementById('upload_response').classList.remove("hidden");
      document.getElementById('upload_notimage').classList.add("hidden");
      // Thumbnail Preview
      document.getElementById('upload_file-image').classList.remove("hidden");
      document.getElementById('upload_file-image').src = URL.createObjectURL(file);
    } else {
      document.getElementById('upload_file-image').classList.add("hidden");
      document.getElementById('upload_notimage').classList.remove("hidden");
      document.getElementById('upload_start').classList.remove("hidden");
      document.getElementById('upload_response').classList.add("hidden");
      
      //reset the form
      document.getElementById("upload_file-upload-form").reset();
    }
  }

  function resetForm() {
    document.getElementById('upload_file-image').classList.add("hidden");
    document.getElementById('upload_notimage').classList.remove("hidden");
    document.getElementById('upload_start').classList.remove("hidden");
    document.getElementById('upload_response').classList.add("hidden");
    
    //reset the form
    document.getElementById("upload_file-upload-form").reset();
  }
  function setProgressMaxValue(e) {
    var pBar = document.getElementById('upload_file-progress');
    if (e.lengthComputable)
      pBar.max = e.total;
    $(".loading").show();
  }
  function updateFileProgress(e) {
    var pBar = document.getElementById('upload_file-progress');
    if (e.lengthComputable)
      pBar.value = e.loaded;
  }

  function uploadFile(file) {
    
    if(s.isDemo) {
      setTimeout(function(){
        resetForm();
        document.getElementById('upload_notimage').innerHTML='<div style="color:#cc6666">'+designer.mui.uiLang['designer_ui_upImgDemoNote']+'</div>';
      },2000)
      
      return;
    }
    var xhr = new XMLHttpRequest()
    var pBar = document.getElementById('upload_file-progress');

    if (xhr.upload) {
      // Check if file is less than x MB
      if (file.size <= fileSizeLimit * 1024 * 1024) {
        // Progress bar
        pBar.style.display = 'inline';
        xhr.upload.addEventListener('loadstart', setProgressMaxValue, false);
        xhr.upload.addEventListener('progress', updateFileProgress, false);

        // File received / failed
        xhr.onreadystatechange = function(e) {
          if (xhr.readyState == 4) {
            // Everything is good!
            var results = {
              "assets": assets
            }
            uploadDoneCallback(results);
            resetForm();
            // progress.className = (xhr.status == 200 ? "success" : "failure");
            // document.location.reload(true);
          }
        };


        //formAction+="?_=1";
        //for(let key in formData)
        //  formAction+="&"+key+"="+encodeURIComponent(formData[key])
        
        // Start upload
        xhr.open('POST', formAction, true);
        var formData = new FormData();
        formData.append('files[]', file);
        formData.append('token', formFields.token);
        formData.append('lang', formFields.lang);

        //for now, just one.
        assets = [
          {
            "txtid":file.name, 
            "type":"image", //only images for now
            "added": ~~(Date.now()/1000),
            "tags": ["uploaded"],
            "title": file.name,
            "mime":file.type, 
            "file":file.name,
            "size":file.size,
            "about": "uploaded ("+ ~~(10*file.size/1024)/10 +" KB)"
          }
        ];

        for(let i=0;i<assets.length;i++) {
          for (let key in assets[i]) {
            if(Array.isArray(assets[i][key])){
              //eg tags:[]
              for(let j=0;j<assets[i][key].length;j++)
                formData.append('assets['+i+']['+key+'][]', assets[i][key][j]);
            } else {
              formData.append('assets['+i+']['+key+']', assets[i][key]);
            }
          }
        }

        xhr.send(formData);
      } else {
        output('Please upload a smaller file (< ' + fileSizeLimit + ' MB).');
      }
    }
  }

  function Init() {
    console.log("Upload Initialised");
    var fileSelect    = document.getElementById('upload_file-upload'),
        fileDrag      = document.getElementById('upload_file-drag'),
        submitButton  = document.getElementById('upload_submit-button');
    fileSelect.addEventListener('change', fileSelectHandler, false);
    // Is XHR2 available?
    var xhr = new XMLHttpRequest();
    if (xhr.upload) {
      // File Drop
      fileDrag.addEventListener('dragover', fileDragHover, false);
      fileDrag.addEventListener('dragleave', fileDragHover, false);
      fileDrag.addEventListener('drop', fileSelectHandler, false);
    }
  }

  // Check for the various File API support.
  if (window.File && window.FileList && window.FileReader) {
    Init();
  } else {
    document.getElementById('upload_file-drag').style.display = 'none';
  }


}