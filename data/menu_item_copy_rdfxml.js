// menu_item_copy_rdfxml.js - content script for menu item "Copy metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

(function() {
    "use strict";

    self.on("click", function (node, data) {
        if (data === 'page') {
            node = document.body;
        }

        self.postMessage({ 'rdf': node.getAttribute(gMetadataAttr) });
    });
}());
