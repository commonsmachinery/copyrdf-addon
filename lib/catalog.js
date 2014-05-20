// catalog.js - catalog REST API (pending proper library)
//
// Copyright 2013-2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var promise = require('sdk/core/promise');
var request = require('sdk/request');
var prefs = require('sdk/simple-prefs');

var buildURI = function buildURI() {
    return prefs.prefs.catalogEndpoint + '/' + Array.prototype.join.call(arguments, '/');
};

var call = function(method, url, content) {
    var deferred = promise.defer();

    console.debug('calling: ' + method + ' ' + url);

    var req = request.Request({
        url: url,
        content: content ? JSON.stringify(content) : '',
        contentType: content ? 'application/json' : 'application/x-www-form-urlencoded',
        headers: {
            'Accept': 'application/json',
        },

        onComplete: function(response) {
            console.debug('response: ' + response.status + ' ' + response.statusText);

            if (response.status >= 200 && response.status < 300) {
                deferred.resolve(response);
            }
            else {
                deferred.reject(response);
            }
        }
    });

    req[method.toLowerCase()]();

    return deferred.promise;
};


exports.login = function login(username) {
    return call('POST', buildURI('test/login'), {
        testuser: username
    })
        .then(function(response) {
            // Chain a new call to find out who we are.  Perhaps
            // should do something about that API...

            return call('GET', buildURI('users/current'));
        });
};


exports.logout = function logout(username) {
    return call('POST', buildURI('test/logout'));
};


exports.getCurrentUser = function getCurrentUser() {
    return call('GET', buildURI('users/current'));
};
