// menu_item_copy_rdfxml.js - content script for menu item "Copy metadata"
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

    // Get all RDFa embedded triples for this image
    var rdf = rdfxml.fromSubject(document, node.src, data == 'deep');

    if (rdf) {
	self.postMessage({ 'rdf': rdf });
    }
    else {
	alert("Could not extract RDF/XML metadata");
    }
});
