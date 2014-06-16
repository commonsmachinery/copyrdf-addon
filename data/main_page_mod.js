// main_page_mod.js - global page mod enriching pages with metadata when necessary
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global uuid */

(function() {
    'use strict';

    var siteRules = null;

    // At least the new flickr beta page has malformed meta tags with
    // name="foo:bar" instead of property="foo:bar, so no RDFa is
    // found.  Fix that by copying the name attribute to a property
    // attribute

    var fixMetaElements = function() {
        var i, elements, el;

        elements = document.querySelectorAll('meta[name]');
        for (i = 0; i < elements.length; i++) {
            el = elements.item(i);
            if (!el.hasAttribute('property')) {
                el.setAttribute('property', el.getAttribute('name'));
            }
        }
    };

    //
    // Store metadata for an element.
    //

    var storeMetadata = function(element, overlays, main, mainElementSelector, metadata, subject) {
        var jsondata = JSON.stringify(metadata);
        var id = uuid.v4();

        element.setAttribute(gMetadataAttr, jsondata);
        element.setAttribute(gSubjectAttr, subject);
        element.setAttribute(gElementIdAttr, id);

        if (overlays) {
            for (var i = 0; i < overlays.length; i++) {
                var overlay = overlays[i];

                overlay.setAttribute(gMetadataAttr, jsondata);
                overlay.setAttribute(gOverlaySubjectAttr, subject);
                overlay.setAttribute(gOverlayIdAttr, id);
                overlay.setAttribute(gOverlayElementSelectorAttr, mainElementSelector);
            }
        }

        if (main) {
            document.body.setAttribute(gMainImageMetadataAttr, jsondata);
            document.body.setAttribute(gMainImageIdAttr, id);
            document.body.setAttribute(gMainImageSubjectAttr, subject);
            document.body.setAttribute(gMainImageSelectorAttr, mainElementSelector);
            document.body.setAttribute(gMetadataRelAttr, document.documentURI);
        }
    };

    //
    // Add-on message interface
    //

    self.port.on('preparePage', function(rules) {
        siteRules = rules;

        var isFlickr = document.documentURI.match("(www\\.)?flickr\\.com/photos/");
        var isDeviantArt = document.documentURI.match("(.+)\\.deviantart\\.com/art/");
        var i, elements, element, id, src, subject, selectors, selector, overlays;

        console.debug('preparePage, siteRules:');
        console.debug(siteRules);

        function doGetMetadata() {
            fixMetaElements();

            // Remove any <div id="output" style="display: none;"> on devArt
            if (isDeviantArt) {
                var outputDiv = document.evaluate('/html/body/div[@id="output" and @style="display: none;"]',
                    document, null, XPathResult.ANY_TYPE, null).iterateNext();

                if (outputDiv) {
                    console.debug("removing old (invisible) output div");
                    outputDiv.parentNode.removeChild(outputDiv);
                }
            }

            getMetadata(document, null, rules, function(error, metadata) { // jshint ignore:line
                if (error) {
                    console.error("Failed to get metadata: " + error.message + "\n" + error.stack);
                } else {
                    console.debug("Got metadata for document:\n" + JSON.stringify(metadata.annotations, null, 2));

                    elements = document.querySelectorAll('img');

                    for (i = 0; i < elements.length; i++) {
                        element = elements[i];
                        id = element.id;
                        src = decodeURIComponent(element.src);

                        if (id && id in metadata.annotations) {
                            subject = element.id;
                        }

                        if (!subject && src && src in metadata.annotations) {
                            subject = src;
                        }

                        // store metadata, skipping main element for now
                        if (subject && subject !== metadata.mainSubject) {
                            storeMetadata(element, null, false, null, metadata.annotations[subject], subject);
                        }
                    }

                    // write main element metadata
                    if (siteRules.mainElement && metadata.mainSubject) {
                        selectors = typeof rules.mainElement === 'string' ?
                            [rules.mainElement] : rules.mainElement;

                        for (i = 0; i < selectors.length; i++) {
                            selector = selectors[i];
                            element = document.querySelector(selectors[i]);

                            if (element) {
                                console.debug('main element discovered with selector: ' + selector);

                                if (siteRules.mainOverlayElements && siteRules.mainOverlayElements[selector]) {
                                    overlays = document.querySelectorAll(siteRules.mainOverlayElements[selector]);
                                }

                                storeMetadata(element, overlays, true, selector, metadata.annotations[metadata.mainSubject], metadata.mainSubject);
                            }
                        }
                    }
                }
            });
        }

        doGetMetadata();

        // watch out for document URL change on Flickr and DA
        if (isFlickr || isDeviantArt) {
            var timeoutCallback = function() {
                if (window.document.body.hasAttribute(gMetadataRelAttr) &&
                    window.document.body.getAttribute(gMetadataRelAttr) !== window.document.documentURI) {
                    doGetMetadata();
                }
            };

            window.setInterval(timeoutCallback, 1000);
        }
    });

} ());
