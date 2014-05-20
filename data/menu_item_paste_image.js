/* global uuid */

self.on("click", function (node, data) {
    'use strict';

    // It's not possible to pass the DOM element node through
    // postMessage since it's destroyed by the JSON serialisation.
    // Hack around that by tagging it with a magic ID and passing that 
    // to the main code, which can then find it in the document.
	
    var id = uuid.v1();
    node.setAttribute(data, id);

    self.postMessage({ 'id': id });
});
