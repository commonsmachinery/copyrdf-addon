// menu_item_copy_main_image.js - content script for menu item "Copy main image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

(function() {
    "use strict";

    self.on("click", function () {
        self.postMessage(getImageWithMetadata(
            null,
            document.body.getAttribute(gMainImageMetadataAttr),
            document.body.getAttribute(gMainImageIdAttr),
            document.body.getAttribute(gMainImageSelectorAttr),
            document.body.getAttribute(gMainImageSubjectAttr)
        ));
    });
    
    self.on("context", function() {
        return document.body.hasAttribute(gMainImageIdAttr);
    });

}());
    
