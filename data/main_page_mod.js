// main_page_mod.js - global page mod enriching pages with metadata when necessary
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global uuid, GreenTurtle, rdfjson */

(function() {
    'use strict';

    var og_image = 'http://ogp.me/ns#image';

    var siteRules = null;
    var oEmbed = null;

    var oEmbedDefaultMap = {
        "title": "http://purl.org/dc/elements/1.1/title",
        "web_page": "http://ogp.me/ns#url",
        "author_name": "http://creativecommons.org/ns#attributionName",
        "author_url": "http://creativecommons.org/ns#attributionURL"
    };


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
    // Return all RDF subject nodes on the page
    //

    var getAllSubjects = function() {
        var uri, subjects;

        subjects = [];
        for (uri in document.data.graph.subjects) {
            if (document.data.graph.subjects.hasOwnProperty(uri)) {
                subjects.push(document.data.graph.subjects[uri]);
            }
        }

        return subjects;
    };


    //
    // Discover elements and subjects based on standards, rather than
    // knowledge about a specific page.
    //
    // Image element subjects are located with this heuristic:
    //
    // * If the element has an id, look for "#id"
    // * If the element has a src, look for that URI
    // * If the element src is the unique object of an og:image triplet,
    //   use the subject of the triplet.
    //

    var discoverSubjectElements = function() {
        var i, result, elements, element, subjects, subject, src, main;

        result = [];

        // For now, just look at images.  We can't do this much smarter since
        // we must decode img.src URIs to get a uniform encoding of them.
        elements = document.querySelectorAll('img');

        for (i = 0; i < elements.length; i++) {
            element = elements[i];

            subject = null;
            main = false;

            if (element.id) {
                subject = document.data.getSubject('#' + element.id);
                if (subject) {
                    console.debug('found subject on ID: ' + subject.id);
                }
            }

            if (!subject && element.src) {
                src = decodeURIComponent(element.src);  // Get rid of any % escapes
                subject = document.data.getSubject(src);
                if (subject) {
                    console.debug('found subject on src: ' + subject.id);
                }
                else {
                    subjects = document.data.getSubjects(og_image, src);

                    if (subjects.length === 1) {
                        subject = document.data.getSubject(subjects[0]);
                        main = true;
                        console.debug('found subject on og:image: ' + subject.id);
                    }
                }
            }

            if (subject) {
                result.push({
                    element: element,
                    subject: subject,
                    id: uuid.v4(),
                    main: main,
                    mainElementSelector: null,
                    overlays: null
                });
            }
        }

        return result;
    };


    //
    // Use the main element for a given site and its metadata.
    //

    var getSiteMainElement = function() {
        var i, selectors, element, subject, overlays;

        selectors = typeof siteRules.mainElement === 'string' ?
            [siteRules.mainElement] : siteRules.mainElement;

        for (i = 0; i < selectors.length; i++) {
            element = document.querySelector(selectors[i]);

            if (element) {
                console.debug('found main element using: ' + selectors[i]);
                subject = getSiteMainSubject(element);

                if (subject !== null) {
                    overlays = null;
                    if (siteRules.mainOverlayElements) {
                        overlays = findOverlayElements(siteRules.mainOverlayElements[selectors[i]]);
                    }

                    return [{
                        element: element,
                        subject: subject,
                        id: uuid.v4(),
                        main: true,
                        mainElementSelector: selectors[i],
                        overlays: overlays
                    }];
                }
                else {
                    console.warn('no subject found for main element');
                }
            }
        }

        return [];
    };

    //
    // Locate the subject for this element.  Order tested:
    //
    // * rdf:og:image: <?subjectURI> <og:image> <element.src>
    // * single-subject: If there's a single subject, use that
    // * document: use the document URL
    //
    // Can be overridden by siteRules.mainSubject.
    //

    var getSiteMainSubject = function(element) {
        var i, sources, subjects, subject;

        if (siteRules.mainSubject) {
            sources = typeof siteRules.mainSubject === 'string' ?
                [siteRules.mainSubject] : siteRules.mainSubject;
        }
        else {
            sources = [
                'rdf:og:image',
                'single-subject',
                'document'
            ];
        }

        for (i = 0; i < sources.length; i++) {
            switch (sources[i]) {
            case 'rdf:og:image':
                if (element.src) {
                    subjects = document.data.getSubjects(og_image, element.src);
                    if (subjects.length === 1) {
                        console.debug('found main subject on og:image: ' + subjects[0]);
                        return document.data.getSubject(subjects[0]);
                    }
                }
                break;

            case 'single-subject':
                subjects = document.data.getSubjects();
                if (subjects.length === 1) {
                    console.debug('found single subject: ' + subjects[0]);
                    return document.data.getSubject(subjects[0]);
                }
                break;

            case 'document':
                subject = document.data.getSubject(document.URL);
                if (subject) {
                    console.debug('found subject for document: ' + subject.id);
                    return subject;
                }
                break;

            default:
                console.error('unknown siteRules.mainSubject: ' + sources[i]);
                break;
            }
        }

        console.warn('could not find site main subject');
        return null;
    };


    //
    // Some sites put overlays over the real image, so find that one
    //

    var findOverlayElements = function(selectors) {
        var elements, nodeList, i;

        if (!selectors) {
            return null;
        }

        if (typeof selectors === 'string') {
            selectors = [selectors];
        }

        for (i = 0; i < selectors.length; i++) {
            nodeList = document.querySelectorAll(selectors[i]);
            if (nodeList.length > 0) {
                console.debug('found overlays using: ' + selectors[i]);

                elements = [];
                for (i = 0; i < nodeList.length; i++) {
                    elements.push(nodeList[i]);
                }

                return elements;
            }
        }

        return null;
    };


    //
    // Find all elements with subjects.  Returns an array:
    // { element: HTMLElement, subject: subjectNode, main: true/false }.
    //

    var findSubjectElements = function() {
        if (siteRules && siteRules.mainElement) {
            console.debug('using site rules to find main element');
            return getSiteMainElement();
        }

        console.debug('discovering RDFa subject elements');
        return discoverSubjectElements();
    };


    //
    // Return the main HTML element from the array, if any
    //

    var findMainElement = function(elements) {
        var i;

        for (i = 0; i < elements.length; i++) {
            if (elements[i].main) {
                return elements[i];
            }
        }

        return null;
    };


    //
    // Rewrite the subject of the main element, if dictated by the site rules
    //

    var rewriteMainSubject = function(el) {
        var sources, i, arg, element, objects, oEmbedParameter;

        if (!(siteRules && siteRules.rewriteMainSubject)) {
            return;
        }

        sources = typeof siteRules.rewriteMainSubject === 'string' ?
            [siteRules.rewriteMainSubject] : siteRules.rewriteMainSubject;

        for (i = 0; i < sources.length; i++) {
            if (sources[i].indexOf('oembed:') === 0) {
                // use parameter from oembed data, typically web_page
                arg = sources[i].slice(7);
                oEmbedParameter = oEmbed[arg];
                if (oEmbedParameter) {
                    doRewrite(el, oEmbedParameter, sources[i]);
                    return;
                }
            }
            else if (sources[i].indexOf('rdf:') === 0) {
                // Find a triple with this predicate
                arg = sources[i].slice(4);
                objects = el.subject.getValues(arg);

                if (objects.length === 1 && objects[0]) {
                    doRewrite(el, objects[0], sources[i]);
                    return;
                }
            }
            else if (sources[i].indexOf('link:') === 0) {
                // Find a link with this attribute
                arg = sources[i].slice(5);
                element = document.querySelector('link[' + arg + ']');

                if (element && element.href) {
                    doRewrite(el, element.href, sources[i]);
                    return;
                }
            }
            else {
                console.warn('unknown subject rewrite source: ' + sources[i]);
            }
        }

        console.debug('found no rewrite source');
    };

    var doRewrite = function(el, newURI, source) {
        console.debug(source + ': rewriting ' + el.subject.id + ' to ' + newURI);

        el.subject.id = newURI;

        // Also add the new name to the graph, so serialisation can work
        document.data.graph.subjects[newURI] = el.subject;
    };

    //
    // Store metadata for an element.  Subjects is either a single
    // subject node or an array of subjects nodes.
    //

    var storeMetadata = function(el) {
        var i;
        var rdf = JSON.stringify(rdfjson(document, el.subject, true));

        el.element.setAttribute(gMetadataAttr, rdf);

        if (el.subject.id) {
            el.element.setAttribute(gSubjectAttr, el.subject.id);
        }

        if (el.id) {
            el.element.setAttribute(gElementIdAttr, el.id);
        }

        if (el.overlays) {
            for (i = 0; i < el.overlays.length; i++) {
                el.overlays[i].setAttribute(gMetadataAttr, rdf);
                if (el.id) {
                    el.overlays[i].setAttribute(gOverlayIdAttr, el.id);
                }
                if (el.subject.id) {
                    el.overlays[i].setAttribute(gOverlaySubjectAttr, el.subject.id);
                }
                if (el.main && el.mainElementSelector) {
                    el.overlays[i].setAttribute(gOverlayElementSelectorAttr, el.mainElementSelector);
                }
            }
        }
    };


    //
    // Store metadata for the main image on the body element
    //

    var storeMainImageMetadata = function(el) {
        var rdf = JSON.stringify(rdfjson(document, el.subject, true));

        document.body.setAttribute(gMainImageMetadataAttr, rdf);

        if (el.id) {
            document.body.setAttribute(gMainImageIdAttr, el.id);
        }

        if (el.subject.id) {
            document.body.setAttribute(gMainImageSubjectAttr, el.subject.id);
        }

        if (el.mainElementSelector) {
            document.body.setAttribute(gMainImageSelectorAttr, el.mainElementSelector);
        }

        document.body.setAttribute(gMetadataRelAttr, document.documentURI);
    };

    //
    // Add fake triple to a graph for merging into GreenTurtle data
    //

    var addFakeTriple = function(graph, subject, predicate, object) {
        if (!graph.hasOwnProperty(subject)) {
            graph[subject] = {
                "subject": subject,
                "id": subject,
                "predicates": {},
                "origins":[],
                "types":[]
            };
        }

        if (!graph[subject].predicates.hasOwnProperty(predicate)) {
            graph[subject].predicates[predicate] = {
                "id": predicate,
                "predicate": predicate,
                "objects": [],
            };
        }

        // do nothing if the triple is already present
        var preds = graph[subject].predicates;
        for (var o in preds[predicate]) {
            if (preds.hasOwnProperty(o)) {
                if (o.value === object) {
                    return;
                }
            }
        }

        graph[subject].predicates[predicate].objects.push({
            "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral",
            "value": object
        });
    };

    //
    // Collect metadata and save it in the image and body attributes.
    // Should be called after document.data is filled with oEmbed or RDFa data.
    //

    var prepareMetadata = function() {
        var mainElement, subjectElements, i;

        subjectElements = findSubjectElements();
        mainElement = findMainElement(subjectElements);

        if (mainElement) {
            rewriteMainSubject(mainElement);
        }

        // Store RDF/XML for all metadata in the page on the body element
        storeMetadata({ element: document.body, subject: getAllSubjects() });

        // Store metadata for each subject on the corresponding element
        for (i = 0; i < subjectElements.length; i++) {
            storeMetadata(subjectElements[i]);
        }

        if (mainElement) {
            storeMainImageMetadata(mainElement);
        }
    };

    //
    // Add-on message interface
    //

    self.port.on('preparePage', function(rules) {
        siteRules = rules;

        var isFlickr = document.documentURI.match("(www\\.)?flickr\\.com/photos/");
        var isDeviantArt = document.documentURI.match("(.+)\\.deviantart\\.com/art/");

        console.debug('preparePage, siteRules:');
        console.debug(siteRules);

        function prepareRDFa() {
            //document.data._data_.graph.clear();
            fixMetaElements();
            GreenTurtle.attach(document);

            prepareMetadata();
        }

        function prepareOEmbed() {
            var req = new XMLHttpRequest();

            var params = "?url=" + encodeURIComponent(document.documentURI) + "&format=json";
            var url = siteRules.oembed.endpoint + params;

            req.open("GET", url, true);

            console.debug("fetching oEmbed from " + url);

            req.onload = function() {
                console.debug("oEmbed:\n" + req.response);

                oEmbed = {};
                oEmbed = JSON.parse(req.response);

                var oEmbedGraph = {};
                var oEmbedSubject = document.documentURI; // gets rewritten later

                if (isDeviantArt) {
                    // yet another deviantArt hack - make sure we have valid web_page
                    // in the oEmbed dict because <link rel="canonical"> or the document URL won't work here
                    oEmbed.web_page = oEmbed.author_url + window.location.pathname;

                    // also get the license out of HTML
                    /* // TODO, the current selector fails to find relevant links, if there's more than 2
                       var urlParts = window.location.pathname.split("-");
                       var fakeDevID = urlParts[urlParts.length - 1];

                       var licenseLinks = document.querySelectorAll('a[rel="license"]');
                       for (var i = 0; i < licenseLinks.length; ++i) {
                       var item = licenseLinks[i];
                       if (item.offsetWidth > 0 && item.offsetHeight > 0) {
                       oEmbed["license_url"] = item.getAttribute("href");
                       break;
                       }
                       }
                    */
                }

                for (var key in oEmbed) {
                    if (oEmbed.hasOwnProperty(key)) {
                        var propertyName = null;

                        if (oEmbedDefaultMap[key]) {
                            propertyName = oEmbedDefaultMap[key];
                        }

                        if (siteRules.oembed.map[key]) {
                            propertyName = siteRules.oembed.map[key];
                        }

                        if (propertyName) {
                            addFakeTriple(oEmbedGraph, oEmbedSubject, propertyName, oEmbed[key]);
                        }
                    }
                }

                document.data.graph.clear();
                document.data.merge(oEmbedGraph);
                prepareMetadata();
            };

            req.onerror = function() {
                console.debug("error getting oEmbed");
            };

            req.send();
        }

        if (siteRules && siteRules.source === "oembed") {
            // look for oEmbed links and fetch them, and add to the graph for the main element
            prepareOEmbed();
        } else {
            // or let's hope RDFa works
            prepareRDFa();
        }

        // watch out for document URL change on Flickr and DA
        // (hackish way to figure out that oEmbed metadata needs a refresh too)
        if (isFlickr) {
            var timeoutCallback = function() {
                if (window.document.body.hasAttribute(gMetadataRelAttr) &&
                    window.document.body.getAttribute(gMetadataRelAttr) !== window.document.documentURI) {

                    if (isDeviantArt) {
                        // delete any image previously spiced with metadata
                        var daDump = document.querySelectorAll('img[' + gSubjectAttr + '="' + window.document.body.getAttribute(gMetadataRelAttr) + '"]');

                        for (var i = 0; i < daDump.length; ++i) {
                            var item = daDump[i];
                            item.parentNode.removeChild(item);
                        }
                    }

                    prepareOEmbed();
                }
            };

            window.setInterval(timeoutCallback, 1000);
        }
    });

} ());
