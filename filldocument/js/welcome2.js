$(document).ready(function() {

  $("body").addClass("welcomeBody");

  CommonFunctions.createSteps();
  CommonFunctions.selectStepField( $( "#stepStart" ));

	$( "#welcomeMessage1" ).html( "Not received your passcode by SMS?" );

	// Define tooltip
	$(".passInput").qtip({
		content: {
		title: $(".passInput").attr("banner"),
		text: $(".passInput").attr("message")
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
