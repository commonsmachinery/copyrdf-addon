// Main GUI panel for login etc
//
// Copyright 2013-2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global $ */

(function() {
    'use strict';

    var email = null;
    var userURI = null;
    var error = null;

    // These don't change, at least not now
    $('#catalog-name').text(self.options.catalog);
    $('#endpoint-url')
        .attr('href', self.options.endpoint)
        .text(self.options.endpoint);

    var updatePanel = function() {
        if (email) {
            $('#current-email').text(email);
            $('#logout').val('Logout').prop('disabled', false);
            $('.logged-in').show();
            $('.logged-out').hide();
        }
        else {
            $('formset.login-form').prop('disabled', false);

            $('#login')
                .val('Login')
                .prop('disabled', !($('#login-username').val()));

            $('.logged-in').hide();
            $('.logged-out').show();
        }

        if (error) {
            $('#error-message').text(error);
            $('#error').show();
        }
        else {
            $('#error').hide();
        }
    };

    updatePanel();

    // Tie login button to the username field (but skip password since
    // that is anyway just a dummy for now
    $('#login-username').on('input', function(ev) {
        $('#login').prop('disabled', !ev.target.value);
    });

    $('#login').on('click', function() {
        $('formset.login-form').prop('disabled', true);
        $('#login').val('Logging in...');
        $('#error').hide();

        self.port.emit('request:login', {
            username: $('#login-username').val(),
            password: $('#login-password').val(),
        });
    });

    self.port.on('login:success', function(data) {
        email = data.email;
        userURI = data.userURI;
        error = null;
        updatePanel();
    });

    self.port.on('login:error', function(data) {
        email = null;
        userURI = null;
        error = data.message;
        updatePanel();
    });


    $('#logout').on('click', function() {
        $('#logout').val('Logging out...').prop('disabled', true);
        $('#error').hide();

        self.port.emit('request:logout');
    });

    self.port.on('logout:success', function(data) {
        email = null;
        userURI = null;
        error = null;
        updatePanel();
    });

    self.port.on('logout:error', function(data) {
        error = data.message;
        updatePanel();
    });

})();
