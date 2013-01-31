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
      app.isAndroid = navigator.userAgent.match(/(Android)/);
      app.isIOS = navigator.userAgent.match(/(iPad|iPhone)/);
      app.isUIWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);
    }

  };

  return appSettings;

});