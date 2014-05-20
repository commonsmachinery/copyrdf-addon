// menu_item_copy_image.js - content script for menu item "Copy image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global getImageWithMetadata */

(function() {
    "use strict";

    self.on("click", function (node) {
        self.postMessage(getImageWithMetadata(
            node,
            node.getAttribute(gMetadataAttr),
            node.getAttribute(gOverlayIdAttr),
            node.getAttribute(gOverlayElementSelectorAttr),
            node.getAttribute(gOverlaySubjectAttr)
        ));
    });
}());

