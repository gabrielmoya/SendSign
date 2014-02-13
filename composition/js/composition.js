var Composition = (function () {
	
	// Draggable options for top fields
	var draggableTopFieldsOptions = {
			helper: "clone",
			scroll: true,
			scrollSensitivity: 100,
			appendTo: ".innerDocument",
			containment: ".innerDocument",
			revert: "invalid",
			snap: ".clonedDiv",
			snapMode: "outer",
			start: function (event, ui) {
				// Add class to know that field has just been dragged from top
				$(ui.helper).addClass("recentlyClonedDiv");
			}
	};

	// Draggable options for document fields
	var draggableFieldsOptions = {
			helper: "original",
			scroll: true,
			scrollSensitivity: 100,
			appendTo: ".innerDocument",
			containment: ".innerDocument",
			revert: "invalid",
			snap: ".clonedDiv",
			snapMode: "outer"
	};
	
	// Resizable options for document fields
	var resizableFieldsOptions = {
			containment: "parent"
	}
	
	// Keep counter for number of dragged fields, keep also last id assigned to avoid duplicates
	var counter = {
			signField: {count : 0, id : 0},
			commentField: {count : 0, id : 0},
			dateField: {count : 0, id : 0},
			emailField: {count : 0, id : 0}	
	};
	
	return {

		// Init function for the  Composition module
		//    MAX_DRAGS: Maximun number of the same type of field which can be added to the document
		init: function (MAX_DRAGS) {
						
			// Set options for top draggable fields
			$( ".formField" ).draggable( draggableTopFieldsOptions );
			
			// Actions for droppable element
			$(".PDFPage").droppable({
				tolerance: "fit",
				drop: function(event, ui) {

					var $droppable = $(this);

					// Check if the field comes from the top bar
					if ( $(ui.helper).hasClass("recentlyClonedDiv") ) {				 	

						$(ui.helper).removeClass("recentlyClonedDiv").addClass("clonedDiv");

						var elId = $(ui.draggable).attr("id");
						
						for (var typeOfField in counter) {
							
							if ($(ui.helper).hasClass(typeOfField)) {
								
								counter[typeOfField].count += 1;
								counter[typeOfField].id += 1;
								
								$(ui.helper).attr("id", elId + counter[typeOfField].id);
								$(ui.helper).find(".formInnerDiv").attr("id", $(ui.helper).find(".formInnerDiv").attr("id") + counter[typeOfField].id);

								if ( counter[typeOfField].count == MAX_DRAGS ) {
									$(ui.draggable).draggable( "disable" );
								}
							}
						}
					
						// Appends the element to the document
						var offset = ui.helper.offset();
						var $el = ui.helper.clone().appendTo( $droppable ).offset( offset );
						
						// Get snapped elements
						var snapped = $(ui.draggable).data('ui-draggable').snapElements;
						var snappedTo = $.map(snapped, function(element) {
							return element.snapping ? element.item : null;
						});
						
						// When email field is snapped to the sign field, inherits width and left properties
						if ( ($(snappedTo).length > 0)  && $(snappedTo[0]).hasClass("signField") && $el.hasClass("emailField") ) {
							
							//Set width to the snapped element
							$el.animate({
								width: $(snappedTo[0]).width(),
								left: $(snappedTo[0]).css('left')
							}, 1000);

						}

						// Add draggable properties to the added field to be able to move it into the document 
						$el.draggable( draggableFieldsOptions );

						// If field must be resizable, add also resizable properties
						if ( $el.hasClass('resizableField') ) {

							$el.resizable({
								containment: "parent"
							});
							
						}
						
					} else { // If (hasClass(recentlyClonedDiv))

						var offset = ui.helper.offset();
						ui.draggable.appendTo( $droppable ).offset( offset );
						
					} // Else (hasClass(recentlyClonedDiv))
				} // Function drop
			}); // Droppable
			
			
			// Set contextual menu for deleting form field
			$.contextMenu({
				// Only for fields in the form
		        selector: '.clonedDiv', 
		        // Only delete option
		        items: {
		            "delete": {
		            	name: "Delete",
		            	icon: "delete",
		            	callback: function () {
		            		
		            		// Check which type of field is being deleted
		            		for (var typeOfField in counter) {
								if ($(this).hasClass(typeOfField)) {									
									
									// If the counter has arrived to max number of drags for this type of field
									// enables dragging from top again
									if (counter[typeOfField].count == MAX_DRAGS) {
										$("#topFieldsDiv .formField."+typeOfField).draggable( "enable" );										
									}
									// Substract the counter for this type of field
									counter[typeOfField].count -= 1;
									// Finally remove the field
									$(this).remove();
																		
								}
							}
		            		
		            	}
		            }
		        },
		        // Set zindex to work with ui-resizable z-index 
		        zIndex: 90
		    });

			$("#sendButton").click(function () {
				getHTML();				
			});
		}
	};
})();

function setDocumentHeight () {
	
	// Adjust document div height to fill available space
	var calcHeight = $(window).height() - $("#topFieldsDiv").outerHeight( true ) - $("#sendDiv").outerHeight( true ) - $("#header").outerHeight( true ) - $(".welcome").outerHeight( true ) - $("#footer").outerHeight( true ) - 50;
	$("#document").css({
		height : calcHeight
	});
	
}

$(document).ready(function() {

	// Set height of document
	setDocumentHeight();
	
	// Bind resize of window to recalculate document div height
	$( window ).resize( function (){
		setDocumentHeight();
	});
	
	Composition.init( CommonVars.MAX_DRAGS );
	
});

function getHTML() {

	$(".innerDocument .clonedDiv").each(function() {
		if ( $(this).hasClass("resizableField") ) {
			$(this).removeClass("resizableField");
			CommonFunctions.destroyResizable( $(this) );
		}
		CommonFunctions.destroyDraggable( $(this) );
		$(this).removeClass("formField").removeClass("clonedDiv").addClass("PDFField")
	});
				
	var pages = [];				
	// For each page
	$(".PDFPage").each( function () {
		
		var $pdfPage = $(this);

		var page = {
			nr : $pdfPage.attr( "pagenr" ),
			url : "",
			pdfFields : []
		};
		
		// Order form fields according to top position in the page
		var fieldsOrdered =  $pdfPage.find(".PDFField").toArray().sort( function (a, b) {
			return a.style.top.split('px')[0] - b.style.top.split('px')[0];  
		});
											
		$.each(fieldsOrdered, function () {
			
			var $field = $(this);					
			page.pdfFields.push({
				id : $field.attr( "id" ),
				typeOfField: $field.attr( "typeOfField" ),
				top: $field.css("top").split("px")[0],
				left: $field.css("left").split("px")[0],
				width: $field.css("width").split("px")[0],
				height: $field.css("height").split("px")[0]
			});
								
		});

		pages.push( page );

	});				
	
	$( "#ctl00_ctl00_MainContent_MainContent_hidPageCount" ).html( $( ".innerDocument .PDFField" ).length );
	$( "#ctl00_ctl00_MainContent_MainContent_hidDocJSON" ).html( JSON.stringify( pages ) );
	
}