$(document).ready(function() {
	
	$("body").addClass("welcomeBody");
	CommonFunctions.selectStepField( $("#stepStart") );
	
	var stepsNr = CommonVars.stepsNr();
	for (var index = 1; index <= stepsNr ;index++) {
		$("#stepFinish").before($("#stepXX").clone().attr("id","step"+index));
		$("#step"+index).html($("#stepXX").html().replaceAll("XX",index));		
	};
	
	$("#stepXX").remove();

	$("#welcomeMessage1").html("Forgot your password or don't want to sign online?");
	$("#welcomeMessage2").html('Please <a class="welcomeLink" href="">click here to contact us</a>');

	// Define tooltip
	$(".passInput").qtip({
		content: {
			title: "Welcome, Paul Musgrave",
			text: "Before you can sign documents we need to confirm some security details.<br>To get started, please enter your password."
		},
		hide: false,
		style: {
			classes: 'qtip-welcome qtip-shadow qtip-rounded'
		},
		position: {
			my: "bottom left",
			at: "top+10 left-20"
		}
	});
	
	$(".passInput").qtip("api").show();

	$(".passButton").click(function () {
		$("#content").submit();
	});
	
});
	
