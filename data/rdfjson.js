// rdfjson.js - convert GreenTurtle RDFa into RDF/JSON
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

// Returns a RDF/JSON object for a given GreenTurtle subject node, or
// a list of subjects.  If deep is true, then all referenced subjects
// will also be included.

(function(globalns) {
    'use strict';

    var RDFBuilder;

    // Returns a RDF/XML DOM document node for a given GreenTurtle
    // subject node, or a list of subjects.  If deep is true, then all
    // referenced subjects will also be included

    globalns.rdfjson = function rdfjson(doc, subject, deep) {
        var i, refURI, refSubject;
        var builder = new RDFBuilder();

        if (Array.isArray(subject)) {
            for (i = 0; i < subject.length; i++) {
                builder.addSubject(subject[i]);
            }
        }
        else {
            builder.addSubject(subject);
        }

        // Add in all subject refs if a deep extraction is requested, and all blank nodes.
        // Recurse until done.

        while (builder.blankRefs.length > 0 ||
               (deep && builder.resourceRefs.length > 0)) {

            if (builder.blankRefs.length > 0) {
                refURI = builder.blankRefs.pop();
                refSubject = doc.data.getSubject(refURI);

                if (refSubject) {
                    builder.addSubject(refSubject);
                }
            }

            if (deep && builder.resourceRefs.length > 0) {
                refURI = builder.resourceRefs.pop();
                refSubject = doc.data.getSubject(refURI);

                if (refSubject) {
                    builder.addSubject(refSubject);
                }
            }
        }

        return builder.rdf;
    };

    //
    // Private methods
    //

    RDFBuilder = function RDFBuilder() {
        this.addedSubjects = {};
        this.blankRefs = [];
        this.resourceRefs = [];
        this.rdf = {};
    };


    RDFBuilder.prototype.addSubject = function(subject) {
        // Only add subjects once
        if (subject.id in this.addedSubjects) {
            return;
        }

        this.addedSubjects[subject.id] = true;

        var predicates = {};

        for (var p in subject.predicates) {
            if (subject.predicates.hasOwnProperty(p)) {
                var rawObjects = subject.predicates[p].objects;
                var objects = [];

                for (var i = 0; i < rawObjects.length; i++) {
                    objects.push(this.getObjectNode(rawObjects[i]));
                }

                predicates[p] = objects;
            }
        }

        this.rdf[subject.id] = predicates;
    };


    RDFBuilder.prototype.getObjectNode = function(object) {
        var node = {
            value: object.value,
        };

        if (object.type === "http://www.w3.org/1999/02/22-rdf-syntax-ns#object") {
            // Is that URI an internal RDFa.js thing, or part of the RDFa API?

            if (object.value.substring(0, 2) === "_:") {
                node.type = 'bnode';
                this.blankRefs.push(object.value);
            }
            else {
                node.type = 'uri';
                this.resourceRefs.push(object.value);
            }
        }
        else {
            node.type = 'literal';
            if (object.type && object.type !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral") {
                node.datatype = object.type;
            }

            if (object.language) {
                node.lang = object.language;
            }
        }

        return node;
    };
    
})(this);
