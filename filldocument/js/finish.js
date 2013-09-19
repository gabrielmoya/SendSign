$(document).ready(function() {
	
	$("body").addClass("finishBody");
	CommonFunctions.selectStepField( $("#stepFinish") );
	
	$("#stepFinish").addClass( "stepFieldCompleted" );
	
	var stepsNr = CommonVars.stepsNr();	
	for (var index = 1; index <= stepsNr ;index++) {
		$("#stepFinish").before($("#stepXX").clone().attr("id","step"+index));
		$("#step"+index).html($("#stepXX").html().replaceAll("XX",index));
	}	
		
	$("#stepXX").remove();

	$("#finishMessage").html("Thank you. You have finish signing the document.");
	
});
	
