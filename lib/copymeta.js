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

const gImageTypes = [gPNGMime, gJPEGMime, gJPGMime, gGIFMime, gBMPMime];

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


function copyImage(window, img, rdf, subjectURI) {
    var rdfDoc, desc, source;
    
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


function hasClipboardImage() {
    return gClipboard.hasDataMatchingFlavors(
	gImageTypes, gImageTypes.length, Ci.nsIClipboard.kGlobalClipboard);
};

exports.hasClipboardImage = hasClipboardImage;


function getClipboardImage(window) {

    // We have to ask for data twice, first to get the image, then to
    // get the metadata. The clipboard code returns as soon as it
    // finds one transferable type on the clipboard, without trying to
    // populate all of them.

    var imgTrans = Transferable(window);

    for (var i in gImageTypes) {
	imgTrans.addDataFlavor(gImageTypes[i]);
    }

    gClipboard.getData(imgTrans, Ci.nsIClipboard.kGlobalClipboard);

    // See what type we got
    var imgSrc = null;
    var i;
    for (i = 0; i < gImageTypes.length; i++) {
	var imgDataRet = {};
	var imgDataLen = {};
	
	try {
	    imgTrans.getTransferData(gImageTypes[i], imgDataRet, imgDataLen);
	}
	catch (e) {
	    continue;
	}

	var imgData = null;
	    
	if (imgDataRet.value) {
	    // Try InputStream first
	    var stream;
	    try {
		stream = imgDataRet.value.QueryInterface(Ci.nsIInputStream);
	    } catch (e) { }
	    
	    if (stream) {
		console.log('got image as InputStream');
		
		var encoder = Cc["@mozilla.org/scriptablebase64encoder;1"]
		    .createInstance(Ci.nsIScriptableBase64Encoder);
		
		imgData = encoder.encodeToString(stream, 0);
	    }
	    else {
		// If that fails, try a CString
		var cstr;
		try {
		    cstr = imgDataRet.value.QueryInterface(Ci.nsISupportsCString);
		} catch (e) { }
		
		if (cstr) {
		    console.log('got image as CString');
		    imgData = window.btoa(cstr.data);
		}
	    }
	    
	    if (imgData) {
		imgSrc = 'data:' + gImageTypes[i] + ';base64,' + imgData;
		break;
	    }
	}
    }

    if (imgSrc == null) {
	console.log("couldn't find any image on the clipboard");
	return null;
    }
    
    // Try to get metadata too
    var rdfTrans = Transferable(window);
    rdfTrans.addDataFlavor(gRDFMimeType);
    gClipboard.getData(rdfTrans, Ci.nsIClipboard.kGlobalClipboard);
    
    var rdf = null;

    try {
	var rdfData = {};
	var rdfDataLen = {};
	
	rdfTrans.getTransferData(gRDFMimeType, rdfData, rdfDataLen);

	if (typeof rdfData.value !== 'undefined') {
	    // Clipboard code puts this into a UCS2 string (at least in X)
	    rdf = rdfData.value.QueryInterface(Ci.nsISupportsString).data;
	}
    }
    catch (e)
    {
	console.log("couldn't get application/rdf+xml from the clipboard - there might not be any");
    }

    // Now we need to do some sanity checks on the string to increase
    // the chances that it's actually RDF/XML.

    if (rdf && !isRDFXML(rdf)) {
	// Since the clipboard code has just pushed the string into
	// the UTF-16 ISupportsString, it may actually be UTF-8 packed
	// into 16-bit unichars.

	console.log('weird RDF (UTF-8 as UTF-16?): ' + escape(rdf.substring(0, 40)));
	
	// Unpack this by stashing the "UTF-16" back into a byte array and then
	// parse it as the UTF-8 it (most likely) is

	var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
	    .createInstance(Ci.nsIScriptableUnicodeConverter);

	var bytesLen = {};
    
	converter.charset = 'UTF-16';
	var bytes = converter.convertToByteArray(rdf, bytesLen);
	
	if (bytes.length > 0) {
	    if ((bytes[0] == 0xff && bytes[1] == 0xfe)
		|| (bytes[0] == 0xfe && bytes[1] == 0xff))
	    {
		// For some reason there's an UTF-16 BOM in what's UTF-8 data...
		bytes.splice(0, 2);
	    }

            // If the original string was an odd number of characters,
            // it might contain a trailing 0 byte.  Get rid of it,
            // otherwise the XML parser will likely complain.
            if (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
                bytes.pop();
            }

	    converter.charset = 'UTF-8';
	    rdf = converter.convertFromByteArray(bytes, bytes.length);

	    if (!isRDFXML(rdf)) {
		console.log('still weird RDF, passing it on anyway: '
			    + escape(rdf.substring(0, 40)));
	    }
	}
	else {
	    console.log("couldn't parse as UTF-8, using it as is");
	}
    }
    
    return {
	image: imgSrc,
	rdfxml: rdf,
    };
};

exports.getClipboardImage = getClipboardImage;


function isRDFXML(str) {
    if (str.startsWith('\uFEFF')) {
	// Drop UCS2 BOM
	str = str.substring(1, 40);
    }
    else if (str.startsWith('\u00EF\u00BB\u00BF')) {
	// UTF-8 BOM in UTF-16, drop it
	str = str.substring(3, 40);
    }

    // Some typical RDF or XMP packets... this is rather ugly.
    return str.startsWith('<?xml')
	|| str.startsWith('<?xpacket')
	|| str.startsWith('<x:xmpmeta')
	|| str.startsWith('<rdf:RDF')
};


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


