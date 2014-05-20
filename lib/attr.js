'use strict';

// Build the data attributes where we keep metadata on the addon ID
var gAddonID = 'jid1-je0gUIhMYarI1w';
var gDataAttrPrefix = 'data-' + gAddonID;

//
// Attributes stored on the element that's a subject in the graph.
//
exports.elementId = gDataAttrPrefix + '-id';
exports.subject = gDataAttrPrefix + '-subject';
exports.metadata = gDataAttrPrefix + '-metadata';

//
// Attributes stored on <body>, identifying the main image.  The
// metadata is also copied here, in case the <img> tag gets replaced.
//
exports.metadataRel = gDataAttrPrefix + '-metadata-rel';
exports.mainImageId = gDataAttrPrefix + '-main-id';
exports.mainImageSubject = gDataAttrPrefix + '-main-subject';
exports.mainImageMetadata = gDataAttrPrefix + '-main-metadata';
exports.mainImageSelector = gDataAttrPrefix + '-main-selector';

//
// Attributes linking an overlay element to the underlying real
// subject.  As for the main image, the metadata is copied here too.
// gMetadataAttr is used here to simplify the plain copy_rdfxml action.
//
exports.overlayId = gDataAttrPrefix + '-overlay-id';
exports.overlaySubject = gDataAttrPrefix + '-overlay-subject';
exports.overlayElementSelector = gDataAttrPrefix + '-overlay-selector';
