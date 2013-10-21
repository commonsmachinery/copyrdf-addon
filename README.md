Copy RDFa metadata (Firefox add-on)
===================================

This add-on for Firefox allows RDFa-embedded metadata about images to
be copied to the clipboard, and pasted into other applications.  It
also includes a function for pasting images with metadata into
supporting webpages.

http://commonsmachinery.se/labs/ contain more information about
plugins and applications that support pasting an image with metadata
that has been copied by this add-on.


Site support
------------

RDFa metadata is not very widespread, and when it it present it can
often be difficult to know what resource on the page it describes.
The technical details section below describes this further.

The addon has been tested against these sites:

* [Flickr](http://www.flickr.com/) (site-specific support in add-on)
* [Europeana](http://www.europeana.eu/portal/) (standard RDFa)
* [CC REL by example](http://labs.creativecommons.org/2011/ccrel-guide/) (standard RDFa)
* [Commons Machinery labs: Mediagoblin](http://labs.commonsmachinery.se/mg/) (standard RDFa)


Copy metadata and images
------------------------

When an image has metadata, it's context menu now has two new
items:

* Copy image metadata
* Copy image with metadata

The first item extract the metadata and puts is RDF/XML on the
clipboard.  It can then be pasted into e.g. a text editor.

The second item puts both the image and the RDF/XML on the clipboard.
An application that supports this format of data can paste both the
image and the metadata into another document, and use the metadata to
e.g. create an automatic credit line.

An application that doesn't use the metadata will still be able to
paste the image itself.

The page context menu can also have two additional menu items:

* Copy page metadata
* Copy main image with metadata.


### Limitations

On MacOSX, this addon only supports copying metadata within the same
Firefox instance, e.g. to another tab.  The MacOSX clipboard makes it
a bit more complicated to put custom data on the clipboard than what
Linux/X and Windows does, and thus the clipboard code in Firefox for
MacOSX does not support copying the metadata to the global clipboard.

This add-on currently only supports <img> tags.  It could be extended
to support <video> and <audio> too by improving the context script.

The add-on may not find metadata that is added dynamically after the
page has been loaded.


Paste images with metadata
--------------------------

The add-on includes experimental support for pasting images with
metadata into browser-based editors.  The context menu includes "Paste
image" when clicked inside an editor area that supports this.  (With
the current SDK, this option is enabled even when there isn't any
image on the clipboard.  See note below.)

There's a simple page implementing this in the `example` directory,
and at http://commonsmachinery.se/labs/ you can find an Aloha Editor
instance supporting this.

### Limitations

On MacOSX, this only works for metadata copied within the same browser
instance.


Installing
==========

The add-on can be installed from the Mozilla registry:
https://addons.mozilla.org/en-US/firefox/addon/copy-rdfa-metadata/

It is also uploaded to the repository here:
https://github.com/commonsmachinery/copyrdf-addon/raw/master/copyrdf.xpi


### Building the add-on yourself

If you build the add-on with the current stock SDK, the "Paste image"
menu item will always be available in editor areas even when there is
no image on the clipboard.  The SDK is being patched to add support to
the add-on to only show this item when there is an image on the
clipboard.

In the meantime, you can try this by cloning this SDK tree:
https://github.com/commonsmachinery/addon-sdk/tree/922558

Then run cfx with `--force-use-bundled-sdk`.


Technical details
=================

This is experimental code, looking at ways to use metadata and the
clipboard.  This section documents more precisely how the add-on
locates metadata, how it is copied, and how a browser-based editor can
support pasting metadata.


Locating metadata
=================

RDF metadata consists of triples, consisting of a subject, a
predicate, and an object.  Finding the metadata for a given image
means that we have to find all the triples whose subject is the image.

Subjects are identified by a URI, which results in various ways to
denote the image.  The add-on uses the following methods in this
order:

The best way is to mark the image with an ID attribute, and address
the image with the URI of the page and the ID.  If it is the main
image of a page, a good name can be ```#this```.  That will result in
the URI for the subject will be
```http://example.org/images/34327/#this```, which is likely a unique
and long-term viable URL, which can be used to locate the source of
the image and find the original RDFa metadata on the page.

Secondarily, the image source URI can be the subject,
e.g. ```http://example.org/resources/34327.jpg```.  This has the
drawback that anyone looking up the image based on this URI will only
find the image file itself, without the context of a web page where it
might be published.  This also means that it might not be the image as
a work that is found, but just a specific thumbnail or medium
resolution file.

A third way is to look for an ```og:image``` predicate, whose object
is the image source.  Then the subject of that predicate is likely
about the image, since this predicate indicates that this is the
"main" image of the page and should be used to represent it when shown
inline in e.g. Facebook or Twitter streams.  This is less precise than
the two previous methods, but works on sites that are primarily about
images.

```og:image``` is also used to find the main image on the page for the
"Copy main image with metadata" command.


However, some sites have reasonably good RDFa, but with no good link
to the image.  Flickr is a good example.  It associates the RDFa with
the page URI itself.  And while it has an ```og:image``` predicate,
that links to a smaller-size image that isn't present on the standard
or the lightbox page.  To make the addon work on Flickr, it contains
custom code that understands the peculiarities of the DOM tree and the
RDFa markup on that site.  This will of course be more brittle than
the methods above.


Copying metadata
================

When the addon has found some metadata, the RDF triples are serialised
as RDF/XML and put on the clipboard identified by the MIME type
```application/rdf+xml```.  The triples include not only the ones
directly about the image, but also any triples about subjects that are
referred to by the image (e.g. source works).

When the metadata is copied together with an image, a special triple
is added to the RDF to help the destination application locate the
image subject:

    <> <dc:source> <imageSubjectURI>

The empty subject (```<>```) is a convention taken from the RDF subset
XMP to indicate "the surrounding or associated file".  In this
context, the image on the clipboard together with the metadata is
considered the associated file.  This triple thus says what the source
is for the image data on the clipboard, and the application can then
find out more information by looking at the triples that has the
subject ```<imageSubjectURI>```.

When only metadata is copied without the image, this triple is not
added as there is no image data to associate it with.  Since this will
probably mainly be used for investigating/debugging purposes, the
metadata is also put on the clipboard as plain strings to make it easy
to paste it into a standard text editor.


Paste metadata
==============

To support pasting images into a browser editor with this addon, the
editor must add the HTML class `x-enable-paste-image` to the element
that wraps the editor (typically a `div`).  When the image is pasted,
an `x-onpaste-image` custom event is generated with these detail
parameters:

* `image`: image data in format `"data:MIMETYPE;base64,DATA..."`.
   Create an `img` tag and set `src` to this string to show it in the
   page.
* `rdfxml`: serialised RDF/XML associated with the image, or null if
   there was no metadata.
* `target`: the target element for the paste action

There is a simple page implementing this in the `example` directory,
using https://github.com/linkeddata/rdflib.js to process the incoming
RDF/XML.



License
=======

Copyright 2013 Commons Machinery http://commonsmachinery.se/

Author(s): Peter Liljenberg <peter@commonsmachinery.se>

Distributed under an GPLv2 license, please see the LICENSE file for
details.


Green Turtle
------------

The add-on includes the Green Turtle RDFa.js module from
http://code.google.com/p/green-turtle/

Copyright (c) 2011-2013, R. Alexander Milowski <alex@milowski.com>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


rdflib.js
---------

Copyright 2000-2012 MIT and other contributors
http://dig.csail.mit.edu/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
