$(document).ready(function() {

  $("body").addClass("finishBody");

  CommonFunctions.createSteps();
  CommonFunctions.selectStepField( $("#stepFinish") );

  $("#stepFinish").addClass( "stepFieldCompleted" );

  //$("#finishMessage").html("Thank you. You have finish signing the document.");

});
