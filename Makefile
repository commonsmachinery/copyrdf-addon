
JSHINT = jshint

addon-js = lib/*.js data/*.js test/*.js

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=.jshint-emacs.js
endif

all: lint 

clean:
	rm -rf $(css-dir)

lint:
	$(JSHINT) $(REPORTER) $(addon-js)

test:
	cfx test

.PHONY: all clean lint test
