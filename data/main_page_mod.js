// main_page_mod.js - global page mod enriching pages with metadata when necessary
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

var siteRules = null;

self.port.on('setSiteRules', function(rules) {
    siteRules = rules;
});

self.port.once('preparePage', function() {
    var i, elements, el;
    
    // At least the new flickr beta page has malformed meta tags with
    // name="foo:bar" instead of property="foo:bar, so no RDFa is
    // found.  Fix that by copying the name attribute to a property
    // attribute

    elements = document.querySelectorAll('meta[name]');
    for (i = 0; i < elements.length; i++) {
        el = elements.item(i);
        if (!el.hasAttribute('property')) {
            el.setAttribute('property', el.getAttribute('name'));
        }
    }

    // TODO: look for oEmbed links and fetch them

    // TODO: do all metadata lookup here, loading RDFa, finding images
    // with subjects, etc.  Store resulting metadata as RDF/XML as
    // data-* attributes on the elements.  Essentially use all of
    // find_metadata.js here, instead of in the context menu scripts.

    // The reason is that we can't share the siteRules from here with
    // the context menu scripts in the SDK sandbox.
});
