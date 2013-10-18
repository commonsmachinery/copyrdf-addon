// menu_item_copy_main_image.js - content script for menu item "Copy main image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

self.on("click", function (node, data) {
    var image = pageMetadata.findMainImage();

    if (!image) {
	alert("Could not find main image and extract RDF/XML metadata");
	return;
    }	

    self.postMessage(getImageWithMetadata(image.subject, image.element, data));
});

self.on("context", function(node) {
    return pageMetadata.findMainImage() != null;
});

