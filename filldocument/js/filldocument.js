var FillDocument = (function() {

  var QtipDefaultClasses = "qtip-sendsign qtip-shadow qtip-rounded";

  var $tooltipDiv;
  var $stepsDiv;
  var $signatureDiv;
  var pagesJSON;

  var canvasIE8 = !$('<canvas></canvas>')[0].getContext;
  
  // Control if any sign has already been entered
  var signControl = {
    signed : function () {
      return this.draw || this.write;
    },
    draw: false,
    write: false
  };
  
  // Check total number of tooltips
  var numberOfSteps;
  var remainingSteps;

  // Track selected step, begin with welcome selected step
  var selectedStep = 0;

  // Array of steps to complete
  var steps = [];

  // Track relation between fields and steps
  var fieldSteps = {};

  // Track relation between signature fields and signature divs
  var fieldSign = {};

  var HTML = {
      bottomMessage: {
          inProcess: "You need to fill in <span class='bottomMessageLink spanClickable'>? more field</span> before you can ",
          completed: "Thank you. Now you can "
      },
      pdfFields: {
          page: '<div class="PDFPage" pagenr="?"></div>',
          img: '<img class="documentIMG" src="?"/>',
          sign: '<div id="?" class="PDFField" typeOfField="sign">' +
                  '<div id="?Field" class="innerPDFField signPDFField inputPDFField">' +
                    '<input type="image" id="?Image" src="images/signIcon.png" class="signIcon" onclick="return false;"></input>' +
                    '<input type="text" id="?FakeValidation" name="?FakeValidation" class="fakeValidation required" style="display:none"></input>' +
                  '</div>' +
                  '<div id="?SignContainer" class="signContainer">' +
                  '</div>' +
                '</div>',
          comment: '<div id="?" class="PDFField" typeOfField="comment">' +
                     '<textarea id="?Field" name="?Field" class="innerPDFField commentPDFField inputPDFField required"></textarea>' +
                   '</div>',
          email: '<div id="?" class="PDFField" typeOfField="email">' +
                   '<textarea id="?Field" name="?Field" class="innerPDFField emailPDFField inputPDFField required email"></textarea>' +
                 '</div>',
          date: '<div id="?" class="PDFField" typeOfField="date">' +
                  '<span id="?Field" class="innerPDFField datePDFField">Date: </span>' +
                '</div>'
      }
      //canvas: '<div class="signatureCanvasWrapper"></div><canvas class="signatureCanvas"></canvas>'
  };

  var setValidSignature = function($signatureDiv, $fakeValidationField) {
    $signatureDiv.find(".signatureApply").addClass("activeButton");
    $fakeValidationField.val("X").trigger("keyup");
  };
  var setInvalidSignature = function($signatureDiv, $fakeValidationField) {
    $signatureDiv.find(".signatureApply").removeClass("activeButton");
    $fakeValidationField.val("").trigger("keyup");
  };
  
  var clearCanvas = function( $signatureDiv ) {
      
    var $canvas = $signatureDiv.find('.signatureCanvas');
    var canvas = $canvas[0];    
    var context = canvas.getContext("2d");
    
    // Store the current transformation matrix
    //context.save();

    // Use the identity matrix while clearing the canvas
    //context.setTransform(1, 0, 0, 1, 0, 0);
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Restore the transform
    //context.restore();
    
    // Set line size
    // context.lineWidth = 2;

  }

  // Creates drawer for the sign
  var createDrawer = function($signatureDiv, $fakeValidationField) {

      var $canvas = $signatureDiv.find('.signatureCanvas');
      
      var drawer = {
        canvas : {},
        stage : {},
        drawingCanvas : {},
        oldPt : {},
        oldMidPt : {},
        color : {},
        stroke : {},
        index : {},
        handleMouseDown : function (event) {
            drawer.color = "#000000";
            drawer.stroke = 4;
            drawer.oldPt = new createjs.Point(drawer.stage.mouseX, drawer.stage.mouseY);
            drawer.oldMidPt = drawer.oldPt;
            drawer.stage.addEventListener("stagemousemove" , drawer.handleMouseMove);
        },
        handleMouseMove : function (event) {
            var midPt = new createjs.Point(drawer.oldPt.x + drawer.stage.mouseX>>1, drawer.oldPt.y+drawer.stage.mouseY>>1);

            drawer.drawingCanvas.graphics.clear().setStrokeStyle(drawer.stroke, 'round', 'round').beginStroke(drawer.color).moveTo(midPt.x, midPt.y).curveTo(drawer.oldPt.x, drawer.oldPt.y, drawer.oldMidPt.x, drawer.oldMidPt.y);

            drawer.oldPt.x = drawer.stage.mouseX;
            drawer.oldPt.y = drawer.stage.mouseY;

            drawer.oldMidPt.x = midPt.x;
            drawer.oldMidPt.y = midPt.y;

            drawer.stage.update();
            
            if (typeof $fakeValidationField !== "undefined") {
                setValidSignature($signatureDiv, $fakeValidationField);
            }
            
        },
        handleMouseUp : function (event) {
            drawer.stage.removeEventListener("stagemousemove" , drawer.handleMouseMove);
        }
      };

      drawer.canvas = $canvas[0];
      drawer.index = 0;

      //check to see if we are running in a browser with touch support
      drawer.stage = new createjs.Stage(drawer.canvas);
      drawer.stage.autoClear = false;
      drawer.stage.enableDOMEvents(true);

      createjs.Touch.enable(drawer.stage);
      createjs.Ticker.setFPS(24);

      drawer.drawingCanvas = new createjs.Shape();
            
      drawer.stage.addEventListener("stagemousedown", drawer.handleMouseDown);
      drawer.stage.addEventListener("stagemouseup", drawer.handleMouseUp);

      drawer.stage.addChild( drawer.drawingCanvas );
      drawer.stage.update();
        
      /*     
      var canvas = $canvas[0];
      var context = canvas.getContext("2d");
      context.lineWidth = 2;
      clearCanvas( $signatureDiv );
      
      if (canvas.addEventListener) {

          // create a drawer which tracks touch movements
          var drawTouch = {
              isDrawing: false,
              touchstart: function(position) {
                  context.beginPath();
                  context.moveTo(position.x, position.y);
                  this.isDrawing = true;
              },
              touchmove: function(position) {
                  if (this.isDrawing) {
                      context.lineTo(position.x, position.y);
                      context.stroke();
                      if (typeof $fakeValidationField !== "undefined") {
                          setValidSignature($signatureDiv, $fakeValidationField);
                      }
                  }
              },
              touchend: function(position) {
                  if (this.isDrawing) {
                      this.touchmove(position);
                      this.isDrawing = false;
                  }
              },
              handler: function(event) {
                  var offset = CommonFunctions.getOffset(canvas);
                  // get the touch coordinates.  Using the first touch in case of multi-touch
                  var position = {
                      x: event.targetTouches[0].clientX - offset.x,
                      y: event.targetTouches[0].clientY - offset.y
                  };
                  drawTouch[event.type](position);
              }
          };

          // attach the touchstart, touchmove, touchend event listeners.
          canvas.addEventListener('touchstart', drawTouch.handler, false);
          canvas.addEventListener('touchmove', drawTouch.handler, false);
          canvas.addEventListener('touchend', drawTouch.handler, false);

          // prevent elastic scrolling
          canvas.addEventListener('touchmove', function(event) {
              event.preventDefault();
          }, false);

      }

      var drawMouse = {
          isDrawing: false,
          mousedown: function(position) {
              this.isDrawing = true;
              context.beginPath();
              context.moveTo(position.x, position.y);
          },
          mousemove: function(position) {
              if (this.isDrawing) {
                  context.lineTo(position.x, position.y);
                  context.stroke();
                  if (typeof $fakeValidationField !== "undefined") {
                      setValidSignature($signatureDiv, $fakeValidationField);
                  }
              }
          },
          mouseup: function(position) {
              if (this.isDrawing) {
                  this.mousemove(position);
                  this.isDrawing = false;
              }
          },
          mouseleave: function(position) {
              if (this.isDrawing) {
                  this.mousemove(position);
                  this.isDrawing = false;
              }
          },
          handler: function(event) {
              var offset = CommonFunctions.getOffset(canvas);
              var position = {
                  x: event.clientX - offset.x,
                  y: event.clientY - offset.y
              };
              drawMouse[event.type](position);
          }
      };

      // start drawing when the mousedown event fires, and attach handlers to
      // draw a line to wherever the mouse moves to
      $signatureDiv.find(".signatureCanvas")
                .mousedown(drawMouse.handler)
                .mousemove(drawMouse.handler)
                .mouseup(drawMouse.handler)
                .mouseleave(drawMouse.handler);

      */
  };
  
  var SIGNATURE_DIV_MODES = {
    choose : 0,
    draw : 1,
    write : 2,
    onlyWrite : 3
  };
  
  var setSignatureDivMode = function ( mode, $signatureDiv ) {
  
    switch ( mode ) {
      
      case SIGNATURE_DIV_MODES.choose:
      
        // Initially shows span to let user decide if wants to write the sign or draw it
        $signatureDiv.find('.signatureSpanClickableDiv').show();
        $signatureDiv.find('.signatureSpanDiv, .signatureCanvasDiv').hide();
        $signatureDiv.find('.signatureInput').removeAttr("disabled");
        break;
        
      case SIGNATURE_DIV_MODES.draw:
        
        $signatureDiv.find('.signatureSpanClickableDiv,.signatureSpanDiv').hide();
        $signatureDiv.find('.signatureInput').attr("disabled", true);
        $signatureDiv.find('.signatureCanvasDiv').show();
        break;
        
      case SIGNATURE_DIV_MODES.onlyWrite:
      
        // Removes draw sign messages
        $signatureDiv.find(".signatureDrawOption").html("");
        
      case SIGNATURE_DIV_MODES.write:
      
        console.log( "En el write mode" );
        $signatureDiv.find('.signatureSpanClickableDiv,.signatureCanvasDiv').hide();
        $signatureDiv.find('.signatureInput').removeAttr("disabled");
        $signatureDiv.find('.signatureSpanDiv').show();
        break;
        
    }
    
  }

  var updateBottomMessage = function(remainingSteps) {

      if (Number(remainingSteps) != 0) {

          var message = HTML.bottomMessage.inProcess.replace("?", remainingSteps);
          if (Number(remainingSteps) > 1) {
              message = message.replace("field", "fields");
          }
          $("#bottomMessage").html(message);
          $("#bottomDivMessage1").show();

      } else {
          $("#bottomMessage").html(HTML.bottomMessage.completed);
          $("#bottomDivMessage1").hide();
      }
      
      $("#bottomMessage").find(".bottomMessageLink").click(function() {
          var i;
          for (i = 0; i < steps.length; i++) {
              if (!steps[i].completed) {
                  steps[i].$stepField.click();
                  break;
              }
          }
      });
  }

  var toggleStateSubmitButton = function() {

      if ( Number(remainingSteps) == 0 ) {
          $(".validateButton").removeAttr("disabled").addClass("activeButton");
      } else {
          $(".validateButton").attr("disabled", true).removeClass("activeButton");
      }

  };

  // Validate fields, control remaining steps and enables FinishAndSend button
  var validateField = function($validationField, $stepField) {

      var valid = $validationField.valid();
      var stepIndex = $stepField.attr("stepnr") - 1;

      if (valid) {
          if (!steps[stepIndex].completed) {
              steps[stepIndex].completed = true;
              remainingSteps--;
              updateBottomMessage(remainingSteps);
              $stepField.addClass("stepFieldCompleted");
          }
      } else {
          if (steps[stepIndex].completed) {
              steps[stepIndex].completed = false;
              remainingSteps++;
              updateBottomMessage(remainingSteps);
              $stepField.removeClass("stepFieldCompleted");
          }
      }

      toggleStateSubmitButton();

      return valid;
  };

  var restartSignatureDiv = function($pdfField, $signatureDiv, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable) {

    var pdfField = $pdfField[0];

    // Initialize control variables
    fieldSign[pdfField.id].signed = false;
    
    // Reset value from fake field for validation plugin
    setInvalidSignature($signatureDiv, $fakeValidationField);
    
    // Set empty values for input and span
    $signatureInput.val("");
    $signatureSpan.html("");
    
    if ( !canvasIE8 ) {
      // Clear canvas
      clearCanvas( $signatureDiv );
    }

    // Check if any sign remains entered
    var anySignedField = false;
    $.each(fieldSign, function(pdfFieldId, pdfFieldVal) {
      if ( pdfFieldVal.signed ) {
        anySignedField = true;
      }
    });
    if ( !anySignedField ) {
      signControl.draw = signControl.write = false;
    }    
    
    // Control if any sign already entered and drawing is allowed
    if ( !signControl.signed() && !canvasIE8 ) {
      
      // Restart draw flag
      fieldSign[pdfField.id].draw = false;
      setSignatureDivMode( SIGNATURE_DIV_MODES.choose, $signatureDiv );
      
    }
  };

  var closeModal = function($signatureDiv) {
      unlockScroll();
      $signatureDiv.hide();
      $(".signatureWrapper").hide();
  };

  var lockScroll = function() {

      var body = $("body");
      var html = $("html");
      var oldBodyOuterWidth = body.outerWidth(true);
      var oldScrollTop = html.scrollTop();
      var newBodyOuterWidth;
      $("html").css("overflow-y", "hidden");
      newBodyOuterWidth = $("body").outerWidth(true);
      body.css("margin-right", (newBodyOuterWidth - oldBodyOuterWidth + "px"));
      $("#topMainDiv,#topStepsDiv,.validateButton,.signatureNotSigning").css({ 'margin-right': (newBodyOuterWidth - oldBodyOuterWidth + "px") });
      html.scrollTop(oldScrollTop); // necessary for Firefox

  }

  var unlockScroll = function() {

      var html = $("html");
      var oldScrollTop = html.scrollTop(); // necessary for Firefox.
      html.css("overflow-y", "").scrollTop(oldScrollTop);
      $("body").css("margin-right", 0);
      $("#topMainDiv,#topStepsDiv,.validateButton,.signatureNotSigning").css({ 'margin-right': 0 });

  }

  var fillDocument = function() {

      // Set document to JSON content from server
      $.each(pagesJSON, function() {
          var currentPage = this;
          var $page = $(HTML.pdfFields.page.replaceAll("?", currentPage.nr));
          $page.appendTo("#innerDocument").append($(HTML.pdfFields.img.replaceAll("?", currentPage.url)));
          $.each(currentPage.pdfFields, function() {
              var field = this;
              var $field = $(HTML.pdfFields[field.typeOfField].replaceAll("?", field.id));
              $field.appendTo($page).css({
                  position: "absolute",
                  top: field.top + "px",
                  left: field.left + "px",
                  width: field.width + "px",
                  height: field.height + "px"
              });
          });
      });

      // Get number of steps to complete
      remainingSteps = numberOfSteps = CommonVars.stepsNr( pagesJSON );

      // Create steps
      CommonFunctions.createSteps();

      // Iterate over all input fields
      $("#document .inputPDFField").each(function(stepIndex) {

          // Get references to jquery and DOM elements for the field
          var $inputPdfField = $(this);
          var inputPdfField = $inputPdfField[0];

          // Get references to jquery and DOM elements for the parent DIV of field
          var $pdfField = $inputPdfField.parent();
          var pdfField = $pdfField[0];

          // Set index for step ids
          var stepNr = stepIndex + 1;

          // Get jquery reference to step field and add it to array control of steps
          var $stepField = $("#step" + stepNr);
          steps.push({ completed: false, $stepField: $stepField });

          // Also add it to pdfField -> stepField control object
          fieldSteps[inputPdfField.id] = $stepField;

          // Clone tooltip content to create new tooltip with correct text
          var $tooltipDiv1 = $tooltipDiv.clone().html($tooltipDiv.html().replaceAll("?", stepNr));

          // Create tooltip
          $inputPdfField.qtip({
              content: $tooltipDiv1,
              show: {
                  event: "focus mouseover",
                  solo: true,
                  delay: 200
              },
              hide: "unfocus",
              style: {
                  classes: QtipDefaultClasses,
                  tip: {
                      width: 20,
                      height: 20,
                      border: false
                  }
              },
              position: {
                  my: "bottom left",
                  at: "top left+5",
                  collision: "flip",
                  within: "#innerDocument"
              }
          });

          $tooltipDiv1.find(".signTooltipCompleted").hide();

          // For sign field remove comment and email tooltip content and create modal div
          if ($inputPdfField.hasClass("signPDFField")) {

              // Remove comment and email tooltip content
              $tooltipDiv1.find(".commentTooltip,.emailTooltip").remove();
              
              // Clone original signature div content
              var $signatureDiv1 = $signatureDiv.clone().appendTo("body");

              // Get references to fake validation field, signature input field, signature clickable span, signature span for handwriting, signature canvas and canvas DOM
              var $fakeValidationField = $inputPdfField.parent().find(".fakeValidation");
              var $signatureInput = $signatureDiv1.find(".signatureInput");
              var $signatureSpanClickable = $signatureDiv1.find(".signatureSpanClickable");
              var $signatureSpan = $signatureDiv1.find(".signatureSpan");
              var $signatureCanvas = $signatureDiv1.find(".signatureCanvas");
              var canvas = {};
              var context = {};
              
              if ( !canvasIE8 ) {
                
                canvas = $signatureDiv1.find('.signatureCanvas')[0];
                context = canvas.getContext("2d");
                
                // Create drawer for canvas
                createDrawer( $signatureDiv1, $fakeValidationField );
                
              }
              

              // Add signature div to control variable for signature fields
              fieldSign[pdfField.id] = {
                  $signatureDiv: $signatureDiv1,
                  signed: false,
                  draw: false
              };

              // Initially shows span to let user decide if wants to write the sign or draw it
              setSignatureDivMode( SIGNATURE_DIV_MODES.choose, $signatureDiv1 );

              // IE8 canvas control: Do not allow draw sign option when canvas is not available
              if ( canvasIE8 ) {
              
                setSignatureDivMode( SIGNATURE_DIV_MODES.onlyWrite, $signatureDiv1 );
                
              }

              // Signature navigation controls: Remove back or next spans if it's the first or last step
              if (stepNr == 1) {
                  $signatureDiv1.find(".signatureGoBack").remove();
              } else if (stepNr == numberOfSteps) {
                  $signatureDiv1.find(".signatureNext").remove();
              }

              // Bind click on sign field to open the modal div
              $inputPdfField.click(function() {

                  // Hide scrollbar and avoids current view to shift
                  lockScroll();
                  
                  // Show wrapper div and set correct width for signature div
                  $(".signatureWrapper").show();
                  $signatureDiv1.show().find(".signatureSignDiv").css({
                      width: $signatureDiv1.find('.signatureInput').get(0).offsetWidth
                  });
                  
                  if ( !canvasIE8 ) {
                  
                    // Set canvas size
                    canvas.width = $signatureDiv1.find('.signatureInput').get(0).offsetWidth;
                    canvas.height = 150;
                    // Set canvas line size
                    context.lineWidth = 2;
                    
                  }
                  
                  // Check if any sign has already been entered
                  if ( signControl.signed() ) {

                    // When writing sign not showing span
                    if ( signControl.write ) {
                    
                      fieldSign[pdfField.id].draw = false;
                      setSignatureDivMode( SIGNATURE_DIV_MODES.write, $signatureDiv1 );
                      
                    } else {
                    
                      fieldSign[pdfField.id].draw = true;
                      setSignatureDivMode( SIGNATURE_DIV_MODES.draw, $signatureDiv1 );
                      
                    }
                    
                  } else {
                  
                    setSignatureDivMode( SIGNATURE_DIV_MODES.choose, $signatureDiv1 );
                    
                    // IE8 canvas control: Do not allow draw sign option when canvas is not available
                    if ( canvasIE8 ) {
                      setSignatureDivMode( SIGNATURE_DIV_MODES.onlyWrite, $signatureDiv1 );
                    }
                    
                  }

              });

              // Bind keyup on input field if the user decides to input his name
              $signatureInput.keyup(function() {

                  $signatureSpanClickable.parent().hide();
                  $signatureSpan.parent().show();

                  // Set content of span to value of the input field
                  $signatureSpan.html( $signatureInput.val() );

                  // Set fakevalidation field value and trigger keyup event for validation plugin to work correctly
                  if ($signatureInput.val() == "") {
                    setInvalidSignature($signatureDiv1, $fakeValidationField);
                  } else {
                    setValidSignature($signatureDiv1, $fakeValidationField);
                  }

              });
              
              // Bind signature span click to let the user choose if prefers to draw the signature
              $signatureSpanClickable.click(function() {
              
                fieldSign[pdfField.id].draw = true;
                setSignatureDivMode( SIGNATURE_DIV_MODES.draw, $signatureDiv1 );
                
              }).addClass("spanClickable");

              // Bind previous span navigation control of signature div
              $signatureDiv1.find(".signatureGoBack").click(function() {
                  restartSignatureDiv($pdfField, $signatureDiv1, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable);
                  closeModal($signatureDiv1);
                  steps[stepIndex - 1].$stepField.click();
              });

              // Bind next span navigation control of signature div
              $signatureDiv1.find(".signatureNext").click(function() {
                  restartSignatureDiv($pdfField, $signatureDiv1, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable);
                  closeModal($signatureDiv1);
                  steps[stepIndex + 1].$stepField.click();
              });

              // Bind close span navigation control of signature div
              $signatureDiv1.find(".signatureClose").click(function() {
                  restartSignatureDiv($pdfField, $signatureDiv1, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable);
                  closeModal($signatureDiv1);
                  $signatureDiv1.hide();
              });

              // Bind apply button to send the signature
              $signatureDiv1.find(".signatureApply").click(function() {

                  if ( validateField( $fakeValidationField, $stepField ) ) {

                      fieldSign[pdfField.id].signed = true;
                      closeModal($signatureDiv1);
                      
                      var $signContainer = $pdfField.find('.signContainer');

                      if (fieldSign[pdfField.id].draw) {

                          fieldSign[pdfField.id].value = canvas.toDataURL();
                          $signatureCanvas.parent().appendTo( $signContainer );
                          
                          signControl.draw = true;

                      } else {

                          fieldSign[pdfField.id].value = $signatureInput.val();
                          $signatureSpan.parent().appendTo( $signContainer );

                          signControl.write = true;

                      }

                      $inputPdfField.qtip("option", "show.target", $signContainer);
                      $inputPdfField.qtip("option", "position.target", $signContainer);
                      $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed");
                      
                      $tooltipDiv1.find(".signTooltip").hide();
                      $tooltipDiv1.find(".signTooltipCompleted").show();
                      $tooltipDiv1.find(".tooltipDelSign").show();

                      $inputPdfField.hide();
                  }
              });

              // Bind reset button to restart the modal div
              $signatureDiv1.find(".signatureReset").click(function() {

                  // Restart the signature div
                  restartSignatureDiv($pdfField, $signatureDiv1, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable);

              });

              // Bind tooltip Delete Signature span
              $tooltipDiv1.find(".tooltipDelSign").click(function() {

                  // Return span or canvas to the signature div
                  $pdfField.find('.signContainer').children().first().appendTo( $signatureDiv1.find(".signatureSignDiv") );
                  // Shows the input field again
                  $inputPdfField.show();
                  
                  // Restart the signature div
                  restartSignatureDiv($pdfField, $signatureDiv1, $fakeValidationField, $signatureInput, $signatureSpan, $signatureSpanClickable);
                  
                  $tooltipDiv1.find(".signTooltipCompleted").hide();
                  $tooltipDiv1.find(".tooltipDelSign").hide();
                  $tooltipDiv1.find(".signTooltip").show();
                  
                  $inputPdfField.qtip("option", "show.target", $inputPdfField);
                  $inputPdfField.qtip("option", "position.target", $inputPdfField);
                  $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses);

                  validateField($fakeValidationField, $stepField);

              });

              // For comment field remove sign and email tooltip content
          } else if ($inputPdfField.hasClass("commentPDFField")) {

              $tooltipDiv1.find(".signTooltip,.emailTooltip").remove();
              $inputPdfField.keyup(function() {
                  if (validateField($inputPdfField, $stepField)) {
                      $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed");
                  } else {
                      $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses);
                  }
              });

              // For email field remove sign and comment tooltip content
          } else if ($inputPdfField.hasClass("emailPDFField")) {

              $tooltipDiv1.find(".signTooltip,.commentTooltip").remove();
              $inputPdfField.keyup(function() {
                  if (validateField($inputPdfField, $stepField)) {
                      $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed");
                  } else {
                      $inputPdfField.qtip("option", "style.classes", QtipDefaultClasses);
                  }
              });

          }

          // Tooltip navigation controls: Hide back or next spans if it's the first or last step
          if (stepNr == 1) {
              $tooltipDiv1.find(".tooltipGoBack").hide();
          } else if (stepNr == numberOfSteps) {
              $tooltipDiv1.find(".tooltipNext").hide();
          }
          $tooltipDiv1.find(".tooltipDelSign").hide();

          // Bind tooltip GoBack span
          $tooltipDiv1.find(".tooltipGoBack").click(function() {
              // Simulate click on the previuos step
              steps[stepIndex - 1].$stepField.click();
          });

          // Bind tooltip Next span
          $tooltipDiv1.find(".tooltipNext").click(function() {
              // Simulate click on the next step
              steps[stepIndex + 1].$stepField.click();
          });

          // Bind tooltip Close span
          $tooltipDiv1.find(".tooltipClose").click(function() {
              // Call tooltip api to close the tooltip
              $inputPdfField.qtip("api").toggle(false);
          });

          // When focus or hover on document field activate corresponding step field
          $inputPdfField.focus(function() {
              CommonFunctions.selectStepField($stepField);
          }).hoverIntent({
              over: function() {
                  CommonFunctions.selectStepField($stepField);
              },
              out: function() {
              },
              interval: 200
          });

          // When click on step div scroll document to corresponding field position and focus that field
          $stepField.click(function() {

              $('html, body').animate({
                  scrollTop: ($inputPdfField.parent().offset().top - $("#topDiv").height() - 300)
              }, 1000);

              CommonFunctions.selectStepField($stepField);
              $inputPdfField.qtip('show');
              
              if ($inputPdfField.is(":visible")) {
                  $inputPdfField.focus();
              }

          });
      });

      // Select initial field
      CommonFunctions.selectStepField( $("#stepStart") );

      // For date field fill it with the todays date
      $(".datePDFField").each(function() {

          var $field = $(this);
          var today = new Date();
          $field.html(today.asString("dd/mm/yyyy"));

      });

      // Fill date for signature div
      $(".signatureDate").html((new Date()).asString("dd/mm/yyyy"));

      // Validation for input fields
      $("#content").validate({
          errorPlacement: null,
          onsubmit: false,
          showErrors: function(errorMap, errorList) {

              var i, elements, errorClass = this.settings.errorClass;
              var $firstElement, $firstPDFField, $pdfField;

              if (errorList.length > 0) {

                  $firstElement = $(errorList[0].element);
                  $firstPDFField = $firstElement.hasClass("fakeValidation") ? $firstElement.parent().find(".signPDFField") : $firstElement;

                  $.each(errorList, function() {

                      $pdfField = $(this.element).hasClass("fakeValidation") ? $(this.element).parent().find(".signPDFField") : $(this.element);
                      $pdfField.addClass(errorClass);

                  });

              }

              for (i = 0, elements = this.validElements(); elements[i]; i++) {
                  $pdfField = $(elements[i]).hasClass("fakeValidation") ? $(elements[i]).parent().find(".signPDFField") : $(elements[i]);
                  $pdfField.removeClass(errorClass);
              }

          },
          errorClass: 'inputPDFFieldError'
      });

      // Set bottom message for user
      updateBottomMessage(remainingSteps);
      toggleStateSubmitButton();

      // Bind "not sign" link
      $(".signatureNotSigning").click(function() {

          lockScroll();
          $(".signatureWrapper,.signatureNotSignDiv").show();
          $(".signatureNotSignDone").attr("disabled", true).removeClass("activeButton");
          $(".signatureNotSignTextArea").focus();

      });
      $(".signatureNotSignDropDown").change(function() {

          var $dropdown = $(this);
          if ( $dropdown.val() == "0" ) {
              $(".signatureNotSignDone").attr("disabled", true).removeClass("activeButton");
          } else {
              $(".signatureNotSignDone").removeAttr("disabled").addClass("activeButton");
          }

      });
      $(".signatureNotSignClose").click(function() {

          unlockScroll();
          $(".signatureWrapper,.signatureNotSignDiv").hide();

      });
      /*$(".signatureNotSignDone").click( function( event ) {
      });*/
      $(".signatureNotSignCancel").click(function() {
          //$(".signatureNotSignTextArea").val("");
          unlockScroll();
          $(".signatureWrapper,.signatureNotSignDiv").hide();
      });

  };

  return {
      init: function() {

        $stepsDiv = $("#topStepsDiv");
        $tooltipDiv = $(".tooltipDiv");
        $signatureDiv = $(".signatureDiv");
        pagesJSON = CommonVars.pagesJSON();

        fillDocument();

      },
      submitForm: function() {
        
          // Save values to JSON
          var values = [];
          $.each(pagesJSON, function() {
              var page = this;
              $.each(page.pdfFields, function() {
                  var field = this;
                  var $pdfField = $("#" + field.id);
                  var value = {
                      pagenr: page.nr,
                      id: field.id
                  };
                  if (field.typeOfField == "sign") {
                      value.draw = fieldSign[field.id].draw;
                      //value.vml = fieldSign[field.id].vml || false;
                      value.value = fieldSign[field.id].value;
                  } else if (field.typeOfField == "date") {
                      value.value = $pdfField.find(".datePDFField").html();
                  } else {
                      value.value = $pdfField.find(".inputPDFField").val();
                  }
                  values.push(value);
              });
          });
          $("#hidCompletedJSON").val( JSON.stringify(values) );

      }
  };
})();

$(document).ready(function() {
  FillDocument.init();
});