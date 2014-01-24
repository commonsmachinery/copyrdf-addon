// copy_image.js - helper method for copy image menu items
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

var getImageWithMetadata = function(element) {
    "use strict";

    var RDF_NS_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    var id, rdf, subject, rdfDoc, desc, source;

    id = element.getAttribute(gElementIdAttr);
    rdf = element.getAttribute(gMetadataAttr);
    subject = element.getAttribute(gSubjectAttr);

    if (subject) {
        rdfDoc = new DOMParser().parseFromString(rdf, 'application/xml');

        if (rdfDoc.documentElement.localName !== 'parsererror') {
	    // Hack in a <> <dc:source> <subjectURI> to let paste code
	    // know what subject to use, if there is more than one

	    // We _know_ the prefix will be rdf: and dc:, thanks to the default
	    // namespaces prefixes
	    desc = rdfDoc.createElementNS(RDF_NS_URI, 'rdf:Description');
	    desc.setAttributeNS(RDF_NS_URI, 'rdf:about', '');
	
	    source = rdfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:source');
	    source.setAttributeNS(RDF_NS_URI, 'rdf:resource', subject);
            
	    desc.appendChild(source);
	    rdfDoc.documentElement.appendChild(desc);

            // Reserialize document with BOM
	    rdf = '\uFEFF<?xml version="1.0"?>\n'
	        + new XMLSerializer().serializeToString(rdfDoc.documentElement);
        }
        else {
            console.log('invalid RDF/XML: ' + rdf);
        }
    }
    
    return { 'id': id, 'rdf': rdf, 'subject': subject };
};
