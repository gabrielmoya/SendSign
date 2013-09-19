var FillDocument = (function () {

	var $tooltipDiv;
	var $stepsDiv;
	var $signatureDiv;
	var pagesJSON;
	var canvasIE8 = true;
	
	// Control variable to check when modal window is visible
	var signModal = false;
	
	// Array of steps to complete
	var steps = [];
	
	// Track relation between fields and steps
	var fieldSteps = {};

	// Track relation between signature fields and signature divs
	var fieldSign = {};
	
	// Informative message to display at the footer of the page
	var bottomMessage = "You need to fill in ? more field before you can <span class='validateButton sendSignButton'>Finish and send</span>";

	// Creates drawer for the sign
	var createDrawer = function ($signatureDiv, $fakeValidationField) {
		
		$('<canvas class="signatureCanvas"></canvas>').appendTo($signatureDiv.find('.signatureCanvasDiv'));

		var $canvas = $signatureDiv.find('.signatureCanvas');
		var canvas = $canvas[0];
		
		canvas.width = $signatureDiv.find('.signatureInput').get(0).offsetWidth;
		canvas.height = 150;
				
		if ( !canvas.getContext ) {
			canvasIE8 = false;
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
						$fakeValidationField.val("X").trigger("keyup");
					}
				 }
			  },
			  touchend: function (position) {
				 if (this.isDrawing) {
					this.touchmove(position);
					//context.closePath();
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
							$fakeValidationField.val("X").trigger("keyup");
					   }
				   }
			   },
			   mouseup: function (position) {
				   if (this.isDrawing) {
					   this.mousemove(position);
					   //context.closePath();
					   this.isDrawing = false;
				   }
			   },
			   mouseleave: function (position) {
				   if (this.isDrawing) {
					   this.mousemove(position);
					   //context.closePath();
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
		createDrawer( $signatureDiv, $fakeValidationField );							
		$signatureSpan.parent().hide();
	};
	
	var setStepCompleted = function ( $validationField, $stepField ) {
	
		//console.log( $validationField.valid() );
		//$stepField.addClass( "stepFieldCompleted" );
		
	};
	
	var fieldsHtml = {
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
	};
	
	var fillDocument = function (){
	
		// Set document to JSON content from server
		$.each(pagesJSON, function (){
			var currentPage = this;
			var $page = $( fieldsHtml.page.replaceAll( "?", currentPage.nr ) );
			$page.appendTo( "#innerDocument" ).append( $(fieldsHtml.img.replaceAll("?", currentPage.url) ) );
			$.each(currentPage.pdfFields, function (){
				var field = this;
				var $field = $( fieldsHtml[field.typeOfField].replaceAll("?", field.id) );
				$field.appendTo( $page ).css({
					position: "absolute",
					top     : field.top + "px",
					left    : field.left + "px",
					width   : field.width + "px",
					height  : field.height  + "px"
				});
			});
		});
		
		// Select initial field
		CommonFunctions.selectStepField( $("#stepStart") );
					
		// Check total number of tooltips
		var numberOfTooltips = $("#document .inputPDFField").length;
		
		// Iterate over all input fields
		$("#document .inputPDFField").each(function (i) {
			
			// Get references to jquery and DOM elements for the field
			var $inputPdfField  = $(this);
			var inputPdfField = $inputPdfField[0];
			
			// Get references to jquery and DOM elements for the parent DIV of field
			var $pdfField = $inputPdfField.parent();
			var pdfField = $pdfField[0];
			
			// Set index for step ids and create new step
			var index = i + 1;
			$("#stepFinish").before( $("#stepXX").clone().attr("id","step"+index) );
			$("#step"+index).html( $("#stepXX").html().replaceAll("XX",index) );

			// Get jquery reference to step field and add it to array control of steps
			var $stepField = $( "#step"+index );
			steps.push( {completed: false, $stepField: $stepField } );
			
			// Also add it to pdfField -> stepField control object
			fieldSteps[inputPdfField.id] = $stepField;

			// Clone tooltip content to create new tooltip with correct text
			var $tooltipDiv1 = $tooltipDiv.clone().html( $tooltipDiv.html().replaceAll("?",index) );
			
			// Create tooltip
			$inputPdfField.qtip({
		    	content: $tooltipDiv1,
	    		show: {
	    			event: "focus mouseover",
	    			solo: true
	    		},
	    		hide: "unfocus",
	    		style: {
	    	        classes: 'qtip-sendsign qtip-shadow qtip-rounded',
					tip: {
						width: 20,
						height: 20
					}
	    	    },
	    	    position: {
	    	    	my: "bottom left",
	    	    	at: "top left+5",
	    	    	collision: "flip",
	    	    	within: "#innerDocument"
	    	    }
	    	});
					
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
				
				// Signature navigation controls: Remove back or next spans if it's the first or last step
				if ( index == 1 ) {
					$signatureDiv1.find(".signatureGoBack").remove();
				} else if ( index == numberOfTooltips ) {
					$signatureDiv1.find(".signatureNext").remove();
				}

				// Bind click on sign field to open the modal div
				$inputPdfField.click(function () {
					
					signModal = true;
					
					// Show div and set correct width for signature canvas div
					$signatureDiv1.show().find(".signatureCanvasDiv").css({
						width: $signatureDiv1.find('.signatureInput').get(0).offsetWidth
					});
									
					// Bind focus event on div to work as an overlay
					$signatureDiv1.focus( function (event) {
						event.stopImmediatePropagation();
					});
					
				});
				
				// Get references to fake validation field and signature span
				var $fakeValidationField = $inputPdfField.parent().find(".fakeValidation");
				var $signatureSpan = $signatureDiv1.find(".signatureSpan");
				
				// Bind keyup on input field if the user decides to input his name
				$signatureDiv1.find(".signatureInput").keyup(function () {			
					var $this = $(this);
					
					// Add class for handwriting font and set control variable to signed
					if ( !$signatureSpan.hasClass("signatureSpanHandWriting") ) {
						fieldSign[pdfField.id].signed = true;
						$signatureSpan.addClass("signatureSpanHandWriting").unbind( "click" ).removeClass( "spanClickable" );
					}
					
					// Set content of span to value of the input field
					$signatureSpan.html( $this.val() );
					
					// Set fakevalidation field value and trigger keyup event for validation plugin to work correctly
					if ( $(this).val() == "") {
						$fakeValidationField.val("").trigger("keyup");
					} else {
						$fakeValidationField.val("X").trigger("keyup");				
					}
					
				});
				
				// Bind signature span click to let the user choose if prefers to draw the signature
				$signatureSpan.click( function () {				
					fieldSign[pdfField.id].draw = true;
					signatureSpanClickHandler( $signatureSpan, $signatureDiv1, $fakeValidationField );
				}).addClass( "spanClickable" );
			
				// Bind previous span navigation control of signature div
				$signatureDiv1.find(".signatureGoBack").click( function () {
					signModal = false;
					$signatureDiv1.hide();
					steps[i-1].$stepField.click();
				});
				
				// Bind next span navigation control of signature div
				$signatureDiv1.find(".signatureNext").click( function () {
					signModal = false;
					$signatureDiv1.hide();
					steps[i+1].$stepField.click();
				});

				// Bind close span navigation control of signature div
				$signatureDiv1.find(".signatureClose").click( function () {
					signModal = false;
					$signatureDiv1.hide();
				});

				// Bind apply button to send the signature
				$signatureDiv1.find(".signatureApply").click( function () {
				
					fieldSign[pdfField.id].signed = true;
					
					signModal = false;
					$signatureDiv1.hide();
					
					var $parent = $inputPdfField.parent();
					
					if ( fieldSign[pdfField.id].draw ) {
						var canvas = $signatureDiv1.find('.signatureCanvas')[0];
						if ( !canvas.toDataURL ) {
							fieldSign[pdfField.id].vml = true;
							fieldSign[pdfField.id].value = canvas.innerHTML;
						} else {
							fieldSign[pdfField.id].value = canvas.toDataURL();
						}
						var $signatureCanvas = $signatureDiv1.find('.signatureCanvas');
						$signatureCanvas.appendTo( $parent );
						
						if ( canvasIE8 ) {
							/*$signatureCanvas.css({
								// Fix for IE8 set width and height css attributes
								width: $parent.css( "width" ),
								height: $parent.css( "height" ) 
							}).attr({
								// Fix for IE8 set width and height element attributes
								width: $parent.css( "width" ),
								height: $parent.css( "height" ) 
							});*/
						}
						
					} else {
						fieldSign[pdfField.id].value = $signatureDiv1.find('.signatureInput').val();
						$signatureSpan.appendTo( $parent );
					}
					
					$inputPdfField.hide();
					
					setStepCompleted( $fakeValidationField, $stepField );
					
				});
				
				// Bind reset button to restart the modal div
				$signatureDiv1.find(".signatureReset").click( function () {
				
					// Set empty value and remove disabled attribute to input field
					$signatureDiv1.find( ".signatureInput" ).val( "" ).removeAttr( "disabled" );
					// Reset value from fake field for validation plugin
					$fakeValidationField.val("");
					
					// If the user was drawing remove the created canvas
					if ( fieldSign[pdfField.id].draw ) {
						$signatureDiv1.find( ".signatureCanvas" ).remove();
					}
					
					// Set html content of span to original content, remove class for hand writing font and show it
					$signatureSpan.html( $signatureDiv.find(".signatureSpan").html() ).removeClass("signatureSpanHandWriting").parent().show();

					// Initialize control variables
					fieldSign[pdfField.id].signed = false;
					fieldSign[pdfField.id].draw   = false;
					
					// Re-bind signature span click to let the user choose if prefers to draw the signature
					$signatureSpan.click( function () {
						fieldSign[pdfField.id].draw = true;
						signatureSpanClickHandler( $signatureSpan, $signatureDiv1, $fakeValidationField );
					}).addClass( "spanClickable" );
					
				});
				
			// For comment field remove sign and email tooltip content
			} else if ($inputPdfField.hasClass("commentPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.emailTooltip").remove();
				$inputPdfField.keyup( function () {
					setStepCompleted( $inputPdfField, $stepField );
				});
				
			// For email field remove sign and comment tooltip content
			} else if ($inputPdfField.hasClass("emailPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.commentTooltip").remove();
				$inputPdfField.keyup( function () {
					setStepCompleted( $inputPdfField, $stepField );
				});
				
			}
			
			// Tooltip navigation controls: Remove back or next spans if it's the first or last step
			if (index == 1) {
				$tooltipDiv1.find(".tooltipGoBack").remove();
			} else if (index == numberOfTooltips) {
				$tooltipDiv1.find(".tooltipNext").remove();
			}
			
			// Bind tooltip GoBack span
			$tooltipDiv1.find(".tooltipGoBack").click(function () {
				// Simulate click on the previuos step
				steps[i-1].$stepField.click();
			});
			
			// Bind tooltip Next span
			$tooltipDiv1.find(".tooltipNext").click(function () {
				// Simulate click on the next step
				steps[i+1].$stepField.click();					
			});

			// Bind tooltip Close span
			$tooltipDiv1.find(".tooltipClose").click(function () {
				// Call tooltip api to close the tooltip
				$inputPdfField.qtip( "api" ).toggle( false );
			});
	
			// When focus or hover on document field activate corresponding step field
			$inputPdfField.focus(function () {
				if ( !signModal ) {
					CommonFunctions.selectStepField( $stepField );
				}
			}).hover(function () {
				if ( !signModal ) {
					CommonFunctions.selectStepField( $stepField );
				}
			});
			
			// When click on step div scroll document to corresponding field position and focus that field
			$stepField.click(function () {
				
				if ( !signModal ) {
					$('html, body').animate({
						scrollTop: ($inputPdfField.offset().top - $("#topDiv").height() - 300)
					}, 1000);					
					$inputPdfField.focus();
				}
							    
			});
			
		});
		
		// Remove original stepXX field
		$("#stepXX").remove();
			
		// For date field fill it with the todays date
	    $(".datePDFField").each(function() {
			
			var $field = $(this);
			var today = new Date();
			$field.html( today.asString( "dd/mm/yyyy" ) );
			
	    });
	        
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
					
		    		fieldSteps[$firstPDFField[0].getAttribute("id")].click();
	    		}
	    		
				for ( i = 0, elements = this.validElements(); elements[i]; i++ ) {
		    		$pdfField = $(elements[i]).hasClass("fakeValidation") ? $(elements[i]).parent().find(".signPDFField") : $(elements[i]); 
		    		$pdfField.removeClass(errorClass);
				}

	    	},
	    	errorClass: 'inputPDFFieldError'
	    });
		
		// Set bottom message for user
	    $("#bottomMessage").html(bottomMessage);
	    
		// Bind submit button to validate form
	    $(".validateButton").click(function () {
			
			// Validate form
			$("#content").valid();
			
			// Update JSON with values
			$.each(pagesJSON, function () {
				var page = this;
				$.each(page.pdfFields, function (){
					var field = this;
					var $pdfField = $( "#"+field.id );
					if ( field.typeOfField == "sign" ) {
						field.draw  = fieldSign[ field.id ].draw;
						field.vml   = fieldSign[ field.id ].vml;
						field.value = fieldSign[ field.id ].value;
					} else if ( field.typeOfField == "date" ) {
						field.value = $pdfField.find( ".datePDFField" ).html();
					} else {
						field.value = $pdfField.find( ".inputPDFField" ).val();
					}
				});
			});
			$( "#pagesJSON" ).html( JSON.stringify( pagesJSON ) );						
			
	    });	
	};
	
	return {
		init : function () {
		
			$stepsDiv = $("#topStepsDiv");
			$tooltipDiv = $(".tooltipDiv");
			$signatureDiv = $(".signatureDiv");
			pagesJSON = JSON.parse( $( "#pagesJSON" ).html() );
			
			fillDocument();
			
		}		
	};		
})();

$(document).ready(function() {
	FillDocument.init();
});