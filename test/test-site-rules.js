// test-site-rules.js - Test the site-specific rules support
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var siteRules = require("./site-rules");

var testRules = [
    {
        "name": "Test 1",
        "urls": [
            "(www\\.)?test1\\.com/photos/",
        ],
        
        "rules": "rules 1"
    },
    
    {
        "name": "Test 2",
        "urls": [
            "www\\.test2\\.com/$",
            "test2\\.org/"
        ],
        
        "rules": "rules 2"
    }
];

exports["test url regexps"] = function(assert) {
    siteRules.setLocalSiteRules(testRules);

    assert.strictEqual(
        siteRules.getRulesForSite('http://test1.com/photos/foo/bar'),
        'rules 1',
        'matching flickr-ish url without www');

    assert.strictEqual(
        siteRules.getRulesForSite('https://www.TEST1.com/PHOTOS/'),
        'rules 1',
        'matching upper-case parts with www');

    assert.strictEqual(
        siteRules.getRulesForSite('http://www.test1.com/'),
        null,
        'not matching url without path');

    assert.strictEqual(
        siteRules.getRulesForSite('http://www.test2.com/'),
        'rules 2',
        'matching second rules with exact end');

    assert.strictEqual(
        siteRules.getRulesForSite('http://www.test2.com/foobar'),
        null,
        'not matching when there is a path');

    assert.strictEqual(
        siteRules.getRulesForSite('http://test2.org/foobar'),
        'rules 2',
        'matching second regexp of rules 2');

    assert.strictEqual(
        siteRules.getRulesForSite('http://www.test2.org/foobar'),
        null,
        'not matching when www is present');
};

require("sdk/test").run(exports);
