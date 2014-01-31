// Build the data attributes where we keep metadata on the addon ID
var gAddonID = 'jid1-je0gUIhMYarI1w';
var gDataAttrPrefix = 'data-' + gAddonID;

//
// Attributes stored on the element that's a subject in the graph.
//
var gElementIdAttr = gDataAttrPrefix + '-id';
var gSubjectAttr = gDataAttrPrefix + '-subject';
var gMetadataAttr = gDataAttrPrefix + '-metadata';

//
// Attributes stored on <body>, identifying the main image.  The
// metadata is also copied here, in case the <img> tag gets replaced.
//
var gMetadataRelAttr = gDataAttrPrefix + '-metadata-rel';
var gMainImageIdAttr = gDataAttrPrefix + '-main-id';
var gMainImageSubjectAttr = gDataAttrPrefix + '-main-subject';
var gMainImageMetadataAttr = gDataAttrPrefix + '-main-metadata';
var gMainImageSelectorAttr = gDataAttrPrefix + '-main-selector';

//
// Attributes linking an overlay element to the underlying real
// subject.  As for the main image, the metadata is copied here too.
// gMetadataAttr is used here to simplify the plain copy_rdfxml action.
//
var gOverlayIdAttr = gDataAttrPrefix + '-overlay-id';
var gOverlaySubjectAttr = gDataAttrPrefix + '-overlay-subject';
var gOverlayElementSelectorAttr = gDataAttrPrefix + '-overlay-selector';
