// menu_item_copy_image.js - content script for menu item "Copy image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

self.on("click", function (node, data) {
    // Make sure we have the RDFa API on the page
    if (typeof document.data == 'undefined') {
	console.log('attaching RDFa API');
	GreenTurtle.attach(document);
    }

    // Get all RDFa embedded triples for this image Rewrite URI to
    // make it easy for paster to find the right Description (i.e. the
    // one with rdf:about="")

    // Try image URI first
    var rdf = rdfxml.fromSubject(document, { srcURI: node.src, destURI: '' }, true);

    // And fall back on any ID
    if (rdf == null && node.id)
	rdf = rdfxml.fromSubject(document, { srcURI: '#' + node.id, destURI: '' }, true);

    if (rdf) {
	// It's not possible to pass the DOM element node through
	// postMessage since it's destroyed by the JSON serialisation.
	// Hack around that by tagging it with a magic ID and passing that 
	// to the main code, which can then find it in the document.
	
	var id = uuid.v1();
	node.setAttribute(data, id);

	self.postMessage({ 'id': id, 'rdf': rdf });
    }
    else {
	alert("Could not extract RDF/XML metadata");
    }	
});
