// copy_image.js - helper method for copy image menu items
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

var getImageWithMetadata = function(subject, element, attr) {
    var rdfDoc, desc, source, id;

    rdfDoc = rdfxml.fromSubject(document, subject, true);

    if (subject.id) {
	// Hack in a <> <dc:source> <subjectURI> to let paste code
	// know what subject to use, if there is more than one

	// We _know_ the prefix will be rdf: and dc:, thanks to the default
	// namespaces prefixes
	desc = rdfDoc.createElementNS(rdfxml.RDF_NS_URI, 'rdf:Description');
	desc.setAttributeNS(rdfxml.RDF_NS_URI, 'rdf:about', '');
	
	source = rdfDoc.createElementNS('http://purl.org/dc/elements/1.1/', 'dc:source');
	source.setAttributeNS(rdfxml.RDF_NS_URI, 'rdf:resource', subject.id);

	desc.appendChild(source);
	rdfDoc.documentElement.appendChild(desc);
    }
    
    // It's not possible to pass the DOM element through
    // postMessage since it's destroyed by the JSON serialisation.
    // Hack around that by tagging it with a magic ID and passing that 
    // to the main code, which can then find it in the document.
	
    id = uuid.v1();
    element.setAttribute(attr, id);

    return { 'id': id, 'rdf': rdfxml.serializeDocument(rdfDoc) };
};
