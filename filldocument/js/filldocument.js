var FillDocument = (function () {

	var QtipDefaultClasses = "qtip-sendsign qtip-shadow qtip-rounded";
	
	var $tooltipDiv;
	var $stepsDiv;
	var $signatureDiv;
	var pagesJSON;
	
	var canvasIE8 = !$('<canvas></canvas>')[0].getContext;
		
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
		bottomMessage : {
			inProcess : "You need to fill in <span class='bottomMessageLink spanClickable'>? more field</span> before you can <span class='validateButton sendSignButton'>Finish and send</span>",
			completed : "Thank you. Now you can <span class='validateButton sendSignButton activeButton'>Finish and send</span>"
		},
		pdfFields : {
			page	:	'<div class="PDFPage" pagenr="?"></div>',
			img		:	'<img class="documentIMG" src="?"/>',
			sign	:	'<div id="?" class="PDFField" typeOfField="sign">'+
							'<input type="image" id="?Field" src="images/signIcon.png" class="innerPDFField signPDFField inputPDFField" onclick="return false;"></input>'+
							'<input type="text" id="?FakeValidation" name="?FakeValidation" class="fakeValidation required" style="display:none"></input>'+
						'</div>',
			comment	:	'<div id="?" class="PDFField" typeOfField="comment">'+
							'<textarea id="?Field" name="?Field" class="innerPDFField commentPDFField inputPDFField required"></textarea>'+
						'</div>',
			email	: 	'<div id="?" class="PDFField" typeOfField="email">'+
							'<textarea id="?Field" name="?Field" class="innerPDFField emailPDFField inputPDFField required email"></textarea>'+
						'</div>',
			date	: 	'<div id="?" class="PDFField" typeOfField="date">'+
							'<span id="?Field" class="innerPDFField datePDFField">Date: </span>'+
						'</div>'
		},
		canvas : '<div class="signatureCanvasWrapper"></div><canvas class="signatureCanvas"></canvas>'
	};
	
	var setValidSignature = function ( $signatureDiv, $fakeValidationField ) {
		$signatureDiv.find(".signatureApply").addClass( "activeButton" );
		$fakeValidationField.val("X").trigger( "keyup" );
	};
	var setInvalidSignature = function ( $signatureDiv, $fakeValidationField ) {
		$signatureDiv.find(".signatureApply").removeClass( "activeButton" );
		$fakeValidationField.val("").trigger( "keyup" );
	};
	
	// Creates drawer for the sign
	var createDrawer = function ($signatureDiv, $fakeValidationField) {
		
		var $canvas = $signatureDiv.find('.signatureCanvas');
		var canvas = $canvas[0];
		
		canvas.width = $signatureDiv.find('.signatureInput').get(0).offsetWidth;
		canvas.height = 150;
				
		if ( canvasIE8 ) {
			G_vmlCanvasManager.initElement( canvas );
		}
		var context = canvas.getContext("2d");

		if (canvas.addEventListener) {
			    
		   // create a drawer which tracks touch movements
		   var drawTouch = {
			  isDrawing: false,
			  touchstart: function (position) {
				 context.beginPath();
				 context.moveTo(position.x, position.y);
				 this.isDrawing = true;
			  },
			  touchmove: function (position) {
				 if (this.isDrawing) {
					context.lineTo(position.x, position.y);
					context.stroke();
					if (typeof $fakeValidationField !== "undefined") {
						setValidSignature( $signatureDiv, $fakeValidationField );
					}
				 }
			  },
			  touchend: function (position) {
				 if (this.isDrawing) {
					this.touchmove(position);
					this.isDrawing = false;
				 }
			  },
			  handler: function (event) {
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
		   canvas.addEventListener('touchmove', function (event) {
			  event.preventDefault();
		   }, false);
		   
	   } 	   
	 
	   var drawMouse = {
			   isDrawing: false,
			   mousedown: function (position) {
				   this.isDrawing = true;
				   context.beginPath();
				   context.moveTo(position.x, position.y);
			   },
			   mousemove: function (position) {
				   if (this.isDrawing) {				   
						context.lineTo(position.x, position.y);
						context.stroke();
						if (typeof $fakeValidationField !== "undefined") {
							setValidSignature( $signatureDiv, $fakeValidationField );
						}
				   }
			   },
			   mouseup: function (position) {
				   if (this.isDrawing) {
					   this.mousemove(position);
					   this.isDrawing = false;
				   }
			   },
			   mouseleave: function (position) {
				   if (this.isDrawing) {
					   this.mousemove(position);
					   this.isDrawing = false;
				   }
			   },
			   handler: function (event) {
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
	};
	
	var signatureSpanClickHandler = function ( $signatureSpan, $signatureDiv, $fakeValidationField ) {	
		
		$signatureDiv.find('.signatureInput').attr("disabled", true);
		$signatureDiv.find('.signatureCanvasWrapper,.signatureCanvas').show();
		createDrawer( $signatureDiv, $fakeValidationField );
		$signatureSpan.parent().hide();
		
	};
	
	var updateBottomMessage = function ( remainingSteps ) {
	
		if ( Number(remainingSteps) != 0 ) {
			
			var message = HTML.bottomMessage.inProcess.replace( "?", remainingSteps );
			if ( Number(remainingSteps) > 1 ) {
				message = message.replace( "field", "fields" );
			}
			$("#bottomMessage").html( message );
			
		} else {		
			$("#bottomMessage").html( HTML.bottomMessage.completed );			
		}
		
		$( "#bottomMessage" ).find( ".bottomMessageLink" ).click( function () {
			var i;
			for ( i = 0; i < steps.length; i++ ) {
				if ( !steps[i].completed ) {
					steps[i].$stepField.click();
					break;
				}
			}
		});		
	}
	
	// Validate fields, control remaining steps and enables FinishAndSend button
	var validateField = function ( $validationField, $stepField ) {
	
		var valid = $validationField.valid();
		var stepIndex = $stepField.attr( "stepnr" ) - 1;
	
		if ( valid ) {
			if ( !steps[stepIndex].completed ) {
				steps[stepIndex].completed = true;
				remainingSteps--;
				updateBottomMessage( remainingSteps );
				$stepField.addClass( "stepFieldCompleted" );
			}
		} else {
			if ( steps[stepIndex].completed ) {
				steps[stepIndex].completed = false;
				remainingSteps++;
				updateBottomMessage( remainingSteps );
				$stepField.removeClass( "stepFieldCompleted" );
			}
		}
		
		if ( Number(remainingSteps) == 0 ) {
			
			// Bind submit button to validate form
			$(".validateButton").click(function () {
			
				// Save values to JSON
				var values = [];
				$.each(pagesJSON, function () {
					var page = this;
					$.each(page.pdfFields, function (){
						var field = this;
						var $pdfField = $( "#"+field.id );
						var value = {
							pagenr : page.nr,
							id : field.id
						};
						if ( field.typeOfField == "sign" ) {
							value.draw  = fieldSign[ field.id ].draw;
							value.vml   = fieldSign[ field.id ].vml || false;
							value.value = fieldSign[ field.id ].value;
						} else if ( field.typeOfField == "date" ) {
							value.value = $pdfField.find( ".datePDFField" ).html();
						} else {
							value.value = $pdfField.find( ".inputPDFField" ).val();
						}
						values.push( value );
					});
				});
				$( "#valuesJSON" ).html( JSON.stringify( values ) );				
			});
			
		} else {
		
			$(".validateButton").unbind( "click" );
			
		}
		
		return valid;
	};
	
	var restartSignatureCanvas = function ( $pdfField, $signatureDiv, $signatureDivOriginal, $fakeValidationField, $signatureInput, $signatureSpan) {
	
		var pdfField = $pdfField[0];

		// Initialize control variables
		fieldSign[pdfField.id].signed = false;
		fieldSign[pdfField.id].draw   = false;					
	
		// Set empty value and remove disabled attribute to input field
		$signatureInput.val( "" ).removeAttr( "disabled" );
		
		// Reset value from fake field for validation plugin
		setInvalidSignature( $signatureDiv, $fakeValidationField );
		
		// Set html content of span to original content, remove class for hand writing font and show it
		$signatureSpan.html( $signatureDivOriginal.find(".signatureSpan").html() ).removeClass("signatureSpanHandWriting").parent().show();

		// Re-bind signature span click to let the user choose if prefers to draw the signature
		$signatureSpan.click( function () {
			
			fieldSign[pdfField.id].draw = true;
			signatureSpanClickHandler( $signatureSpan, $signatureDiv, $fakeValidationField );
			
		}).addClass( "spanClickable" );
	
	}
	
	var closeModal = function ( $signatureDiv ) {		
		$('body').removeClass( "noScroll" );						
		$signatureDiv.hide();
		$(".signatureWrapper").hide();
	};

	var lockScroll = function () {
		
	    var body = $("body");
        var html = $("html");
        var oldBodyOuterWidth = body.outerWidth(true);
        var oldScrollTop = html.scrollTop();
        var newBodyOuterWidth;
        $("html").css("overflow-y", "hidden");
        newBodyOuterWidth = $("body").outerWidth(true);
        body.css("margin-right", (newBodyOuterWidth - oldBodyOuterWidth + "px"));
		$("#topMainDiv,#topStepsDiv").css({ 'margin-right': (newBodyOuterWidth - oldBodyOuterWidth + "px") });
        html.scrollTop(oldScrollTop); // necessary for Firefox
        $("#signatureWrapper").css("width", newBodyOuterWidth + "px");
		
	}

	var unlockScroll = function () {
		
		var html = $("html");
        var oldScrollTop = html.scrollTop(); // necessary for Firefox.
        html.css("overflow-y", "").scrollTop(oldScrollTop);
        $("body").css("margin-right", 0);
		$("#topDiv,#bottomDiv").css({ 'padding-right': 0 });
		
	}
	
	var fillDocument = function (){
	
		// Set document to JSON content from server
		$.each(pagesJSON, function (){
			var currentPage = this;
			var $page = $( HTML.pdfFields.page.replaceAll( "?", currentPage.nr ) );
			$page.appendTo( "#innerDocument" ).append( $(HTML.pdfFields.img.replaceAll("?", currentPage.url) ) );
			$.each(currentPage.pdfFields, function (){
				var field = this;
				var $field = $( HTML.pdfFields[field.typeOfField].replaceAll("?", field.id) );
				$field.appendTo( $page ).css({
					position: "absolute",
					top     : field.top + "px",
					left    : field.left + "px",
					width   : field.width + "px",
					height  : field.height  + "px"
				});
			});
		});
									
		// Iterate over all input fields
		$("#document .inputPDFField").each(function ( stepIndex ) {
		
			// Get references to jquery and DOM elements for the field
			var $inputPdfField  = $(this);
			var inputPdfField = $inputPdfField[0];
			
			// Get references to jquery and DOM elements for the parent DIV of field
			var $pdfField = $inputPdfField.parent();
			var pdfField = $pdfField[0];
			
			// Set index for step ids and create new step
			var stepNr = stepIndex + 1;
			$( "#stepXX" ).before( $("#stepXX").clone().attr("id","step"+stepNr) );
			$( "#step"+stepNr ).html( $("#stepXX").html().replaceAll("XX",stepNr) );

			// Get jquery reference to step field and add it to array control of steps
			var $stepField = $( "#step"+stepNr );
			$stepField.attr( "stepnr", stepNr);
			steps.push( {completed: false, $stepField: $stepField } );
			
			// Also add it to pdfField -> stepField control object
			fieldSteps[inputPdfField.id] = $stepField;

			// Clone tooltip content to create new tooltip with correct text
			var $tooltipDiv1 = $tooltipDiv.clone().html( $tooltipDiv.html().replaceAll("?",stepNr) );
			
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
			
			$tooltipDiv1.find( ".signTooltipCompleted" ).hide();
					
			// For sign field remove comment and email tooltip content and create modal div
			if ( $inputPdfField.hasClass( "signPDFField" ) ) {
			
				// Remove comment and email tooltip content
				$tooltipDiv1.find( ".commentTooltip,.emailTooltip" ).remove();
				
				// Clone original signature div content
				var $signatureDiv1 = $signatureDiv.clone().appendTo( "body" );
				
				// Add signature div to control variable for signature fields
				fieldSign[pdfField.id] = {
					$signatureDiv : $signatureDiv1,
					signed: false,
					draw: false
				};
								
				// Add canvas to the canvas div
				$( HTML.canvas ).appendTo( $signatureDiv1.find('.signatureCanvasDiv') ).hide();
				
				// Signature navigation controls: Remove back or next spans if it's the first or last step
				if ( stepNr == 1 ) {
					$signatureDiv1.find(".signatureGoBack").remove();
				} else if ( stepNr == numberOfSteps ) {
					$signatureDiv1.find(".signatureNext").remove();
				}

				// Bind click on sign field to open the modal div
				$inputPdfField.click(function () {
					
					$('body').addClass( "noScroll" );

					// Show div and set correct width for signature canvas div
					$(".signatureWrapper").show();
					$signatureDiv1.show().find(".signatureCanvasDiv").css({
						width: $signatureDiv1.find('.signatureInput').get(0).offsetWidth
					});
					
				});
				
				// Get references to fake validation field, signature span and signatureInput
				var $fakeValidationField = $inputPdfField.parent().find(".fakeValidation");
				var $signatureInput = $signatureDiv1.find(".signatureInput");
				var $signatureSpan = $signatureDiv1.find(".signatureSpan");
				
				// Bind keyup on input field if the user decides to input his name
				$signatureInput.keyup(function () {			
					
					// Add class for handwriting font and set control variable to signed
					if ( !$signatureSpan.hasClass("signatureSpanHandWriting") ) {
						fieldSign[pdfField.id].signed = true;
						$signatureSpan.addClass("signatureSpanHandWriting").unbind( "click" ).removeClass( "spanClickable" );
					}
					
					// Set content of span to value of the input field
					$signatureSpan.html( $signatureInput.val() );
					
					// Set fakevalidation field value and trigger keyup event for validation plugin to work correctly
					if ( $signatureInput.val() == "") {
						setInvalidSignature( $signatureDiv1, $fakeValidationField );
					} else {
						setValidSignature( $signatureDiv1, $fakeValidationField );
					}
					
				});
				
				// Bind signature span click to let the user choose if prefers to draw the signature
				$signatureSpan.click( function () {				
					
					fieldSign[pdfField.id].draw = true;					
					signatureSpanClickHandler( $signatureSpan, $signatureDiv1, $fakeValidationField );
					
				}).addClass( "spanClickable" );
			
				// Bind previous span navigation control of signature div
				$signatureDiv1.find(".signatureGoBack").click( function () {
					closeModal( $signatureDiv1 );
					steps[stepIndex-1].$stepField.click();
				});
				
				// Bind next span navigation control of signature div
				$signatureDiv1.find(".signatureNext").click( function () {
					closeModal( $signatureDiv1 );
					steps[stepIndex+1].$stepField.click();
				});

				// Bind close span navigation control of signature div
				$signatureDiv1.find(".signatureClose").click( function () {
					closeModal( $signatureDiv1 );
					$signatureDiv1.hide();
				});

				// Bind apply button to send the signature
				$signatureDiv1.find(".signatureApply").click( function () {
								
					if  ( validateField( $fakeValidationField, $stepField ) ) {
					
						fieldSign[pdfField.id].signed = true;						
						closeModal( $signatureDiv1 );
						
						if ( fieldSign[pdfField.id].draw ) {
							
							var canvas = $signatureDiv1.find('.signatureCanvas')[0];
							if ( !canvas.toDataURL ) {
								fieldSign[pdfField.id].vml = true;
								fieldSign[pdfField.id].value = canvas.innerHTML;
							} else {
								fieldSign[pdfField.id].value = canvas.toDataURL();
							}
							var $signatureCanvas = $signatureDiv1.find('.signatureCanvas');
							$signatureCanvas.appendTo( $pdfField );
							
							$inputPdfField.qtip( "option", "show.target", $signatureCanvas);
							$inputPdfField.qtip( "option", "position.target", $signatureCanvas);
							
							console.log( canvasIE8 );
							
							/*if ( canvasIE8 ) {
								$signatureCanvas.css({
									// Fix for IE8 set width and height css attributes
									width: $pdfField.css( "width" ),
									height: $pdfField.css( "height" ) 
								}).attr({
									// Fix for IE8 set width and height element attributes
									width: $pdfField.css( "width" ).split("px")[0],
									height: $pdfField.css( "height" ).split("px")[0]
								});
							}*/
							
						} else {
							
							fieldSign[pdfField.id].value = $signatureDiv1.find('.signatureInput').val();
							$signatureSpan.appendTo( $pdfField );
							
							$inputPdfField.qtip( "option", "show.target", $signatureSpan);
							$inputPdfField.qtip( "option", "position.target", $signatureSpan);
							
						}
						
						$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed");
						$tooltipDiv1.find( ".signTooltip" ).hide();
						$tooltipDiv1.find( ".signTooltipCompleted" ).show();
						$tooltipDiv1.find(".tooltipDelSign").show();						
						
						$inputPdfField.hide();					
					}										
				});
								
				// Bind reset button to restart the modal div
				$signatureDiv1.find(".signatureReset").click( function () {

					// If the user was drawing hide the created canvas
					$signatureDiv1.find('.signatureCanvasWrapper,.signatureCanvas').hide();
					restartSignatureCanvas( $pdfField, $signatureDiv1, $signatureDiv, $fakeValidationField, $signatureInput, $signatureSpan );
					
				});

				// Bind tooltip Delete Signature span
				$tooltipDiv1.find(".tooltipDelSign").click(function () {
				
					// If the signature was drawn hide the created canvas
					// Return span or canvas to the signature div
					$signatureDiv1.find('.signatureCanvasWrapper').hide();
					$pdfField.find( '.signatureCanvas' ).hide().appendTo( $signatureDiv1.find(".signatureCanvasDiv") );
					$signatureSpan.appendTo( $signatureDiv1.find(".signatureSpanDiv") );

					restartSignatureCanvas( $pdfField, $signatureDiv1, $signatureDiv, $fakeValidationField,  $signatureInput, $signatureSpan );
				
					$inputPdfField.show();					
					$stepField.removeClass( "stepFieldCompleted" );
					$tooltipDiv1.find( ".signTooltipCompleted" ).hide();
					$tooltipDiv1.find(".tooltipDelSign").hide();
					$tooltipDiv1.find( ".signTooltip" ).show();
					$inputPdfField.qtip( "option", "show.target", $inputPdfField);
					$inputPdfField.qtip( "option", "position.target", $inputPdfField);
					$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses);
					
					steps[stepIndex].completed = false;
					
					remainingSteps++;					
					updateBottomMessage( remainingSteps );
					
				});				
				
			// For comment field remove sign and email tooltip content
			} else if ($inputPdfField.hasClass("commentPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.emailTooltip").remove();
				$inputPdfField.keyup( function () {
					if ( validateField( $inputPdfField, $stepField ) ){
						$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed" );
					} else {
						$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses );
					}
				});
				
			// For email field remove sign and comment tooltip content
			} else if ($inputPdfField.hasClass("emailPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.commentTooltip").remove();
				$inputPdfField.keyup( function () {
					if ( validateField( $inputPdfField, $stepField ) ){
						$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses + " qtip-sendsign-completed");
					} else {
						$inputPdfField.qtip( "option", "style.classes", QtipDefaultClasses );
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
			$tooltipDiv1.find(".tooltipGoBack").click(function () {
				// Simulate click on the previuos step
				steps[stepIndex-1].$stepField.click();
			});
			
			// Bind tooltip Next span
			$tooltipDiv1.find(".tooltipNext").click(function () {
				// Simulate click on the next step
				steps[stepIndex+1].$stepField.click();					
			});

			// Bind tooltip Close span
			$tooltipDiv1.find(".tooltipClose").click(function () {
				// Call tooltip api to close the tooltip
				$inputPdfField.qtip( "api" ).toggle( false );
			});
	
			// When focus or hover on document field activate corresponding step field
			$inputPdfField.focus(function () {
				CommonFunctions.selectStepField( $stepField );
			}).hoverIntent({
				over : function (){
					CommonFunctions.selectStepField( $stepField );
				},
				out: function () {
				},
				interval: 200
			});
			
			// When click on step div scroll document to corresponding field position and focus that field
			$stepField.click(function () {
				
				$('html, body').animate({
					scrollTop: ( $inputPdfField.parent().offset().top - $( "#topDiv" ).height() - 300 )
				}, 1000);
				
				if ( $inputPdfField.is(":visible") ) {
					$inputPdfField.focus();
				} else {
					CommonFunctions.selectStepField( $stepField );		
					$inputPdfField.qtip( 'show' );
				}
				
			});
		});
		
		// Remove original stepXX field
		$("#stepXX").remove();
		// Select initial field
		CommonFunctions.selectStepField( $("#stepStart") );		
			
		// For date field fill it with the todays date
	    $(".datePDFField").each(function() {
			
			var $field = $(this);
			var today = new Date();
			$field.html( today.asString( "dd/mm/yyyy" ) );
			
	    });
		
		// Fill date for signature div
		$(".signatureDate").html( (new Date()).asString( "dd/mm/yyyy" ) );
	        
	    // Validation for input fields
	    $("#content").validate({
	    	errorPlacement: null,
	    	showErrors: function(errorMap, errorList) {
	    		
	    		var i, elements, errorClass = this.settings.errorClass;
	    		var $firstElement, $firstPDFField, $pdfField; 
	    		
	    		if ( errorList.length > 0 ) {
		    		
	    			$firstElement = $(errorList[0].element);	    		
		    		$firstPDFField = $firstElement.hasClass("fakeValidation") ? $firstElement.parent().find(".signPDFField") : $firstElement;
		    		
		    		$.each(errorList, function () {
		    			
		    			$pdfField = $(this.element).hasClass("fakeValidation") ? $(this.element).parent().find(".signPDFField") : $(this.element);
				    	$pdfField.addClass(errorClass);
		    			
		    		});
					
	    		}
	    		
				for ( i = 0, elements = this.validElements(); elements[i]; i++ ) {
		    		$pdfField = $(elements[i]).hasClass("fakeValidation") ? $(elements[i]).parent().find(".signPDFField") : $(elements[i]); 
		    		$pdfField.removeClass(errorClass);
				}

	    	},
	    	errorClass: 'inputPDFFieldError'
	    });
		
		// Set bottom message for user
		updateBottomMessage( remainingSteps );
		
		// Bind "not sign" link
		$(".signatureNotSigning").click( function (){
		
			lockScroll();
			$(".signatureWrapper,.signatureNotSignDiv").show();
			$(".signatureNotSignTextArea").focus();
			
		});
		$(".signatureNotSignTextArea").keyup( function(){
			
			var $textarea = $(this);
			if ( $textarea.val() == "" ) {
				$(".signatureNotSignDone").removeClass("activeButton");
			} else {
				$(".signatureNotSignDone").addClass("activeButton");
			}
			
		});
		$(".signatureNotSignClose").click( function (){
			
			unlockScroll();			
			$(".signatureWrapper,.signatureNotSignDiv").hide();
			
		});		
		$(".signatureNotSignDone").click( function (){
			if ( $(".signatureNotSignTextArea").val() != "" ) {
				// Navigate to finish page
			}
		});
		$(".signatureNotSignCancel").click( function (){
			$(".signatureNotSignTextArea").val("");
			unlockScroll();
			$(".signatureWrapper,.signatureNotSignDiv").hide();
		});
		
		
	};
		
	return {
		init : function () {
		
			$stepsDiv = $("#topStepsDiv");
			$tooltipDiv = $(".tooltipDiv");
			$signatureDiv = $(".signatureDiv");
			pagesJSON = JSON.parse( $( "#pagesJSON" ).html() );
			remainingSteps = numberOfSteps = CommonVars.stepsNr();
			
			fillDocument();
			
		}		
	};		
})();

$(document).ready(function() {
	FillDocument.init();
});