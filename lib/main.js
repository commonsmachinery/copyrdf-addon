// main.js - entry point to addon
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


var contextMenu = require('sdk/context-menu');
var tabs = require('sdk/tabs');
var winUtils = require('window/utils');
var data = require("sdk/self").data;
const { Class } = require("sdk/core/heritage");

var copymeta = require('./copymeta.js');

var copyMetadata = contextMenu.Item({
    label: 'Copy metadata',
    data: 'shallow',
    
    context: contextMenu.SelectorContext('img[src]'),

    contentScriptFile: [data.url('uuid.js'),
			data.url('RDFa.1.2.0.js'),
			data.url('rdfxml.js'),
			data.url('menu_item_metadata_context.js'),
			data.url('menu_item_copy_rdfxml.js')],

    onMessage: function(msg) {
	var window = winUtils.getFocusedWindow();
	
	if (window == null) {
	    console.log("can't find focused window");
	    return false;
	}

	copymeta.copyRDFXML(window, msg.rdf);
    }
});


var copyLinkedMetadata = contextMenu.Item({
    label: 'Copy linked metadata',
    data: 'deep',
    
    context: contextMenu.SelectorContext('img[src]'),

    contentScriptFile: [data.url('uuid.js'),
			data.url('RDFa.1.2.0.js'),
			data.url('rdfxml.js'),
			data.url('menu_item_metadata_context.js'),
			data.url('menu_item_copy_rdfxml.js')],

    onMessage: function(msg) {
	var window = winUtils.getFocusedWindow();
	
	if (window == null) {
	    console.log("can't find focused window");
	    return false;
	}

	copymeta.copyRDFXML(window, msg.rdf);
    }
});


var copyImage = contextMenu.Item({
    label: 'Copy image with metadata',
    data: 'id-2c6ec901-d90a-4571-a02c-37fda119f4ee', // the attribute for the magic ID

    context: contextMenu.SelectorContext('img[src]'),

    contentScriptFile: [data.url('uuid.js'),
			data.url('RDFa.1.2.0.js'),
			data.url('rdfxml.js'),
			data.url('menu_item_metadata_context.js'),
			data.url('menu_item_copy_image.js')],

    onMessage: function(msg) {
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


var pasteImageContext = [
    contextMenu.SelectorContext('.x-enable-paste-image')];

// Contexts for identifying when there's an image on the clipboard
// This is normally not exported from the SDK, so I've patched my copy
// of it.  If built without that patch, just always show the Paste
// image menu item.  cfx needs --force-use-bundled-sdk to use the patch.

if (typeof contextMenu.Context === "undefined")
{
    console.log("SDK doesn't allow us to create a context class for clipboard content");
}
else
{
    var ImageClipboardContext = Class({
	extends: contextMenu.Context,
	
	isCurrent: function isCurrent(popupNode) {
	    return copymeta.hasClipboardImage();
	},
    });

    pasteImageContext.push(ImageClipboardContext());
}

var pasteImage = contextMenu.Item({
    label: 'Paste image',
    data: 'id-2c6ec901-d90a-4571-a02c-37fda119f4ee', // the attribute for the magic ID

    context: pasteImageContext,

    contentScriptFile: [data.url('uuid.js'),
			data.url('menu_item_paste_image.js')],

    onMessage: function(msg) {
	var window = winUtils.getFocusedWindow();
	var tab = tabs.activeTab;
	
	if (window == null) {
	    console.log("can't find focused window");
	    return false;
	}

	var pasteData = copymeta.getClipboardImage(window);

	if (pasteData) {
	    // Now we've got the data, we have to pass it back to a
	    // content script so it can send the custom event to the page

	    // Add in our support stuff
	    pasteData.idAttr = this.data;
	    pasteData.id = msg.id;

	    var worker = tab.attach({
		contentScriptFile: data.url('page_mod_paste_image.js')
	    });

	    worker.port.emit('paste-image', pasteData);

	    // Clean up the content script
	    worker.destroy();
	}
    }
});


