// menu_item_catalog_add_image - pass image info up to main.js
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

(function() {
    'use strict';

    self.on("click", function (node, data) {
        var rdf, nodeId, nodeSelector, subjectURI;

        switch (data) {
        case 'contextImage':
            rdf = node.getAttribute(gMetadataAttr);
            nodeId = node.getAttribute(gOverlayIdAttr);
            nodeSelector = node.getAttribute(gOverlayElementSelectorAttr);
            subjectURI = node.getAttribute(gOverlaySubjectAttr);
            break;

        case 'mainImage':
            node = null;
            rdf = document.body.getAttribute(gMainImageMetadataAttr);
            nodeId = document.body.getAttribute(gMainImageIdAttr);
            nodeSelector = document.body.getAttribute(gMainImageSelectorAttr);
            subjectURI = document.body.getAttribute(gMainImageSubjectAttr);
            break;

        default:
            throw new Error('invalid image target type: ' + data);
        }

        if (nodeId) {
            // This is an indirect copy via an overlay or the main image
            // function, so find the real node
            node = document.querySelector('img[' + gElementIdAttr + '="' + nodeId + '"]');

            if (!node) {
                // Try finding the corresponding image node in the DOM, if the
                // original one is gone by now
                if (nodeSelector) {
                    node = document.querySelector(nodeSelector);
                }
            }
        }

        if (!node) {
            return { error: 'Could not find the element for the requested image' };
        }

        if (node.hasAttribute(gSubjectAttr)) {
            // Go back to the source, if we can
            subjectURI = node.getAttribute(gSubjectAttr);
        }

        self.postMessage({
            rdf: rdf,
            subject: subjectURI,
            imageSrc: node.src
        });
    });
}());

