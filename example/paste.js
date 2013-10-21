// Example of pasting an image into a web page.

// This code is released as public domain by Commons Machinery
// http://commonsmachinery.se.

// Author: Peter Liljenberg, peter@commonsmachinery.se

DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/');
DCTERMS = $rdf.Namespace('http://purl.org/dc/terms/');
CC = $rdf.Namespace('http://creativecommons.org/ns#');
XHTML = $rdf.Namespace('http://www.w3.org/1999/xhtml/vocab#');
OG = $rdf.Namespace('http://ogp.me/ns#');

$(document).ready(function() {
   $("div").on("x-onpaste-image", function(event) {
       var detail = event.originalEvent.detail;

       // create <div><img><pre> tree to hold the info
  
       var div = document.createElement('div');

       var img = document.createElement('img');
       img.src = detail.image;
       img.id = 'pasted_' + detail.image.length + '_' + (new Date().getTime()); // uniqueish

       div.appendChild(img);

       if (detail.rdfxml) {
	   var kb = parseRDFXML(detail.rdfxml);

	   // Find the source image
	   var source = kb.any(kb.sym(''), DC('source'));

	   if (source) {
	       var attrib = createAttribution(kb, source.uri, '#' + img.id);
	       div.appendChild(attrib);
	   }
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

    if (!title) {
	// See if there's one in OG instead
	title = kb.any(root, OG('title'));
    }

    // Use canonical URL for link, if any
    var url = kb.any(root, OG('url'));

    if (url) {
	url = url.uri || url.value;
    }
    else {
	// Fall back on subject URI, which is better than nothing
	url = srcURI;
    }
	
    var attributionURL = kb.any(root, CC('attributionURL'));
    if (attributionURL != null) {
	attributionURL = attributionURL.uri || attributionURL.value;
    }
    
    var attributionName = kb.any(root, CC('attributionName'));

    if (!attributionName) {
	attributionName = attributionURL;
    }

    // Use the first of xhtml:license, dcterms:license and cc:license

    var license = (kb.any(root, XHTML('license')) || 
		   kb.any(root, DCTERMS('license')) || 
		   kb.any(root, CC('license')));

    if (license != null) {
	license = license.uri || license.value;
    }

    var sources = kb.each(root, DC('source'));

    // Build attribution

    if (title) {
	div.appendChild(createA(url, title,
				'http://purl.org/dc/elements/1.1/source',
				'http://purl.org/dc/elements/1.1/title'));
    }
    else {
	div.appendChild(createA(url, 'This image',
				'http://purl.org/dc/elements/1.1/source',
				null));
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
	    if (i > 0) {
		div.appendChild(createSpan(', '));
	    }

	    if (sources[i].uri) {
		div.appendChild(createA(sources[i].uri, sources[i].uri,
					'http://purl.org/dc/elements/1.1/source', null));
	    }
	    else {
		div.appendChild(createSpan(sources[i].value,
					   'http://purl.org/dc/elements/1.1/source'));
	    }
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