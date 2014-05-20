// copy_image.js - helper method for copy image menu items
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global uuid */
/* exported getImageWithMetadata */

var getImageWithMetadata = function(element, rdf,
                                    imageElementId,
                                    imageElementSelector,
                                    imageSubjectURI) {
    "use strict";

    var RDF_NS_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    var id, rdfDoc, desc, source;

    if (imageElementId) {
        // This is an indirect copy via an overlay or the main image
        // function, so find the real element
        element = document.querySelector('img[' + gElementIdAttr + '="' + imageElementId + '"]');

        if (!element) {
            // Try finding the corresponding image element in the DOM, if the
            // original one is gone by now
            if (imageElementSelector) {
                element = document.querySelector(imageElementSelector);
            }
        }
    }

    if (!element) {
        return { error: 'Could not find the image element that should be copied' };
    }
    
    if (element.hasAttribute(gSubjectAttr)) {
        // Go back to the source, if we can
        imageSubjectURI = element.getAttribute(gSubjectAttr);
    }

    if (imageSubjectURI) {
        rdfDoc = new DOMParser().parseFromString(rdf, 'application/xml');

        if (rdfDoc.documentElement.localName !== 'parsererror') {
            // Hack in a <> <dc:source> <subjectURI> to let paste code
            // know what subject to use, if there is more than one

            // We _know_ the prefix will be rdf: and dc:, thanks to the default
            // namespaces prefixes
            desc = rdfDoc.createElementNS(RDF_NS_URI, 'rdf:Description');
            desc.setAttributeNS(RDF_NS_URI, 'rdf:about', '');

            source = rdfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:source');
            source.setAttributeNS(RDF_NS_URI, 'rdf:resource', imageSubjectURI);
            
            desc.appendChild(source);
            rdfDoc.documentElement.appendChild(desc);

            // Reserialize document with BOM
            rdf = '\uFEFF<?xml version="1.0"?>\n' +
                new XMLSerializer().serializeToString(rdfDoc.documentElement);
        }
        else {
            console.warn('invalid RDF/XML: ' + rdf);
        }
    }
    
    // Make sure we have the ID on the image element.  At least flickr
    // seems to be replacing the img element on some resizes...
    id = element.getAttribute(gElementIdAttr);
    if (!id) {
        id = uuid.v4();
        element.setAttribute(gElementIdAttr, id);
    }

    return { 'id': id, 'rdf': rdf, 'subject': imageSubjectURI };
};
