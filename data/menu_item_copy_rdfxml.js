// menu_item_copy_rdfxml.js - content script for menu item "Copy metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

self.on("click", function (node, data) {
    var rdfDoc;
    var subject = findImageSubject(node);

    if (!subject) {
	alert("Could not extract RDF/XML metadata");
	return;
    }	

    rdfDoc = rdfxml.fromSubject(document, subject, data === 'deep');
    self.postMessage({ 'rdf': rdfxml.serializeDocument(rdfDoc) });
});
