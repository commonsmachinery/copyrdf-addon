// site-rules.js - Site-specific rules support
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var request = require('sdk/request');
var notifications = require('sdk/notifications');
var self = require('sdk/self');
var file = require('sdk/io/file');

var localSiteRules = null;
var standardSiteRules = null;

var compileSiteRuleRegexps = function(sites) {
    var i, j, re;

    for (i = 0; i < sites.length; i++) {
        for (j = 0; j < sites[i].urls.length; j++) {
            try {
                re = new RegExp('^https?://' + sites[i].urls[j], 'i');
                sites[i].urls[j] = re;
            }
            catch (err) {
                console.error('Error compiling site ' + sites[i].name +
                              ' regexp "' + sites[i].urls[j] + '": ' + err);
                sites[i].urls[j] = null;
            }
        }
    }
};


var getRulesForSiteHelper = function(sites, url) {
    var i, j, re;

    if (!sites) {
        return null;
    }

    for (i = 0; i < sites.length; i++) {
        for (j = 0; j < sites[i].urls.length; j++) {
            re = sites[i].urls[j];
            if (re !== null && re.test(url)) {
                return sites[i].rules;
            }
        }
    }

    return null;
};


exports.getRulesForSite = function(url) {
    return getRulesForSiteHelper(localSiteRules, url) ||
        getRulesForSiteHelper(standardSiteRules, url);
};



exports.loadLocalSiteRules = function(path, notify) {
    var notifyText = null;
    var text = null;
    var json = null;
    
    if (path) {
        console.log('Loading local site rules from ' + path);

        try {
            text = file.read(path);
            json = JSON.parse(text);
        }
        catch (err) {
            console.error('error loading local site rules: ' + err);
            notifyText = 'Failed to read local site rules: ' + err; 
        }

        if (json) {
            if (json.formatVersion === 1 &&
                json.sites &&
                json.sites.length > 0) {
                localSiteRules = json.sites;
                compileSiteRuleRegexps(localSiteRules);
                if (notify) {
                    notifyText = 'Local site-specific rules loaded';
                }
            }
            else {
                console.error('not a good local site rules object: ' + text);
                notifyText = 'Failed to load the local site-specific rules';
            }
        }

        if (notifyText) {
            notifications.notify({
                title: self.name,
                text: notifyText
            });
        }
    }
    else {
        localSiteRules = null;
    }
};


exports.loadStandardSiteRules = function(url, notify) {
    if (url) {
        console.log('Loading common site rules from ' + url);

        request.Request({
            url: url,
            
            onComplete: function(response) {
                var notifyText = null;
                var json = response.json;
                
                if (json) {
                    if (json.formatVersion === 1 &&
                        json.sites &&
                        json.sites.length > 0) {
                        standardSiteRules = json.sites;
                        compileSiteRuleRegexps(standardSiteRules);
                        if (notify) {
                            notifyText = 'Standard site-specific rules updated';
                        }
                    }
                    else {
                        console.error('not a good site rules object: ' + response.text);
                        notifyText = 'Failed to update the standard site-specific rules';
                    }
                }
                else {
                    console.error('bad site rules response: ' +
                               response.status + ' ' + response.statusText +
                                ': ' + response.text);
                    notifyText = 'Failed to update the standard site-specific rules';
                }

                if (notifyText) {
                    notifications.notify({
                        title: self.name,
                        text: notifyText
                    });
                }
            }
        }).get();
    }
    else {
        standardSiteRules = null;
    }
};


// This function is primarily here to support the unit test
exports.setLocalSiteRules = function(sites) {
    localSiteRules = sites;
    compileSiteRuleRegexps(localSiteRules);
};

