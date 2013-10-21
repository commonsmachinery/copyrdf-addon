// menu_item_copy_rdfxml.js - content script for menu item "Copy metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

self.on("click", function (node, data) {
    var rdfDoc;
    var subjects;
    var image;

    if (data === 'image') {
	image = pageMetadata.findImageSubject(node);
	if (!image) {
	    alert("Could not extract RDF/XML metadata");
	    return;
	}
	subjects = image.subject;
    }
    else {
	subjects = pageMetadata.getAllSubjects();
	if (!subjects || !subjects.length) {
	    alert("Could not extract RDF/XML metadata");
	    return;
	}	
    }

    rdfDoc = rdfxml.fromSubject(document, subjects, true);
    self.postMessage({ 'rdf': rdfxml.serializeDocument(rdfDoc) });
});
