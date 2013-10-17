// menu_item_metadata_context.js - activate menu items when there's metadata available
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


self.on("context", function (node) {
    return findImageSubject(node) != null;
});
