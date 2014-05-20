// session.js - manage login session against catalog
//
// Copyright 2013-2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var { emit, on, once, off } = require("sdk/event/core");
var pageMod = require('sdk/page-mod');
var prefs = require('sdk/simple-prefs');

var catalog = require('./catalog');

// Current session
var email = null;
var userURI = null;

// Helper functions

var checkSession = function checkSession() {
    // TODO: what's appropriate error handling here?  Sending some
    // general catalog error that disables the addon?

    catalog.getCurrentUser().then(
        // Success
        function(response) {
            var json = response.json;

            if (json && json.resource && json.email) {
                console.log('already logged in: ' + json.resource);
                email = json.email;
                userURI = json.resource;

                emit(exports, 'login', {
                    email: email,
                    userURI: userURI,
                });
            }
        },

        // Error
        function(response) {
            if (response.status === 401) {
                // Unauthorized, i.e. not logged in
                emit(exports, 'logout');
            }
        }
    );
};



// Set up event interface for module
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.removeListener = function removeListener(type, listener) {
  off(exports, type, listener);
};


// TODO: for now just the simple development accounts
exports.login = function login(username) {
    console.log('login: ' +  username);

    catalog.login(username).then(
        // Success
        function(response) {
            var json = response.json;

            if (json && json.resource && json.email) {
                console.log('logged in: ' + json.resource + ' ' + json.email);
                email = json.email;
                userURI = json.resource;

                emit(exports, 'login', {
                    username: username,
                    email: email,
                    userURI: userURI,
                });
            }
            else {
                emit(exports, 'login:error', {
                    username: username,
                    message: 'Invalid server response'
                });
            }
        },

        // Error
        function(response) {
            console.log('login failed: ' + response.text);

            emit(exports, 'login:error', {
                username: username,
                message: response.text
            });
        }
    );
};


exports.logout = function logout() {
    console.debug('logout: ' + email);

    catalog.logout().then(
        // Success
        function(response) {
            emit(exports, 'logout');
        },

        // Error
        function(response) {
            console.log('logout failed: ' + response.text);

            emit(exports, 'logout:error', {
                message: response.text
            });
        }
    );
};

exports.init = function init() {
    // Check if we have a session already, triggering messages that
    // the GUI can react to
    checkSession();

    // Install a PageMod for the catalog web pages, so we can react to
    // the user logging in/out on them directly instead of via the
    // addon.  We don't trust it directly, but use it to trigger a
    // session check against the catalog.
    var lastPageEmail;

    pageMod.PageMod({
        include: prefs.prefs.catalogEndpoint + '*',
        attachTo: ['top'],

        // Just tell us about any login email
        contentScript: "self.port.emit('current-session', document.body.dataset.loginEmail);",
        contentScriptWhen: 'ready',

        onAttach: function(worker) {
            worker.port.once('current-session', function(email) {
                if (typeof email === 'string') {
                    if (email !== lastPageEmail) {
                        console.log('catalog session seems to have changed: ' +
                                    lastPageEmail + ' -> ' + email);
                        lastPageEmail = email;
                        checkSession();
                    }
                }
            });
        },
    });
};
