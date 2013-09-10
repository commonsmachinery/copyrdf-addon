// copymeta.js - library for putting stuff on the clipboard
//
// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.


var { Cc, Ci, components } = require('chrome');

const gRDFMimeType = "application/rdf+xml";
const gNativeImageMime = "application/x-moz-nativeimage";

const gClipboard = Cc["@mozilla.org/widget/clipboard;1"]
    .getService(Ci.nsIClipboard);

const gIO = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

const gImgTools = Cc["@mozilla.org/image/tools;1"]
    .getService(Ci.imgITools);


//
// Public methods
//
    
function copyImage(window, img) {

    // TODO: get RDF
    var rdf = ('<?xml version="1.0" encoding="utf-8"?>\n'
	       + '<rdf:RDF\n'
	       + '  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n'
	       + '>\n'
	       + '</rdf:RDF>\n');

    
    // It is actually possible to dig out the image from the DOM element!
    var imgRequest = img.getRequest(Ci.nsIImageLoadingContent.CURRENT_REQUEST);
    if (!imgRequest) {
	console.log("can't get imgRequest");
	return false;
    }

    var container = imgRequest.image;
    if (!container) {
	console.log("can't get imgContainer");
	return false;
    }

    // We must then wrap the container in a nsISupports object to put
    // it on the clipboard
    var imgPtr = SupportsInterfacePointer(container);

    var trans = Transferable(window);

    trans.addDataFlavor(gNativeImageMime);
    trans.setTransferData(gNativeImageMime, imgPtr,
			  Ci.nsITransferable.kFlavorHasDataProvider);

    trans.addDataFlavor(gRDFMimeType);
    trans.setTransferData(gRDFMimeType, SupportsString(rdf), rdf.length * 2);

    gClipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);

    return true;
};

exports.copyImage = copyImage;


// Create a constructor for the built-in supports interface pointer

function nsSupportsInterfacePointer() {
    return Cc["@mozilla.org/supports-interface-pointer;1"].createInstance(Ci.nsISupportsInterfacePointer);
}

function SupportsInterfacePointer(obj) {
    var res = nsSupportsInterfacePointer();

    res.data = obj;
    // res.dataIID ???
    return res;
}

//
// Boiler plate code from https://developer.mozilla.org/en/docs/Using_the_Clipboard
//

// Create a constructor for the built-in supports-string class.
function nsSupportsString() {
    return Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
}

function SupportsString(str) {
    // Create an instance of the supports-string class
    var res = nsSupportsString();

    // Store the JavaScript string that we want to wrap in the new nsISupportsString object
    res.data = str;
    return res;
}

// Create a constructor for the built-in transferable class
function nsTransferable() {
    return Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
}

// Create a wrapper to construct a nsITransferable instance and set its source to the given window, when necessary
function Transferable(source) {
    var res = nsTransferable();
    if ('init' in res) {
        // When passed a Window object, find a suitable privacy context for it.
        if (source instanceof Ci.nsIDOMWindow)
	    // Note: in Gecko versions >16, you can import the PrivateBrowsingUtils.jsm module
	    // and use PrivateBrowsingUtils.privacyContextFromWindow(sourceWindow) instead
	    source = source.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIWebNavigation);

        res.init(source);
    }
    return res;
}


