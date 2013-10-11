Copy RDFa metadata (Firefox add-on)
===================================

This add-on for Firefox allows RDFa-embedded metadata about images to
be copied to the clipboard, and pasted into other applications.  It
also includes a function for pasting images with metadata into
supporting webpages.


Copy metadata and images
------------------------

When an image has metadata, it's context menu now have three new
items:

* Copy metadata
* Copy linked metadata
* Copy image with metadata

The first two extract the metadata and puts is RDF/XML on the
clipboard, and can then be pasted into a text editor.  The difference
is that the first item just grabs the properties that are about the
image itself, while the second item also include any metadata that is
present for linked resources.

You can try it out here:
http://labs.creativecommons.org/2011/ccrel-guide/examples/image.html


The third item puts both the image and the RDF/XML on the clipboard
(identified by their MIME types).  A tool that knows to look for
application/rdf+xml can then grab the metadata together with the image
pixels.  This is experimental work to test out ways of handling
metadata, and may never become a standard.  This blog entry explains
it in more detail:
http://commonsmachinery.se/2013/09/copy-rdfa-metadata/


### Limitations

This add-on currently only supports <img> tags.  It could be extended
to support <video> and <audio> too by improving the context script.

The add-on may not find metadata that is added dynamically after the
page has been loaded.


Paste images with metadata
--------------------------

The add-on includes experimental support for pasting images with
metadata into browser-based editors.  The context menu includes "Paste
image" when clicked inside an editor area that supports this, and
there is also an image on the clipboard (but see note below).

To support pasting images with this function, the editor must add the
HTML class `x-enable-paste-image` to the element that wraps the editor
(typically a `div`).  When the image is pasted, an `x-onpaste-image`
custom event is generated with these detail parameters:

* `image`: image data in format `"data:MIMETYPE;base64,DATA..."`.
   Create an `img` tag and set `src` to this string to show it in the
   page.
* `rdfxml`: serialised RDF/XML associated with the image, or null if
   there was no metadata.
* `target`: the target element for the paste action

There's a simple page implementing this in the `example` directory,
using https://github.com/linkeddata/rdflib.js to process the incoming
RDF/XML.


### Building the add-on yourself

If you build the add-on with the current stock SDK, the "Paste image"
menu item will always be available in editor areas even when there is
no image on the clipboard.  The SDK is being patched to add support to
the add-on to only show this item when there is an image on the
clipboard.

In the meantime, you can try this by cloning this SDK tree:
https://github.com/commonsmachinery/addon-sdk/tree/922558

Then run cfx with `--force-use-bundled-sdk`.


Installing
==========

The add-on can be installed from the Mozilla registry:
https://addons.mozilla.org/en-US/firefox/addon/copy-rdfa-metadata/

It is also uploaded to the repository here:
https://github.com/commonsmachinery/copyrdf-addon/raw/master/copyrdf.xpi


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
