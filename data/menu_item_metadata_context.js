// menu_item_metadata_context.js - activate menu items when there's metadata available
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


self.on("context", function (node) {
    // Make sure we have the RDFa API on the page
    if (typeof document.data == 'undefined') {
	console.log('attaching RDFa API');
	GreenTurtle.attach(document);
    }

    // For now, only support img tags. Assume the menu item have
    // already filtered for that.

    return document.data.getSubject(node.src) != null;
});

