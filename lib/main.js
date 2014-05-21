// main.js - entry point to addon
//
// Copyright 2013-2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

//
// During development, it's possible to override the site rules
// settings without having to use the preferences.  Run cfx like this:
//
//   cfx run --static-args='{ "catalogEndpoint": "http://localhost:8004", "standardSiteRulesURL": "", "localSiteRulesFile": "'"$PWD"'/site-rules.json", "debug": true, "showCopyMetadata": true }'
//
// The path to the local rules file must be absolute.  An empty string
// disables the standard rules.
//

'use strict';

var contextMenu = require('sdk/context-menu');
var tabs = require('sdk/tabs');
var winUtils = require('sdk/window/utils');
var self = require("sdk/self");
var data = self.data;
var prefs = require('sdk/simple-prefs');
var fullPrefs = require('sdk/preferences/service');
var pageMod = require('sdk/page-mod');
var notifications = require('sdk/notifications');
var ui = require("sdk/ui");
var { Panel } = require("sdk/panel");

var copymeta = require('./copymeta');
var siteRules = require('./site-rules');
var attr = require('./attr.js');
var session = require('./session');
var catalog = require('./catalog');


//
// Page mod for oEmbed fetching and keeping track of site rules
//

pageMod.PageMod({
    include: "*",
    attachTo: ['existing', 'top'],

    contentScriptFile: [
        data.url('libs/uuid.js'),
        data.url('libs/RDFa.1.2.0.js'),
        data.url('rdfjson.js'),
        data.url('data_attr.js'),
        data.url('main_page_mod.js'),
    ],

    onAttach: function(worker) {
        worker.port.emit(
            'preparePage', siteRules.getRulesForSite(worker.url));
    }
});


//
// Main GUI panel
//

var mainPanel;

var createGUI = function createGUI() {
    var logo = {
        loggedIn: './loggedin.png',
        loggedOut: './loggedout.png'
    };

    mainPanel = Panel({
        position: { top: 5, right: 5 },

        contentURL: data.url('main_panel.html'),
        contentScriptFile: [
            data.url('libs/jquery-2.0.3.min.js'),
            data.url('main_panel.js'),
        ],

        contentScriptOptions: {
            catalog: 'Elog.io',
            endpoint: prefs.prefs.catalogEndpoint,
        },
    });

    var toolbarButton = ui.ToggleButton({
        id: 'toolbar',
        label: 'Elog.io',
        icon: logo.loggedOut,
    });


    // Give users a hint in the context menu that they must login to
    // see the Add items
    contextMenu.Item({
        label: 'Login to Elog.io',

        context: [
            contextMenu.PredicateContext(function(data) {
                return !session.hasSession();
            }),
        ],

        contentScript: "self.on('click', function() { self.postMessage('open-panel'); });",

        onMessage: function() {
            mainPanel.show();
        },
    });


    // Wire up showing the panel
    toolbarButton.on('change', function(state) {
        if (state.checked) {
            // TODO: In Firefox 30, attach position to button
            mainPanel.show();
        }
    });

    mainPanel.on('show', function() {
        toolbarButton.state('window', {checked: true});
    });

    mainPanel.on('hide', function() {
        toolbarButton.state('window', {checked: false});
    });


    // Wire up the login/logout logic
    mainPanel.port.on('request:login', function(data) {
        session.login(data.username);
    });

    session.on('login', function(data) {
        toolbarButton.state(toolbarButton, {icon: logo.loggedIn});
        mainPanel.port.emit('login:success', data);
    });

    session.on('login:error', function(data) {
        mainPanel.port.emit('login:error', data);
    });


    mainPanel.port.on('request:logout', function() {
        session.logout();
    });

    session.on('logout', function(data) {
        toolbarButton.state(toolbarButton, {icon: logo.loggedOut});
        mainPanel.port.emit('logout:success', data);
    });

    session.on('logout:error', function(data) {
        mainPanel.port.emit('logout:error', data);
    });
};


