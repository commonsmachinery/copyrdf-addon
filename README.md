Copy RDFa metadata (Firefox add-on)
===================================

This add-on for Firefox allows RDFa-embedded metadata about images to
be copied to the clipboard, and pasted into other applications.

When an image has metadata, it's context menu now have three new
options:

* Copy metadata
* Copy linked metadata
* Copy image with metadata

The first two extract the metadata and puts is RDF/XML on the
clipboard, and can then be pasted into a text editor.  The difference
is that the first one just grabs the properties that are about the
image itself, while the other one also include any metadata that is
present for linked resources.

You can try it out here:
http://labs.creativecommons.org/2011/ccrel-guide/examples/image.html


The third puts both the image and the RDF/XML on the clipboard
(identified by their MIME types).  A tool that knows to look for
application/rdf+xml can then grab the metadata together with the image
pixels.  This is experimental work to test out ways of handling
metadata, and may never become a standard.  This blog entry has more
information on this idea, using Inkscape as a test bed:
http://commonsmachinery.se/2013/07/metadata-copy-paste-demonstration/


Limitations
-----------

This add-on currently only supports <img> tags.  It could be extended
to support <video> and <audio> too by improving the context script.

The add-on may not find metadata that is added dynamically after the
page has been loaded.



Installing
==========

Since this add-on is still mostly experimental, it isn't yet added to
the Firefox add-on registry.  You can try it out here in the meantime:

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

