// rdfxml.js - convert RDFa in the document to RDF/XML
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

//
// TODO: move this into a separate project with docs and unit tests
//


if (typeof rdfxml == "undefined") {

var rdfxml = (function() {

    var api = {};

    //
    // Public API
    //
    
    // Extract all RDF/XML for a given subject from the document, or null
    // if there is no information about the subject.
    // If deep is true, then all referenced subjects will also be included
    
    api.fromSubject = function(doc, subjectURI, deep) {

	var subject = doc.data.getSubject(subjectURI);

	if (subject == null)
	    return null;

	var rdf = new RDFDoc(doc);
	rdf.addSubject(subject);

	// Add in all subject refs if a deep extraction is requested, and all blank nodes.
	// Recurse until done.
	
	while (rdf.blankRefs.length > 0
	       || (deep && rdf.resourceRefs.length > 0)) {

	    if (rdf.blankRefs.length > 0) {
		var refURI = rdf.blankRefs.pop();
		var refSubject = doc.data.getSubject(refURI);
		
		if (refSubject != null)
		    rdf.addSubject(refSubject);
	    }

	    if (deep && rdf.resourceRefs.length > 0) {
		var refURI = rdf.resourceRefs.pop();
		var refSubject = doc.data.getSubject(refURI);
		
		if (refSubject != null)
		    rdf.addSubject(refSubject);
	    }
	}

	return rdf.toString();
    };


    //
    // Private methods
    //

    const RDF_NS_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

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

    RDFDoc.prototype.toString = function() {
	// Since we don't know what encoding this will end up as, add
	// a byte-order mark at the start instead of using the
	// encoding attribute

	return '\uFEFF<?xml version="1.0"?>\n'
	    + new XMLSerializer().serializeToString(this.doc);
    };

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
	
	return {
	    namespace: ns,
	    prefix: prefix,
	    qname: prefix + ':' + uri.slice(i + 1)
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


    const nameCharRange = '-A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u10000-\uEFFFF\.0-9\u00B7\u0300-\u036F\u203F-\u2040';
    const nameStartCharRange = '\u0041-\u005A\u0061-\u007A\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u0131\u0134-\u013E\u0141-\u0148\u014A-\u017E\u0180-\u01C3\u01CD-\u01F0\u01F4-\u01F5\u01FA-\u0217\u0250-\u02A8\u02BB-\u02C1\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03D6\u03DA\u03DC\u03DE\u03E0\u03E2-\u03F3\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E-\u0481\u0490-\u04C4\u04C7-\u04C8\u04CB-\u04CC\u04D0-\u04EB\u04EE-\u04F5\u04F8-\u04F9\u0531-\u0556\u0559\u0561-\u0586\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0641-\u064A\u0671-\u06B7\u06BA-\u06BE\u06C0-\u06CE\u06D0-\u06D3\u06D5\u06E5-\u06E6\u0905-\u0939\u093D\u0958-\u0961\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8B\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD\u0AE0\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32-\u0B33\u0B36-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB5\u0BB7-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CDE\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39\u0D60-\u0D61\u0E01-\u0E2E\u0E30\u0E32-\u0E33\u0E40-\u0E45\u0E81-\u0E82\u0E84\u0E87-\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA-\u0EAB\u0EAD-\u0EAE\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0F40-\u0F47\u0F49-\u0F69\u10A0-\u10C5\u10D0-\u10F6\u1100\u1102-\u1103\u1105-\u1107\u1109\u110B-\u110C\u110E-\u1112\u113C\u113E\u1140\u114C\u114E\u1150\u1154-\u1155\u1159\u115F-\u1161\u1163\u1165\u1167\u1169\u116D-\u116E\u1172-\u1173\u1175\u119E\u11A8\u11AB\u11AE-\u11AF\u11B7-\u11B8\u11BA\u11BC-\u11C2\u11EB\u11F0\u11F9\u1E00-\u1E9B\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A-\u212B\u212E\u2180-\u2182\u3041-\u3094\u30A1-\u30FA\u3105-\u312C\uAC00-\uD7A3\u4E00-\u9FA5\u3007\u3021-\u3029_';
    const uriLocalNameRE = new RegExp(
	'[^' + nameCharRange + '][' +
	    nameStartCharRange + '][' + nameCharRange + ']*$');


    return api;

})();

}

    
