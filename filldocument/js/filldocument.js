var FillDocument = (function () {

	var $tooltipDiv;
	var $stepsDiv;
	
	// Array of steps to complete
	var steps = [];
	
	// Track relation between fields and steps
	var fieldSteps = {};

	// Informative message to display at the footer of the page
	var bottomMessage = "You need to fill in ? more field before you can <span class='validateButton passButton'>Finish and send</span>";

	// Creates drawer for the sign
	var createDrawer = function ($takeSignatureDiv, $fakeValidationField) {
				
	    var canvas = $takeSignatureDiv.find(".takeSignatureCanvas")[0];
		if (!canvas.getContext) {
			G_vmlCanvasManager.initElement( canvas );
		}		
		var context = canvas.getContext("2d");
	    context.strokeStyle = 'Black';
	    context.font = "normal 30px danielregular";
	    context.textAlign = "center";

	    $takeSignatureDiv.find(".takeSignatureInput").keyup(function () {
			var $this = $(this);
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.fillText($this.val(),canvas.width/2,canvas.height/2);
			if (typeof $fakeValidationField !== "undefined") {
				if ( $(this).val() == "") {
					$fakeValidationField.val("").trigger("keyup");
				} else {
					$fakeValidationField.val("X").trigger("keyup");				
				}
			}
		});
		
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
	   $takeSignatureDiv.find(".takeSignatureCanvas")
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
			var index = i + 1;
			$("#stepFinish").before($("#stepXX").clone().attr("id","step"+index));
			$("#step"+index).html($("#stepXX").html().replaceAll("XX",index));

			var $stepField = $("#step"+index);
			
			steps.push( {completed: false, $stepField: $stepField } );
			
			fieldSteps[$pdfField[0].getAttribute("id")] = $stepField;

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
	    	        classes: 'qtip-sendsign qtip-shadow qtip-rounded'
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
				$pdfField.click(function () {
					$('.signatureDiv').modal({
						zIndex: 17000
					});
					createDrawer( $('.signatureDiv'), $pdfField.parent().find(".fakeValidation") );
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
			fillDocument( htmlContent );			
		}		
	};		
})();

$(document).ready(function() {
    var htmlContent = CommonVars.htmlContent();
	FillDocument.init( htmlContent );
});