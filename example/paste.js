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
           var doc = new DOMParser().parseFromString(detail.rdfxml, 'text/xml');
           var credit = libcredit.credit(libcredit.parseRDFXML(doc));

	   if (credit) {
               var formatter = libcredit.htmlCreditFormatter(document);
               credit.format(formatter, 2, null, '#' + img.id);

	       div.appendChild(formatter.getRoot());
	   }
       }

       // Cram it into the target
       detail.target.appendChild(div);

       return false;
   });
});

