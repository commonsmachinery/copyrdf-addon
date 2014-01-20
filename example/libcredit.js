// -*- coding: utf-8 -*-
// libcredit - module for converting RDF metadata to human-readable strings
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


(function (root, undef) {

    var libcredit = {};

    // Namespace used in the code
    var DC;
    var DCTERMS;
    var CC;
    var XHTML;
    var OG;
    var RDF;

    // Keep our own reference to rdflib's $rdf in a env-independent way
    var rdflib;

    var rdflibSetup = function(r) {
        rdflib = r;

        DC = rdflib.Namespace('http://purl.org/dc/elements/1.1/');
        DCTERMS = rdflib.Namespace('http://purl.org/dc/terms/');
        CC = rdflib.Namespace('http://creativecommons.org/ns#');
        XHTML = rdflib.Namespace('http://www.w3.org/1999/xhtml/vocab#');
        OG = rdflib.Namespace('http://ogp.me/ns#');
        RDF = rdflib.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    };

    var getCreditLine = function(hasTitle, hasAttrib, hasLicense)
    {
        if (hasTitle) {
            if (hasAttrib) {
                return (hasLicense ?
                        '<title> by <attrib> (<license>).' :
                        '<title> by <attrib>.');
            }
            else {
                return (hasLicense ?
                        '<title> (<license>).' :
                        '<title>.');
            }
        }
        else {
            if (hasAttrib) {
                return (hasLicense ?
                        'Credit: <attrib> (<license>).' :
                        'Credit: <attrib>.');
            }
            else {
                return (hasLicense ?
                        'Terms of use: <license>.' :
                        null);
            }
        }
    };


    const ccLicenseURL = /^https?:\/\/creativecommons.org\/licenses\/([-a-z]+)\/([0-9.]+)\/(?:([a-z]+)\/)?(?:deed\..*)?$/;

    const ccPublicDomainURL = /^https?:\/\/creativecommons.org\/publicdomain\/([a-z]+)\/([0-9.]+)\/(?:deed\..*)?$/;

    const freeArtLicenseURL = /^https?:\/\/artlibre.org\/licence\/lal(?:\/([-a-z0-9]+))?$/;

    var getProperty = function(kb, subject, predicates, returnSeq) {
        returnSeq = returnSeq || false;
        var result = [];

        if (!Array.isArray(predicates)) {
            predicates = [predicates];
        }

        for (var p = 0; p < predicates.length; p++) {
            // stop collecting values if we don't need to return a list
            if (!returnSeq && result.length > 0)
                return result[0];

            var predicate = predicates[p];
            var objs = kb.each(subject, predicate, null);

            for (var i = 0; i < objs.length; i++) {
                if (objs[i].termType === 'literal') {
                    // TODO: check xml:lang
                    result.push(objs[i].value);
                } else if (objs[i].termType === 'symbol') {
                    result.push(objs[i].uri);
                } else if (objs[i].termType === 'bnode') {
                    result = result.concat(parseContainer(kb, objs[i]));
                }
            }
        }

        if (returnSeq)
            return result.length > 0 ? result : null;
        else
            return result[0];
    };

    var parseContainer = function(kb, subject) {
        result = [];
        if ( kb.holds(subject, RDF('type'), RDF('Seq')) ||
             kb.holds(subject, RDF('type'), RDF('Bag')) ||
             kb.holds(subject, RDF('type'), RDF('Alt')) ) {
            predicates = kb.each(subject);
            contents = {};
            for (var p = 0; p < predicates.length; p++) {
                if ( predicates[p].value.indexOf("http://www.w3.org/1999/02/22-rdf-syntax-ns#_") == 0) {
                    contents[predicates[p].value] = kb.any(subject, predicates[p]).value;
                }
            }

            keys = [];
            for (var key in contents)
                keys.push(key);
            keys.sort();

            if (kb.holds(subject, RDF('type'), RDF('Alt'))) {
                result.push(contents[keys[0]]);
            } else {
                result = [];
                for (var k = 0; k < keys.length; k++) {
                    result.push(contents[keys[k]]);
                }
            }
        }
        return result;
    }

    const urlRE = /^https?:/;

    // Return uri if it can be used as a URL
    var getURL = function(uri) {
        return urlRE.test(uri) ? uri : null;
    }


    //
    // Public API
    //

    /* parseRDFXML(doc, [baseURI])
     *
     * Parse an RDF/XML document into a rdflib.js Formula object.
     *
     * Parameters:
     *
     * - xml: a DOM Document parsed with DOMParser or similar class
     * - baseURI: the document base URI, or '' if omitted
     **/
    var parseRDFXML = function(doc, baseURI) {
        var kb, parser;
        kb = new rdflib.IndexedFormula();
        parser = new rdflib.RDFParser(kb);

        if (!baseURI) {
            baseURI = '';
        }

        parser.parse(doc, baseURI, kb.sym(baseURI));
        return kb;
    };
    libcredit.parseRDFXML = parseRDFXML;

    /* getLicenseName(url)
     *
     * Return a human-readable short name for a license.
     * If the URL is unknown, it is returned as-is.
     *
     * Parameters:
     *
     * - url: the license URL
     **/
    var getLicenseName = function(url) {
        var m, text;

        m = url.match(ccLicenseURL);
        if (m) {
            text = 'CC ';
            text += m[1].toUpperCase();
            text += ' ';
            text += m[2];
            text += m[3] ? ' (' + m[3].toUpperCase() + ')' : ' Unported';

            return text;
        }

        m = url.match(ccPublicDomainURL);
        if (m) {
            switch (m[1]) {
            case 'zero':
                return 'CC0 ' + m[2];

            case 'mark':
                return 'public domain';
            }
        }

        m = url.match(freeArtLicenseURL);
        if (m) {
            text = 'Free Art License ';
            text += (m[1] === 'licence-art-libre-12' ? '1.2' : '1.3');
            return text;
        }

        return url;
    };
    libcredit.getLicenseName = getLicenseName;

    /* credit(kb, [subjectURI])
     *
     * Return a new object that contain the credit information
     * extracted from the RDF metadata, or null if there are no
     * information.
     *
     * Parameters:
     *
     * - kb: an rdflib.js Formula instance, e.g. returned from
     *   parseRDFXML().
     *
     * - subjectURI: the URI for the subject that the credit should be
     *   constructed for.  If null or omitted, the subject is located by
     *   querying the graph for <> <dc:source> ?subject.
     */

    var credit = function(kb, subjectURI) {
        var title = {text: null, url: null, textProperty: null, urlProperty: null};
        var attrib = {text: null, url: null, textProperty: null, urlProperty: null};
        var license = {text: null, url: null, textProperty: null, urlProperty: null};

        var sources = [];
        var subject;

        // Make scope a little cleaner by putting the parsing into
        // it's own functions

        var addSources = function(subject, predicate) {
            var srcObjs, i, src, url;

            srcObjs = kb.each(subject, predicate);

            for (i = 0; i < srcObjs.length; i++) {
                src = null;

                switch (srcObjs[i].termType) {
                case 'symbol':
                case 'bnode':
                    src = credit(kb, srcObjs[i]);
                    break;

                case 'literal':
                    // Accept URLs in literals too
                    url = getURL(srcObjs[i].value);
                    if (url) {
                        src = credit(kb, url);
                    }
                    break;
                }

                if (src) {
                    sources.push(src);
                }
            }
        };

        var parse = function() {
            var mainSource;

            if (subjectURI === null || subjectURI === undefined) {
                // Locate using <> <dc:source> ?, which is how the
                // Copy RDFa firefox addon indicates the original of
                // the copied object

                mainSource = kb.any(kb.sym(''), DC('source'));

                if (mainSource && mainSource.uri) {
                    subject = mainSource;
                }
                else {
                    // No clue what the source might be, so give up
                    return false;
                }
            }
            else if (typeof subjectURI === 'string') {
                subject = kb.sym(subjectURI);
            }
            else {
                // Assume this is already a symbol in the KB
                subject = subjectURI;
            }

            //
            // Title
            //

            title.text = getProperty(kb, subject, [
                DC('title'),
                DCTERMS('title'),
                OG('title')
            ]);
            if (title.text)
                title.textProperty = DC('title');

            // An Open Graph URL is probably a very good URL to use
            title.url = getURL(getProperty(kb, subject, OG('url')));

            if (!title.url) {
                // If nothing else, try to use the subject URI
                title.url = getURL(subject.uri);
            }

            if (!title.text) {
                // Fall back on URL
                title.text = title.url;
            }

            //
            // Attribution
            //

            attrib.text = getProperty(kb, subject, CC('attributionName'));
            if (attrib.text)
                attrib.textProperty = CC('attributionName');
            attrib.url = getURL(getProperty(kb, subject, CC('attributionURL')));
            if (attrib.url)
                attrib.urlProperty = CC('attributionURL');

            if (!attrib.text) {
                // Try a creator attribute instead
                attrib.text = getProperty(kb, subject, [
                    DC('creator'),
                    DCTERMS('creator')
                ], true);
                if (attrib.text && attrib.text.length == 1) {
                    attrib.text = attrib.text[0];
                }
            }

            if (!attrib.text) {
                attrib.text = getProperty(kb, subject, kb.sym('twitter:creator'));
            }

            // Special case for flickr
            if (!attrib.text && /^https?:\/\/www.flickr.com/.test(subject.uri)) {
                attrib.text = getProperty(kb, subject, kb.sym('flickr_photos:by'));
            }

            if (attrib.text && !attrib.textProperty)
                attrib.textProperty = DC('creator');

            if (attrib.text && !attrib.url) {
                // Text creator might be a URL
                attrib.url = getURL(attrib.text);
            }

            if (!attrib.text) {
                // Fall back on URL
                attrib.text = attrib.url;
            }

            //
            // License
            //

            // does xmpRights:UsageTerms belong here as well?
            license.url = getURL(getProperty(kb, subject, [
                XHTML('license'),
                DCTERMS('license'),
                CC('license')
            ]));

            if (license.url) {
                license.text = getLicenseName(license.url);
                license.urlProperty = XHTML('license');
            }

            if (!license.text) {
                // Try to get a license text at least, even if the property isn't a URL
                license.text = getProperty(kb, subject, DC('rights'));
                if (license.text)
                    license.textProperty = DC('rights');

                if (!license.text) {
                    license.text = getProperty(kb, subject, XHTML('license'));
                    if (license.text)
                        license.textProperty = XHTML('license');
                }
            }
            //
            // Sources
            //

            addSources(subject, DC('source'));
            addSources(subject, DCTERMS('source'));

            if (title.urlProperty) title.urlProperty = title.urlProperty.uri;
            if (title.textProperty) title.textProperty = title.textProperty.uri;
            if (attrib.urlProperty) attrib.urlProperty = attrib.urlProperty.uri;
            if (attrib.textProperty) attrib.textProperty = attrib.textProperty.uri;
            if (license.urlProperty) license.urlProperty = license.urlProperty.uri;
            if (license.textProperty) license.textProperty = license.textProperty.uri;

            // Did we manage to get anything that can make it into a credit?
            return (title.text || attrib.text || license.text || sources.length > 0);
        };

        if (!parse()) {
            return null;
        }

        var that = {};

        /* credit.getTitleText():
         * credit.getTitleURL():
         * credit.getTitleTextProperty():
         * credit.getTitleURLProperty():
         * credit.getAttribText():
         * credit.getAttribURL():
         * credit.getAttribTextProperty():
         * credit.getAttribURLProperty():
         * credit.getLicenseText():
         * credit.getLicenseURL():
         * credit.getLicenseTextProperty():
         * credit.getLicenseURLProperty():
         * credit.getSubjectURI():
         *
         * Property getters returning a string or null.
         */

        /* credit.getSources():
         *
         * Property getter returning an array of credit objects:
         */

        that.getTitleText = function() { return title.text; };
        that.getTitleURL = function() { return title.url; };
        that.getTitleTextProperty = function() { return title.textProperty; };
        that.getTitleURLProperty = function() { return title.urlProperty; };

        that.getAttribText = function() { return attrib.text; };
        that.getAttribURL = function() { return attrib.url; };
        that.getAttribTextProperty = function() { return attrib.textProperty; };
        that.getAttribURLProperty = function() { return attrib.urlProperty; };

        that.getLicenseText = function() { return license.text; };
        that.getLicenseURL = function() { return license.url; };
        that.getLicenseTextProperty = function() { return license.textProperty; };
        that.getLicenseURLProperty = function() { return license.urlProperty; };

        that.getSources = function() { return sources.slice(0); };

        that.getSubjectURI = function() { return subject.uri };


        /* credit.format(formatter, [sourceDepth, [i18n]])
         *
         * Use a formatter to generate a credit based on the metadata in
         * the credit object.
         *
         * Parameters:
         *
         * - formatter: a formatter object, typically derived from
         *   creditFormatter().
         *
         * - sourceDepth: number of levels of sources to get. If omitted
         *   will default to 1, if falsy will not include any sources.
         *
         * - i18n: if provided, this must be a Jed instance for the domain
         *   "libcredit".  It will be used to translate the credit
         *   message. The caller is responsible for loading the correct
         *   language into it.
         *
         * - subjectURI: if provided, certain formatters, such as
         *   HTMLCreditFormatter will provide semantic markup describing
         *   the given URI; use getSubjectURI() to retreive the original
         *   subject URI of the credit object.
         */

        that.format = function(formatter, sourceDepth, i18n, subjectURI) {
            var re = /<[a-z]+>/g;
            var creditLine;
            var textStart, textEnd;
            var match;
            var item;
            var i;
            var srcLabel;

            if (sourceDepth === undefined)
                sourceDepth = 1;

            creditLine = getCreditLine(!!title.text, !!attrib.text, !!license.text);

            if (i18n) {
                creditLine = (i18n
                              .translate(creditLine)
                              .onDomain('libcredit')
                              .fetch());
            }

            formatter.begin(subjectURI);

            // Split credit line into text and credit items
            textStart = 0;
            while ((match = re.exec(creditLine)) != null) {
                item = match[0];
                textEnd = re.lastIndex - item.length;

                // Add any preceeding plain text
                if (textStart < textEnd) {
                    formatter.addText(creditLine.slice(textStart, textEnd));
                }
                textStart = re.lastIndex;

                switch (item) {
                case '<title>':
                    formatter.addTitle(title);
                    break;

                case '<attrib>':
                    if (Array.isArray(attrib.text)) {
                        for (var a = 0; a < attrib.text.length; a++) {
                            var token = {text: attrib.text[a], url: null, textProperty: null, urlProperty: null};
                            formatter.addAttrib(token);
                            if (a + 1 < attrib.text.length)
                                formatter.addText(", ");
                        }
                    } else {
                        formatter.addAttrib(attrib);
                    }
                    break;

                case '<license>':
                    formatter.addLicense(license);
                    break;

                default:
                    throw 'unexpected credit item: ' + item;
                }
            }

            // Add any trailing text
            if (textStart < creditLine.length) {
                formatter.addText(creditLine.slice(textStart));
            }


            //
            // Add sources
            //

            if (sources.length > 0 && sourceDepth && sourceDepth > 0) {
                if (i18n) {
                    srcLabel = (i18n
                                .translate('Source:')
                                .onDomain('libcredit')
                                .ifPlural(sources.length, 'Sources:')
                                .fetch());
                }
                else {
                    srcLabel = sources.length < 2 ? 'Source:' : 'Sources:';
                };

                formatter.beginSources(srcLabel);

                for (i = 0; i < sources.length; i++) {
                    formatter.beginSource();
                    sources[i].format(formatter, sourceDepth - 1, i18n, sources[i].getSubjectURI());
                    formatter.endSource();
                }

                formatter.endSources();
            }

            formatter.end();
        };

        return that;
    };
    libcredit.credit = credit;


    /* creditFormatter()
     *
     * Return a base credit formatter (that doesn't do anything).
     * Override methods in this as applicable to the desired format.
     *
     * Methods:
     *
     * begin() - called when the formatter begins printing credit for a source
     *     or the entire work.
     *
     * end() - called when the formatter is done printing credit for a source
     *     or the entire work.
     *
     * beginSources(label) - called before printing the list of sources.
     *
     * endSources() - called when done printing the list of sources.
     *
     * beginSource() - called before printing credit for a source and before begin.
     *
     * endSource() - called when done printing credit for a source and after end.
     *
     * addTitle(token) - format the title for source or work.
     * addAttrib(token) - format the attribution for source or work.
     * addLicense(token) - format the work's license.
     *     token is a convenience object used to pass title, attribution or license
     *     information to the formatter.
     *     It always contains the following members:
     *     text - textual representation of title, attribution or license.
     *     url - points to the work, author or license and can be null.
     *     textProperty - URI of the text property (for semantics-aware formatters).
     *     urlproperty - URI or the url property (for semantics-aware formatters).
     *
     * addText(text) - add any text (e.g. punctuation) in the current context.
     */
    var creditFormatter = function() {
        var that = {};

        that.begin = function() {};
        that.end = function() {};
        that.beginSources = function(label) {};
        that.endSources = function() {};
        that.beginSource = function() {};
        that.endSource = function() {};
        that.addTitle = function(token) {};
        that.addAttrib = function(token) {};
        that.addLicense = function(token) {};
        that.addText = function(text) {};

        return that;
    };
    libcredit.creditFormatter = creditFormatter;

    /** textCreditFormatter()
     *
     * Return a formatter that generates a plain text credit.
     *
     * Object method:
     *
     * getText(): return the generated text.
     */
    var textCreditFormatter = function() {
        var that = creditFormatter();

        var creditText = '';
        var sourceDepth = 0;

        that.begin = function() {
            var i;
            if (sourceDepth > 0) {
                creditText += '\n';

                for (i = 0; i < sourceDepth; i++) {
                    creditText += '    ';
                }

                creditText += '* ';
            }
        };

        that.beginSources = function(label) {
            if (creditText) creditText += ' ';
            creditText += label;

            sourceDepth++;
        };

        that.endSources = function() {
            sourceDepth--;
        };

        that.addTitle = function(token) {
            creditText += token.text;
        };

        that.addAttrib = function(token) {
            creditText += token.text;
        };

        that.addLicense = function(token) {
            creditText += token.text;
        };

        that.addText = function(text) {
            creditText += text;
        };

        that.getText = function() {
            return creditText;
        };

        return that;
    };
    libcredit.textCreditFormatter = textCreditFormatter;


    /** htmlCreditFormatter(document)
     *
     * Return a formatter that generates an HTML credit.
     *
     * Parameters:
     *
     * - document: the target HTML document, will be used to create
     *   the HTML elements for the credit.
     *
     * Object method:
     *
     * getRoot(): return the root element of the generated credit.
     */
    var htmlCreditFormatter = function(document, elementOverrides, classes) {
        var that = creditFormatter();
        var root, current;
        var nodeStack = [];
        var subjectStack = [];
        var currentSubject = null;


        elementOverrides = elementOverrides || {};
        classes = classes || {};

        var elements = {};
        elements.root = elementOverrides.root || "div";
        elements.credit = elementOverrides.credit || "p";
        elements.source_list = elementOverrides.source_list || "ul";
        elements.source_item = elementOverrides.source_item || "li";
        elements.token_url = "a";
        elements.token_text = "span";

        root = current = document.createElement(elements.root);
        if (classes.root) {
            root.setAttribute('class', classes.root);
        }

        var startElement = function(type, class_key) {
            var node = document.createElement(elements[type]);

            class_key = class_key || type;
            if (class_key && classes[class_key]) {
                node.setAttribute('class', classes[class_key]);
            }

            nodeStack.push(current);
            current.appendChild(node);
            current = node;
            return node;
        };

        var endElement = function() {
            current = nodeStack.pop();
        };

        var addText = function(text) {
            var node = document.createTextNode(text);
            current.appendChild(node);
        };

        that.begin = function(subjectURI) {
            startElement('credit');

            currentSubject = subjectURI;
            subjectStack.push(currentSubject);

            if (subjectStack[0] && currentSubject) {
                current.setAttribute('about', subjectURI);
            }
        };

        that.end = function() {
            endElement();
            currentSubject = subjectStack.pop();
        };

        that.beginSources = function(label) {
            if (label) {
                addText(' ' + label);
            }

            startElement('source_list');
            if (subjectStack[0] && currentSubject) {
                current.setAttribute('about', currentSubject);
                current.setAttribute('rel', DC('source').value);
            }
        };

        that.endSources = function() {
            endElement();
        };

        that.beginSource = function() {
            startElement('source_item');
        };

        that.endSource = function() {
            endElement();
        };

        that.addTitle = function(token) {
            addImpl(token, 'title');
        }

        that.addAttrib = function(token) {
            addImpl(token, 'attrib');
        }

        that.addLicense = function(token) {
            addImpl(token, 'license');
        }

        var addImpl = function(token, class_key) {
            if (token.url) {
                startElement('token_url', class_key);
                current.setAttribute('href', token.url);
                if (subjectStack[0] && currentSubject) {
                    if (token.urlProperty) {
                        current.setAttribute('rel', token.urlProperty);
                    }
                    if (token.textProperty) {
                        current.setAttribute('property', token.textProperty);
                    }
                }
                addText(token.text);
                endElement();
            }
            else {
                startElement('token_text', class_key);
                addText(token.text)
                if (subjectStack[0] && currentSubject && token.textProperty) {
                        current.setAttribute('property', token.textProperty);
                }
                endElement();
            }
        };

        that.addText = addText;

        that.getRoot = function() {
            return root;
        };

        return that;
    };
    libcredit.htmlCreditFormatter = htmlCreditFormatter;



    // Handle node, amd, and global systems
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = libcredit;
        }
        exports.libcredit = libcredit;
        rdflibSetup(require('rdflib'));
    }
    else {
        if (typeof define === 'function' && define.amd) {
            define('libcredit', ['rdflib'], function(rdflib) {
                rdflibSetup(rdflib);
                return libcredit;
            });
        }
        else {
            // Assume that rdflib has been loaded for us
            rdflibSetup($rdf);
        }

        // Leak a global regardless of module system
        root['libcredit'] = libcredit;
    }

})(this);
