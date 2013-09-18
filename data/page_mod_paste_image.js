
self.port.on('paste-image', function(data) {
    var selector = '[' + data.idAttr + '="' + data.id + '"]';
    var target = document.querySelector(selector);
	
    if (target == null) {
	console.log("can't find target element");
	return;
    }
	
    // Clean up the magic ID tag
    target.removeAttribute(data.idAttr);

    // Fire off the event to the page
    var event = document.createEvent('CustomEvent');

    event.initCustomEvent('x-onpaste-image', true, true, {
	image: data.image,
	rdfxml: data.rdfxml,
	target: target,
	time: new Date(),
    });

    target.dispatchEvent(event);
});