Date.prototype.getOrdinal = function() {
	switch( this.getDate() ) {
		case 1:case 21:case 31:
			return "st";
		case 2:case 22:
			return "nd";
		case 3:case 23:
			return "rd";
		default:
			return "th";
	}
};

Number.prototype.padLeft = function(n,str) {
    return Array(n - String(this).length + 1).join(str||'0') + this;
};

String.prototype.padLeft = function(s,str) {
    return Array(s - String(this).length + 1).join(str||'0') + this;
};

String.prototype.replaceAll = function(str1, str2, ignore) {
   return this.replace(new RegExp(str1.replace(/([\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, function(c){return "\\" + c;}), "g"+(ignore?"i":"")), str2);
};

var CommonVars = (function () {
	return {
		MAX_DRAGS : 5,
		STEPS_TO_SHOW: 4,
		stepsNr : 	function () {
			return Number( $( "#StepsNr" ).html() );
		},
		htmlContent : 	function () {
			return $( "#htmlContent" ).html();
		},
		typeOfFields : [ "sign", "comment", "date", "email" ]
	};
})();

var CommonFunctions = (function () {
	return {
		selectStepField : function ( $stepField ) {
	
			$( ".stepFieldSelected" ).removeClass( "stepFieldSelected" ).addClass( "stepFieldDisabled" );
			$stepField.removeClass( "stepFieldDisabled" ).addClass( "stepFieldSelected" );
						
			this.showSteps( $stepField );
			
		},
		showSteps : function ( $stepField ) {
		
			var stepsNr = CommonVars.stepsNr();
			var selectedStep = Number( $stepField.attr( "stepnr" ) );
			
			$( "#stepPrev" ).hide();
			$( "#stepNext" ).hide();
		
			if ( stepsNr > CommonVars.STEPS_TO_SHOW ) {
			
				$(".stepSelectableField").hide();
				
				var fieldsBack, fieldsNext;
				
				if ( CommonVars.STEPS_TO_SHOW % 2 == 0) {
					fieldsBack = (CommonVars.STEPS_TO_SHOW / 2) - 1;
					fieldsNext = (CommonVars.STEPS_TO_SHOW /2 );
				} else {
					fieldsBack = fieldsNext = (CommonVars.STEPS_TO_SHOW - 1) / 2;
				}
							
				var stepIndex;
				if ( selectedStep <= (CommonVars.STEPS_TO_SHOW - fieldsNext) ) {
					$( "#stepNext" ).show();
					for (stepIndex = 1; stepIndex <= CommonVars.STEPS_TO_SHOW; stepIndex++) {
						$( "#step"+stepIndex ).show();
					}	
				} else if ( selectedStep > (stepsNr - (CommonVars.STEPS_TO_SHOW - fieldsBack) ) ) {
					$( "#stepPrev" ).show();
					for (stepIndex = (stepsNr - (CommonVars.STEPS_TO_SHOW - fieldsBack)); stepIndex <= stepsNr; stepIndex++) {
						$( "#step"+stepIndex ).show();
					}	
				} else {
					$( "#stepNext,#stepPrev" ).show();
					for (stepIndex = (selectedStep - fieldsBack); stepIndex <= (selectedStep + fieldsNext); stepIndex++) {
						$( "#step"+stepIndex ).show();
					}	
				}				
			}
		},
		// Workaround to avoid resize of field when resize is destroyed
		destroyResizable: function ($el) {

			//before destroy
			var p = $el.css('position');
			var w = $el.innerWidth(); //take the inner width
			var h = $el.innerHeight(); //take the inner height
			var top = $el.css('top');
			var left = $el.css('left');
			//destroy

			$el.resizable( "destroy" );

			//restore original
			$el.css({
				position: p,
				width: w,
				height: h,
				top: top,
				left: left
			});

		},
		destroyDraggable: function ($el) {

			$el.enableSelection().removeData("draggable").unbind(".draggable").removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled");

		},
		getOffset: function (el) {

			var el1 = el;    
			var offset = { x: 0, y: 0 };
			
			if (el1.offsetParent) {
				// Every time we find a new object, we add its offsetLeft and offsetTop to curleft and curtop.
				do {
					offset.x += el1.offsetLeft;
					offset.y += el1.offsetTop;
				}
				// The while loop can be "while (obj = obj.offsetParent)" only, which does return null
				// when null is passed back, but that creates a warning in some editors (i.e. VS2010).
				while ((el1 = el1.offsetParent) != null);
			} else {
				offset = { x: el1.offsetLeft, y: el1.offsetTop };
			}

			return offset;
		}	
	};
})();

