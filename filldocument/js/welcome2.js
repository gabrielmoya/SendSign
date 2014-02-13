$(document).ready(function() {
	
	$("body").addClass("welcomeBody");
	
	var stepsNr = CommonVars.stepsNr();	
	for (var index = 1; index <= stepsNr ;index++) {
		$( "#stepFinish" ).before( $( "#stepXX" ).clone().attr( "id", "step"+index ));
		$( "#step"+index ).html( $( "#stepXX" ).html().replaceAll( "XX", index ));		
	};
	
	$( "#stepXX" ).remove();
	CommonFunctions.selectStepField( $( "#stepStart" ));

	$( "#welcomeMessage1" ).html( "Not received your passcode by SMS?" );
	$( "#welcomeMessage2" ).html( "Please <a class='welcomeLink' href=''>click here to send it again</a>" );

	// Define tooltip
	$(".passInput").qtip({
		content: {
			title: "Thank you. Please check your mobile phone.",
			text: "We have just sent an SMS to your mobile phone.<br>Please enter this passcode to continue."
		},
		hide: false,
		style: {
			classes: 'qtip-welcome qtip-shadow qtip-rounded',
			tip: {
				width: 25,
				height: 25
			}
		},
		position: {
			my: "bottom left",
			at: "top+10 left-20"
		}
	});

	$( ".passInput" ).keyup( function() {
		if ($( ".passInput" ).val() == "") {
			$( ".passButton" ).removeClass("activeButton");
		} else {
			$( ".passButton" ).addClass("activeButton");
		}
	});
	$( ".passInput" ).qtip( "api" ).show();

	$( ".passButton" ).click(function () {
		$( "#content" ).submit();
	});
	
});
