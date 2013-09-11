// main.js - entry point to addon
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


var contextMenu = require('sdk/context-menu');
var winUtils = require('window/utils');
var data = require("sdk/self").data;

var copymeta = require('./copymeta.js');

var copyImageMenuItem = contextMenu.Item({
    label: 'Copy image with metadata',
    data: 'id-2c6ec901-d90a-4571-a02c-37fda119f4ee', // the attribute for the magic ID

    context: contextMenu.SelectorContext('img'),

    contentScriptFile: [data.url('uuid.js'),
			data.url('RDFa.1.2.0.js'),
			data.url('rdfxml.js'),
			data.url('menu_item_copy_image.js')],

    onMessage: function (msg) {
	var window = winUtils.getFocusedWindow();
	
	if (window == null) {
	    console.log("can't find focused window");
	    return false;
	}

	// Find the image element using the magic ID set by the content script
	var selector = 'img[' + this.data + '="' + msg.id + '"]';
	
	var doc = window.document;
	var img = doc.querySelector(selector);
	
	if (img == null) {
	    console.log("can't find image element");
	    return false;
	}
	
	// Clean up the magic ID tag
	img.removeAttribute(this.data);

	copymeta.copyImage(window, img, msg.rdf);
    }
});
