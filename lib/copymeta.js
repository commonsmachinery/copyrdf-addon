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
const gPNGMime = "image/png";
const gJPEGMime = "image/jpeg";
const gJPGMime = "image/jpg";
const gGIFMime = "image/gif";
const gBMPMime = "image/bmp";
const gTextMimeType = "text/unicode";

const gClipboard = Cc["@mozilla.org/widget/clipboard;1"]
    .getService(Ci.nsIClipboard);


//
// Public methods
//
    
function copyRDFXML(window, rdf) {

    var trans = Transferable(window);

    trans.addDataFlavor(gRDFMimeType);
    trans.setTransferData(gRDFMimeType, SupportsString(rdf), rdf.length * 2);

    trans.addDataFlavor(gTextMimeType);
    trans.setTransferData(gTextMimeType, SupportsString(rdf), rdf.length * 2);
    
    gClipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);
    gClipboard.setData(trans, null, Ci.nsIClipboard.kSelectionClipboard);

    return true;
};

exports.copyRDFXML = copyRDFXML;


function copyImage(window, img, rdf) {

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
    gClipboard.setData(trans, null, Ci.nsIClipboard.kSelectionClipboard);

    return true;
};

exports.copyImage = copyImage;


function getClipboardImage(window) {

    // We have to ask for data twice, first to get the image, then to
    // get the metadata. The clipboard code returns as soon as it
    // finds one transferable type on the clipboard, without trying to
    // populate all of them.

    var imgTrans = Transferable(window);
    imgTrans.addDataFlavor(gPNGMime);
    imgTrans.addDataFlavor(gJPEGMime);
    imgTrans.addDataFlavor(gJPGMime);
    imgTrans.addDataFlavor(gGIFMime);
    imgTrans.addDataFlavor(gBMPMime);

    gClipboard.getData(imgTrans, Ci.nsIClipboard.kGlobalClipboard);
    
    var imgData = {};
    var imgDataLen = {};

    // TODO: check all image mime types
    imgTrans.getTransferData(gPNGMime, imgData, imgDataLen);

    var imgSrc = null;
    if (typeof imgData.value !== 'undefined') {
	// It might be more efficient to use nsIScriptableBase64Encoder
	imgSrc = 'data:' + gPNGMime + ';base64,' + window.btoa(imgData.value.data);
    }
    
    // Try to get metadata too
    
    var rdfTrans = Transferable(window);
    rdfTrans.addDataFlavor(gRDFMimeType);
    gClipboard.getData(rdfTrans, Ci.nsIClipboard.kGlobalClipboard);
    
    var rdfData = {};
    var rdfDataLen = {};
	
    // TODO: how to catch the exception?
    rdfTrans.getTransferData(gRDFMimeType, rdfData, rdfDataLen);

    var rdf = null;
    if (typeof rdfData.value !== 'undefined') {
	rdf = rdfData.value.QueryInterface(Ci.nsISupportsString).data;
    }

    return {
	image: imgSrc,
	rdfxml: rdf,
    };
};

exports.getClipboardImage = getClipboardImage


// Create a constructor for the built-in supports interface pointer

function nsSupportsInterfacePointer() {
    return Cc["@mozilla.org/supports-interface-pointer;1"].createInstance(Ci.nsISupportsInterfacePointer);
}

function SupportsInterfacePointer(obj) {
    var res = nsSupportsInterfacePointer();

    res.data = obj;
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