//
// Context menu setup
//


var copyMetadata = null;
var copyPageMetadata = null;

// Having menu items dynamically enabled/disabled with a prefs setting
// will be much easier when we get Firefox 29 and PredicateContext.
var addCopyMetadata = function() {
    if (!copyMetadata) {
        copyMetadata = contextMenu.Item({
            label: 'Copy image metadata',
            data: 'image',

            context: [
                contextMenu.SelectorContext('img[' + attr.metadata + '], [' + attr.overlayId + ']')
            ],

            contentScriptFile: [
                data.url('data_attr.js'),
                data.url('menu_item_copy_rdfxml.js')],

            onMessage: function(msg) {
                var window = winUtils.getFocusedWindow();

                if (window === null) {
                    console.log("can't find focused window");
                    return false;
                }

                copymeta.copyRDFXML(window, msg.rdf);
            }
        });
    }

    if (!copyPageMetadata) {
        copyPageMetadata = contextMenu.Item({
            label: 'Copy page metadata',
            data: 'page',

            context: [
                contextMenu.PageContext(),
                contextMenu.SelectorContext('body[' + attr.metadata + ']')
            ],

            contentScriptFile: [
                data.url('data_attr.js'),
                data.url('menu_item_copy_rdfxml.js')],

            onMessage: function(msg) {
                var window = winUtils.getFocusedWindow();

                if (window === null) {
                    console.log("can't find focused window");
                    return false;
                }

                copymeta.copyRDFXML(window, msg.rdf);
            }
        });
    }
};

var removeCopyMetadata = function() {
    if (copyMetadata) {
        copyMetadata.destroy();
        copyMetadata = null;
    }

    if (copyPageMetadata) {
        copyPageMetadata.destroy();
        copyPageMetadata = null;
    }
};


var onAddImage = function(msg) {
    if (msg.error) {
        notifications.notify({
            title: self.name,
            text: msg.error
        });
        return false;
    }

    // Simple RDF/JSON just telling consumers what the image src URI is
    var sourceMetadata = {
        'about:resource': {
            'http://catalog.commonsmachinery.se/ns#imageSrc': [
                {
                    type: 'uri',
                    value: msg.imageSrc,
                }
            ]
        }
    };

    var imageMetadata = JSON.parse(msg.rdf);

    // Add it as a stock image
    catalog.addSource(session.currentUserURI(), {
        resource: msg.subject,
        metadataGraph: sourceMetadata,
        cachedExternalMetadataGraph: imageMetadata,
    }).then(
        // Success
        function(response) {
            console.debug(response.json);

            notifications.notify({
                title: self.name,
                text: 'Image added to catalog.',
            });

            // Push into GUI
            mainPanel.port.emit('source:added', response.json);
        },

        // Error
        function(response) {
            notifications.notify({
                title: self.name,
                text: 'Error adding image to catalog:\n' + response.statusText,
            });
            console.error(response.text);
        }
    );
};

contextMenu.Item({
    label: 'Add image to Elog.io',
    data: 'contextImage',

    context: [
        contextMenu.PredicateContext(function(data) {
            return session.hasSession();
        }),
        contextMenu.SelectorContext('img[' + attr.metadata + '], [' + attr.overlayId + ']'),
    ],

    contentScriptFile: [
        data.url('data_attr.js'),
        data.url('menu_item_catalog_add_image.js')],

    onMessage: onAddImage,
});


contextMenu.Item({
    label: 'Add page image to Elog.io',
    data: 'mainImage',

    context: [
        contextMenu.PredicateContext(function(data) {
            return session.hasSession();
        }),
        contextMenu.PageContext(),
    ],

    contentScript: "self.on('context', function() { return document.body.hasAttribute(gMainImageIdAttr); });",

    contentScriptFile: [
        data.url('data_attr.js'),
        data.url('menu_item_catalog_add_image.js')],

    onMessage: onAddImage,
});


var pasteImageContext = [
    contextMenu.SelectorContext('.x-enable-paste-image')];

