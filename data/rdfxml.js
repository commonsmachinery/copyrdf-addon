// rdfxml.js - convert RDFa in the document to RDF/XML
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


if (typeof rdfxml === "undefined") {

var rdfxml = (function() {

    var api = {};

    //
    // Public API
    //
    
    // Returns a RDF/XML DOM document node for a given GreenTurtle
    // subject node, or a list of subjects.  If deep is true, then all
    // referenced subjects will also be included
    
    api.fromSubject = function(doc, subject, deep) {
	var i, refURI, refSubject;
	var rdf = new RDFDoc(doc);

	if (Array.isArray(subject)) {
	    for (i = 0; i < subject.length; i++) {
		rdf.addSubject(subject[i]);
	    }
	}
	else {
	    rdf.addSubject(subject);
	}

	// Add in all subject refs if a deep extraction is requested, and all blank nodes.
	// Recurse until done.
	
	while (rdf.blankRefs.length > 0
	       || (deep && rdf.resourceRefs.length > 0)) {

	    if (rdf.blankRefs.length > 0) {
		refURI = rdf.blankRefs.pop();
		refSubject = doc.data.getSubject(refURI);
		
		if (refSubject) {
		    rdf.addSubject(refSubject);
		}
	    }

	    if (deep && rdf.resourceRefs.length > 0) {
		refURI = rdf.resourceRefs.pop();
		refSubject = doc.data.getSubject(refURI);
		
		if (refSubject) {
		    rdf.addSubject(refSubject);
		}
	    }
	}

	return rdf.doc;
    };


    api.serializeDocument = function(rdfDoc) {
	// Since we don't know what encoding this will end up as, add
	// a byte-order mark at the start instead of using the
	// encoding attribute

	return '\uFEFF<?xml version="1.0"?>\n'
	    + new XMLSerializer().serializeToString(rdfDoc);
    };


    //
    // Private methods
    //

    const RDF_NS_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    api.RDF_NS_URI = RDF_NS_URI;
    
    function RDFDoc(srcDoc) {
	
	this.namespaces = {};
	this.nsCounter = 0;
	
	this.addedSubjects = {};
	this.blankRefs = [];
	this.resourceRefs = [];
	
	this.doc = srcDoc.implementation.createDocument(RDF_NS_URI, this.getRDFTagName('RDF'), null);
	this.rdf = this.doc.documentElement;
	this.newline(this.rdf);
    }

    RDFDoc.prototype.addSubject = function(subject) {
	// Only add subjects once

	if (subject.id in this.addedSubjects)
	    return;

	this.addedSubjects[subject.id] = true;

	// Create XML
	var desc = this.doc.createElementNS(
	    RDF_NS_URI, this.getRDFTagName('Description'));

	if (subject.id.substring(0, 2) == "_:") {
	    desc.setAttributeNS(RDF_NS_URI, this.getRDFTagName('nodeID'), subject.id.slice(2));
	}
	else {
	    desc.setAttributeNS(RDF_NS_URI, this.getRDFTagName('about'), subject.id);
	}

	this.newline(desc);

	for (var predicate in subject.predicates)
	{
	    var ns = this.splitURI(predicate);

	    if (ns) {
		var objects = subject.predicates[predicate].objects;

		for (var i in objects)
		{
		    this.addPredicate(desc, ns.namespace, ns.qname, objects[i]);
		}
	    }
	    else {
		console.log("weird predicate: " + predicate);
	    }
	}

	this.indent(desc, 2);

	this.indent(this.rdf, 2);
	this.rdf.appendChild(desc);
	this.newline(this.rdf);
    };

    RDFDoc.prototype.addPredicate = function(parent, namespace, qname, object) {

	var pred = this.doc.createElementNS(namespace, qname);

	if (object.type == "http://www.w3.org/1999/02/22-rdf-syntax-ns#object") {
	    // Is that URI an internal RDFa.js thing, or part of the RDFa API?

	    if (object.value.substring(0, 2) == "_:") {
		pred.setAttributeNS(RDF_NS_URI, this.getRDFTagName('nodeID'),
				    object.value.slice(2));

		this.blankRefs.push(object.value);
	    }
	    else {
		pred.setAttributeNS(RDF_NS_URI, this.getRDFTagName('resource'),
				    object.value);

		this.resourceRefs.push(object.value);
	    }
	}
	else if (object.type == "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral") {
	    // TODO (but does anyone actually use XML literals?)
	}
	else {
	    var text = this.doc.createTextNode(object.value);
	    pred.appendChild(text);

	    if (object.type != "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral") {
		pred.setAttributeNS(RDF_NS_URI, this.getRDFTagName('datatype'),
				    object.type);
	    }

	    if (object.language) {
		pred.setAttributeNS("http://www.w3.org/XML/1998/namespace", 'xml:lang',
				    object.language);
	    }
	}

	this.indent(parent, 4);
	parent.appendChild(pred);
	this.newline(parent);
    };
    

    RDFDoc.prototype.getRDFTagName = function(localName) {
	var prefix = this.getNSPrefix(RDF_NS_URI);
	return prefix + ':' + localName;
    };

    RDFDoc.prototype.getNSPrefix = function(ns_uri) {
	var prefix = this.namespaces[ns_uri];
	
	if (!prefix) {

	    // Lookup any standard prefix
	    prefix = ns_prefixes[ns_uri];

	    if (!prefix) {
		// Generate one
		prefix = 'ns' + ++this.nsCounter;
	    }

	    this.namespaces[ns_uri] = prefix;

	    // let's see if it must be added manually or not
	}

	return prefix;
    };
	    
    // Split URI into namespace and qname
    RDFDoc.prototype.splitURI = function(uri) {
	var i = uri.search(uriLocalNameRE);
	
	if (i == -1)
	    return null;

	var ns = uri.slice(0, i + 1);
	var prefix = this.getNSPrefix(ns);
	var localName = uri.slice(i + 1);
	
	return {
	    namespace: ns,
	    prefix: prefix,
	    qname: prefix + ':' + localName
	};
    };

    // Do some basic pretty-printing, since XMLSerializer doesn't do that for us
    RDFDoc.prototype.indent = function(node, depth) {
	node.appendChild(
	    this.doc.createTextNode('        '.substr(0, depth)));
    };

    RDFDoc.prototype.newline = function(node) {
	node.appendChild(this.doc.createTextNode('\n'));
    };
    
	
    // Common URI namespace prefixes (inverse of the list in RDFa.js)

    var ns_prefixes = {};

    // w3c
    ns_prefixes["http://www.w3.org/1999/xhtml/vocab#"] = "xhtml";
    ns_prefixes["http://www.w3.org/2003/g/data-view#"] = "grddl";
    ns_prefixes["http://www.w3.org/ns/ma-ont#"] = "ma";
    ns_prefixes["http://www.w3.org/2002/07/owl#"] = "owl";
    ns_prefixes["http://www.w3.org/1999/02/22-rdf-syntax-ns#"] = "rdf";
    ns_prefixes["http://www.w3.org/ns/rdfa#"] = "rdfa";
    ns_prefixes["http://www.w3.org/2000/01/rdf-schema#"] = "rdfs";
    ns_prefixes["http://www.w3.org/2007/rif#"] = "rif";
    ns_prefixes["http://www.w3.org/2004/02/skos/core#"] = "skos";
    ns_prefixes["http://www.w3.org/2008/05/skos-xl#"] = "skosxl";
    ns_prefixes["http://www.w3.org/2007/05/powder#"] = "wdr";
    ns_prefixes["http://rdfs.org/ns/void#"] = "void";
    ns_prefixes["http://www.w3.org/2007/05/powder-s#"] = "wdrs";
    ns_prefixes["http://www.w3.org/1999/xhtml/vocab#"] = "xhv";
    ns_prefixes["http://www.w3.org/XML/1998/namespace"] = "xml";
    ns_prefixes["http://www.w3.org/2001/XMLSchema#"] = "xsd";
    // non-rec w3c
    ns_prefixes["http://www.w3.org/ns/sparql-service-description#"] = "sd";
    ns_prefixes["http://www.w3.org/ns/org#"] = "org";
    ns_prefixes["http://www.w3.org/ns/people#"] = "gldp";
    ns_prefixes["http://www.w3.org/2008/content#"] = "cnt";
    ns_prefixes["http://www.w3.org/ns/dcat#"] = "dcat";
    ns_prefixes["http://www.w3.org/ns/earl#"] = "earl";
    ns_prefixes["http://www.w3.org/2006/http#"] = "ht";
    ns_prefixes["http://www.w3.org/2009/pointers#"] = "ptr";
    // widely used
    ns_prefixes["http://creativecommons.org/ns#"] = "cc";
    ns_prefixes["http://commontag.org/ns#"] = "ctag";
    ns_prefixes["http://purl.org/dc/elements/1.1/"] = "dc";
    ns_prefixes["http://purl.org/dc/terms/"] = "dcterms";
    ns_prefixes["http://xmlns.com/foaf/0.1/"] = "foaf";
    ns_prefixes["http://purl.org/goodrelations/v1#"] = "gr";
    ns_prefixes["http://www.w3.org/2002/12/cal/icaltzd#"] = "ical";
    ns_prefixes["http://ogp.me/ns#"] = "og";
    ns_prefixes["http://purl.org/stuff/rev#"] = "rev";
    ns_prefixes["http://rdfs.org/sioc/ns#"] = "sioc";
    ns_prefixes["http://rdf.data-vocabulary.org/#"] = "v";
    ns_prefixes["http://www.w3.org/2006/vcard/ns#"] = "vcard";
    ns_prefixes["http://schema.org/"] = "schema";


    // We just want to find the last part of an URI that can be a
    // local XML element name, so for our purposes ':' is not a valid
    // character

    const nameStartCharRange = 'A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD';
    const nameCharRange = '-.0-9\u00B7\u0300-\u036F\u203F-\u2040' + nameStartCharRange;

    const uriLocalNameRE = new RegExp(
	'[^' + nameCharRange + '][' +
	    nameStartCharRange + '][' + nameCharRange + ']*$');


    return api;

})();

}

    
