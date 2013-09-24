// Example of pasting an image into a web page.

// This code is released as public domain by Commons Machinery
// http://commonsmachinery.se.

// Author: Peter Liljenberg, peter@commonsmachinery.se

DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/');
DCTERMS = $rdf.Namespace('http://purl.org/dc/terms/');
CC = $rdf.Namespace('http://creativecommons.org/ns#');
XHTML = $rdf.Namespace('http://www.w3.org/1999/xhtml/vocab#');

$(document).ready(function() {
   $("div").on("x-onpaste-image", function(event) {
       var detail = event.originalEvent.detail;

       // create <div><img><pre> tree to hold the info
  
       var div = document.createElement('div');

       var img = document.createElement('img');
       img.src = detail.image;
       img.id = 'pasted' + detail.image.length;  // hackish ID...

       div.appendChild(img);

       if (detail.rdfxml) {
	   var kb = parseRDFXML(detail.rdfxml);

	   var attrib = createAttribution(kb, '', '#' + img.id);
	   div.appendChild(attrib);
       }

       // Cram it into the target
       detail.target.appendChild(div);

       return false;
   });
});

// Parse the RDF/XML using https://github.com/linkeddata/rdflib.js

function parseRDFXML(str) {
    var dom = new DOMParser().parseFromString(str, 'application/xml');

    var kb = new $rdf.IndexedFormula();
    var parser = new $rdf.RDFParser(kb);

    parser.parse(dom, '', null);

    return kb;
}

// Get CC-related properties about the work
function createAttribution(kb, srcURI, targetURI) {
    var div = document.createElement('div');
    div.setAttribute('about', targetURI);

    // Collect the attribution properties about this work

    var root = kb.sym(srcURI);

    // Could go look for different titles in an rdf:Alt node and
    // choose one based on language, and also look for dcterms:title.
    var title = kb.any(root, DC('title'));

    var attributionURL = kb.any(root, CC('attributionURL'));
    if (attributionURL != null)
	attributionURL = attributionURL.uri;
    
    var attributionName = kb.any(root, CC('attributionName'));

    if (!attributionName)
	attributionName = attributionURL;

    // Use the first of xhtml:license, dcterms:license and cc:license

    var license = kb.any(root, XHTML('license'));
    if (license == null)
	license = kb.any(root, DCTERMS('license'));
    if (license == null)
	license = kb.any(root, CC('license'));

    if (license != null)
	license = license.uri;

    var sources = kb.each(root, DC('source'));

    for (var i in sources) {
	sources[i] = sources[i].uri;
    }

    // Build attribution

    if (title) {
	div.appendChild(createSpan('"'));
	div.appendChild(createSpan(title, 'http://purl.org/dc/elements/1.1/title'));
	div.appendChild(createSpan('" '));
    }
    else {
	div.appendChild(createSpan('This image'));
    }

    if (attributionName) {
	div.appendChild(createSpan(' by '));
	if (attributionURL) {
	    div.appendChild(createA(attributionURL, attributionName,
				    'http://creativecommons.org/ns#attributionURL',
				    'http://creativecommons.org/ns#attributionName'));
	}
	else {
	    div.appendChild(createSpan(attributionName,
				       'http://creativecommons.org/ns#attributionName'));
	}
    }
    else {
	div.appendChild(createSpan(' has no attribution and'));
    }

    if (license) {
	div.appendChild(createSpan(' is licensed with '));
	div.appendChild(createA(license, license, 'license', null));
    }
    else {
	div.appendChild(createSpan(' has no license information.'));
    }

    if (sources.length > 0) {
	div.appendChild(createSpan(' Sources: '));
	for (var i in sources) {
	    div.appendChild(createA(sources[i], sources[i], 'http://purl.org/dc/elements/1.1/source', null));
	    div.appendChild(createSpan(' '));
	}
    }

    return div;
}


function createSpan(content, property) {
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(content));
    if (property)
	span.setAttribute('property', property);

    return span;
}

function createA(href, content, rel, property) {
    var a = document.createElement('a');

    a.href = href;
    a.appendChild(document.createTextNode(content));
    
    if (rel)
	a.setAttribute('rel', rel);

    if (property)
	a.setAttribute('property', property);

    return a;
}    