// menu_item_copy_main_image.js - content script for menu item "Copy main image with metadata"
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

(function() {
    "use strict";

    self.on("click", function (node, data) {
        var id;

        id = document.body.getAttribute(gMainImageIdAttr);
        if (id) {
            node = document.querySelector('img[' + gElementIdAttr + '="' + id + '"]');
            if (node) {
                self.postMessage(getImageWithMetadata(node));
            }
            else {
                alert("Copy RDFa: could not find main image element");
            }
        }
        else {
            alert("Copy RDFa: could not find main image ID");
        }
    });
    
    self.on("context", function() {
        return document.body.hasAttribute(gMainImageIdAttr);
    });

}());
    
