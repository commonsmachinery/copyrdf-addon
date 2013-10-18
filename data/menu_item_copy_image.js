// menu_item_copy_image.js - content script for menu item "Copy image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

self.on("context", function(node) {
    return pageMetadata.findImageSubject(node) != null;
});


self.on("click", function (node, data) {
    var subject = pageMetadata.findImageSubject(node);

    if (!subject) {
	alert("Could not extract RDF/XML metadata");
	return;
    }	

    self.postMessage(getImageWithMetadata(subject, node, data));
});