// Contexts for identifying when there's an image on the clipboard
// This is normally not exported from the SDK, so I've patched my copy
// of it.  If built without that patch, just always show the Paste
// image menu item.  cfx needs --force-use-bundled-sdk to use the patch.

if (typeof contextMenu.PredicateContext === "undefined")
{
    console.log("SDK doesn't have PredicateContext, so Paste Image is always active");
}
else
{
    pasteImageContext.push(contextMenu.PredicateContext(
        function (data) {
            return copymeta.hasClipboardImage();
        }));
}

contextMenu.Item({
    label: 'Paste image',
    data: 'id-2c6ec901-d90a-4571-a02c-37fda119f4ee', // the attribute for the magic ID

    context: pasteImageContext,

    contentScriptFile: [
        data.url('libs/uuid.js'),
        data.url('data_attr.js'),
        data.url('menu_item_paste_image.js')],

    onMessage: function(msg) {
        var window = winUtils.getFocusedWindow();
        var tab = tabs.activeTab;
        
        if (window === null) {
            console.log("can't find focused window");
            return false;
        }

        var pasteData = copymeta.getClipboardImage(window);

        if (pasteData) {
            // Now we've got the data, we have to pass it back to a
            // content script so it can send the custom event to the page

            // Add in our support stuff
            pasteData.idAttr = this.data;
            pasteData.id = msg.id;

            var worker = tab.attach({
                contentScriptFile: data.url('page_mod_paste_image.js')
            });

            worker.port.emit('paste-image', pasteData);

            // Clean up the content script
            worker.destroy();
        }
    }
});


//
// Main function
//

exports.main = function(options, callbacks) {
    // Use staticArgs to simplify testing, overriding the config for
    // the site rules and file
    if (typeof options.staticArgs.catalogEndpoint === 'string') {
        prefs.prefs.catalogEndpoint = options.staticArgs.catalogEndpoint;
    }

    if (typeof options.staticArgs.standardSiteRulesURL === 'string') {
        prefs.prefs.standardSiteRulesURL = options.staticArgs.standardSiteRulesURL;
    }

    if (typeof options.staticArgs.localSiteRulesFile === 'string') {
        prefs.prefs.localSiteRulesFile = options.staticArgs.localSiteRulesFile;
    }

    if (typeof options.staticArgs.showCopyMetadata === 'boolean') {
        prefs.prefs.showCopyMetadata = options.staticArgs.showCopyMetadata;
        if (prefs.prefs.showCopyMetadata) {
            addCopyMetadata();
        }
    }

    if (options.staticArgs.debug) {
        fullPrefs.set('extensions.' + self.id + '.sdk.console.logLevel', 'all');
    }

    // Wire up the file button
    prefs.on('localSiteRulesFile', function() {
        siteRules.loadLocalSiteRules(prefs.prefs.localSiteRulesFile, true);
    });

    prefs.on('clearLocalRulesFile', function() {
        prefs.prefs.localSiteRulesFile = '';
        siteRules.loadLocalSiteRules('', false);
    });

    // Allow user to refetch rules
    prefs.on('fetchSiteRules', function() {
        siteRules.loadLocalSiteRules(prefs.prefs.localSiteRulesFile, true);
        siteRules.loadStandardSiteRules(prefs.prefs.standardSiteRulesURL, true);
    });

    // Allow user to control the copy metadata menu items
    prefs.on('showCopyMetadata', function() {
        if (prefs.prefs.showCopyMetadata) {
            addCopyMetadata();
        }
        else {
            removeCopyMetadata();
        }
    });

    // Kick off getting rules at startup (no notification on that)
    siteRules.loadLocalSiteRules(prefs.prefs.localSiteRulesFile, false);
    siteRules.loadStandardSiteRules(prefs.prefs.standardSiteRulesURL, false);

    // Set up panels etc
    createGUI();

    // Initialise session state, triggering messages to GUI about login state
    session.init();
};
