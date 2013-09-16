var FillDocument = (function () {

	var $tooltipDiv;
	var $stepsDiv;
	var $signatureDiv;
	
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
				
		if (!canvas.getContext) {
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
					context.closePath();
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
					   context.closePath();
					   this.isDrawing = false;
				   }
			   },
			   mouseleave: function (position) {
				   if (this.isDrawing) {
					   this.mousemove(position);
					   context.closePath();
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
	
	var fillDocument = function (htmlContent) {
	
		$("#htmlContent").remove();
		
		// Restore html content
		$("#document").empty().html(htmlContent);
						
		CommonFunctions.selectStepField( $("#stepStart") );
					
		var numberOfTooltips = $("#document .inputPDFField").length;
		$("#document .inputPDFField").each(function (i) {
			
			var $pdfField  = $(this);
			var pdfField = $pdfField[0];
			var index = i + 1;
			$("#stepFinish").before($("#stepXX").clone().attr("id","step"+index));
			$("#step"+index).html($("#stepXX").html().replaceAll("XX",index));

			var $stepField = $("#step"+index);
			
			steps.push( {completed: false, $stepField: $stepField } );
			
			fieldSteps[pdfField.id] = $stepField;

			var $tooltipDiv1;
			$tooltipDiv1 = $tooltipDiv.clone().html($tooltipDiv.html().replaceAll("?",index));

			$pdfField.qtip({
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
					
			if ($pdfField.hasClass("signPDFField")) {
			
				$tooltipDiv1.find(".commentTooltip,.emailTooltip").remove();
				
				var $signatureDiv1 = $signatureDiv.clone().appendTo( 'body' );
				
				fieldSign[pdfField.id] = {
					$signatureDiv : $signatureDiv1,
					signed: false,
					draw: false
				};
				
				if (index == 1) {
					$signatureDiv1.find(".signatureGoBack").remove();
				} else if (index == numberOfTooltips) {
					$signatureDiv1.find(".signatureNext").remove();
				}

				$pdfField.click(function () {
					$signatureDiv1.show();
					$signatureDiv1.find(".signatureCanvasDiv").css({
						width: $signatureDiv1.find('.signatureInput').get(0).offsetWidth
					});
				});
				
				var $fakeValidationField = $pdfField.parent().find(".fakeValidation");
				var $signatureSpan = $signatureDiv1.find(".signatureSpan");
				
				$signatureDiv1.find(".signatureInput").keyup(function () {
					var $this = $(this);
					if ( !$signatureSpan.hasClass("signatureSpanHandWriting") ) {
						$signatureSpan.addClass("signatureSpanHandWriting");
					}
					$signatureSpan.html( $this.val() );
					if (typeof $fakeValidationField !== "undefined") {
						if ( $(this).val() == "") {
							$fakeValidationField.val("").trigger("keyup");
						} else {
							$fakeValidationField.val("X").trigger("keyup");				
						}
					}
				});
				
				$signatureSpan.click( function () {
					
					fieldSign[pdfField.id].draw = true;
					
					$signatureDiv1.find('.signatureInput').attr("disabled", true);

					createDrawer( $signatureDiv1, $fakeValidationField );
										
					$signatureSpan.parent().hide();
					
				});
			
				$signatureDiv1.find(".signatureGoBack").click( function () {
					$signatureDiv1.hide();
					steps[i-1].$stepField.click();
				});
				
				$signatureDiv1.find(".signatureNext").click( function () {
					$signatureDiv1.hide();
					steps[i+1].$stepField.click();
				});

				$signatureDiv1.find(".signatureClose").click( function () {
					$signatureDiv1.hide();
				});

				$signatureDiv1.find(".signatureApply").click( function () {
					fieldSign[pdfField.id].signed = true;
					$signatureDiv1.hide();
				});
				
				$signatureDiv1.find(".signatureReset").click( function () {
				
					$signatureDiv1.find('.signatureInput').val("").removeAttr("disabled");
					
					if ( fieldSign[pdfField.id].draw ) {
						$signatureDiv1.find('.signatureCanvas').remove();										
					}
					
					$signatureSpan.parent().removeClass("signatureSpanHandWriting").show();
					$signatureSpan.html( $signatureDiv.find(".signatureSpan") );
					
				});
				
				$signatureDiv1.focus( function (event) {
					event.stopImmediatePropagation();
				});
				
			} else if ($pdfField.hasClass("commentPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.emailTooltip").remove();
				
			} else if ($pdfField.hasClass("emailPDFField")) {
				
				$tooltipDiv1.find(".signTooltip,.commentTooltip").remove();
				
			}
			
			if (index == 1) {
				$tooltipDiv1.find(".tooltipGoBack").remove();
			} else if (index == numberOfTooltips) {
				$tooltipDiv1.find(".tooltipNext").remove();
			}
			
			$tooltipDiv1.find(".tooltipGoBack").click(function () {
				steps[i-1].$stepField.click();
			});
			
			$tooltipDiv1.find(".tooltipNext").click(function () {
				steps[i+1].$stepField.click();					
			});

			$tooltipDiv1.find(".tooltipClose").click(function () {
				$pdfField.qtip( "api" ).toggle( false );
			});
	
			$pdfField.focus(function () {
				CommonFunctions.selectStepField( $stepField );
			})
			$pdfField.hover(function () {
				CommonFunctions.selectStepField( $stepField );
			})
			
			$stepField.click(function () {
				
			    $('html, body').animate({
			        scrollTop: ($pdfField.offset().top - $("#topDiv").height() - 300)
			    }, 1000);
			    
			    $pdfField.focus();
			    
			});
			
		});
			
		$("#stepXX").remove();
			
	    $(".datePDFField").each(function() {
			
			var $field = $(this);
			
			var fecha = Date.today().toString("dddd, MMMM dXXXX, yyyy");
			$field.html($field.html() + fecha.replace("XXXX", Date.today().getOrdinal()));					
			
			$field.removeClass("hiding");
			
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
	   
	    $("#bottomMessage").html(bottomMessage);
	    
	    $(".validateButton").click(function () {
	    	$("#content").valid();
	    });
	
	};
	
	return {
		init : function (htmlContent) {
			$stepsDiv = $("#topStepsDiv");
			$tooltipDiv = $(".tooltipDiv");
			$signatureDiv = $(".signatureDiv");
			fillDocument( htmlContent );			
		}		
	};		
})();

$(document).ready(function() {
    var htmlContent = CommonVars.htmlContent();
	FillDocument.init( htmlContent );
});