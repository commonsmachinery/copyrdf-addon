// find_metadata.js - locate metadata for a given DOM element
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

//
// Return the GreenTurtle subject node for this DOM element, or null
// if there are no usable metadata.
//
// The subject is located with this heuristic:
//
// 1. If the element has an id, look for "#id"
// 2. If the element has a src, look for that URI
// 3. If there is exactly one subject in the entire page, use that
//

var findImageSubject = function(element) {
    var subject, subjects;

    // Make sure we have the RDFa API on the page
    if (typeof document.data === 'undefined') {
	console.log('attaching RDFa API');
	GreenTurtle.attach(document);
    }

    if (element.id) {
	subject = document.data.getSubject('#' + element.id);
	if (subject) {
	    console.log('found subject on ID: ' + subject.id);
	    return subject;
	}
    }

    if (element.src) {
	subject = document.data.getSubject(element.src);
	if (subject) {
	    console.log('found subject on src: ' + subject.id);
	    return subject;
	}
    }

    subjects = document.data.getSubjects();
    console.log('# subjects in page: ' + subjects.length);
    console.log('subjects: ' + subjects);
    if (subjects.length === 1) {
	return document.data.getSubject(subjects[0]);
    }

    return null;
}
