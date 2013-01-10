define([
  'underscore',
  './effects/vendorPrefix'
],

function(_, vendorPrefix) {

  var appSettings = {

    init: function(ns) {
      var app = ns.app;

      app.vendorPrefix = vendorPrefix;
      app.vendorPrefixCSS = vendorPrefix ? '-' + vendorPrefix + '-' : '';
      app.isMobile = navigator.userAgent.match(/(iPad|iPhone|Android)/);
      app.isUIWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
    }

  };

  return appSettings;

});