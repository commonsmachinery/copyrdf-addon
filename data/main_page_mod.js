// main_page_mod.js - global page mod enriching pages with metadata when necessary
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

(function() {
    'use strict';

    var og_image = 'http://ogp.me/ns#image';

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
    // Return all RDF subject nodes on the page
    //
    
    var getAllSubjects = function() {
        var uri, subjects;

        subjects = [];
        for (uri in document.data.graph.subjects) {
            subjects.push(document.data.graph.subjects[uri]);
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
                    console.log('found subject on ID: ' + subject.id);
                }
            }

            if (!subject && element.src) {
                src = decodeURIComponent(element.src);  // Get rid of any % escapes
                subject = document.data.getSubject(src);
                if (subject) {
                    console.log('found subject on src: ' + subject.id);
                }
                else {
                    subjects = document.data.getSubjects(og_image, src);
                    
                    if (subjects.length === 1) {
                        subject = document.data.getSubject(subjects[0]);
                        main = true;
                        console.log('found subject on og:image: ' + subject.id);
                    }
                }
            }

            if (subject) {
                result.push({
                    element: element,
                    subject: subject,
                    id: uuid.v4(),
                    main: main
                });
            }
        }
        
        return result;
    };


    //
    // Find all elements with subjects.  Returns an array:
    // { element: HTMLElement, subject: subjectNode, main: true/false }.
    //

    var findSubjectElements = function() {
        // TODO: check siteRules
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
    // Store metadata for an element.  Subjects is either a single
    // subject node or an array of subjects nodes.
    //

    var storeMetadata = function(element, subjects, subjectURI, id) {
        var rdfDoc = rdfxml.fromSubject(document, subjects, true);
        element.setAttribute(gMetadataAttr, rdfxml.serializeDocument(rdfDoc));

        if (subjectURI) {
            element.setAttribute(gSubjectAttr, subjectURI);
        }

        if (id) {
            element.setAttribute(gElementIdAttr, id);
        }
    };


    //
    // Add-on message interface
    //
    
    self.port.on('preparePage', function(rules) {
        var mainElement, subjectElements, i, sel;
        
        siteRules = rules;

        // Start with some page cleanup
        fixMetaElements();
        
        // With that done, we can extract the RDFa graph
        GreenTurtle.attach(document);

        // TODO: filter out non-metadata, e.g. HTML stylesheets
        

        // Dig out all elements with metadata
        subjectElements = findSubjectElements();
        mainElement = findMainElement(subjectElements);


        // TODO: look for oEmbed links and fetch them, and add to the
        // graph for the main element

        // Store RDF/XML for all metadata in the page on the body element
        storeMetadata(document.body, getAllSubjects());

        // Store metadata for each subject on the corresponding element
        for (i = 0; i < subjectElements.length; i++) {
            sel = subjectElements[i];
            storeMetadata(sel.element, sel.subject, sel.subject.id, sel.id);
        }

        if (mainElement) {
            document.body.setAttribute(gMainImageIdAttr, mainElement.id);
        }
    });
    
} ());
