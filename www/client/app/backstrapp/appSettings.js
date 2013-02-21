define([
  'underscore',
  './effects/vendorPrefix',
  'bowser'
],

function(_, vendorPrefix, bowser) {

  function getVersion(regex, src) {
    function parse(opt_a, opt_b, opt_c, opt_d) {

      // We want to allow implicit conversion of any type to number while avoiding
      // compiler warnings about the type.
      return /** @type {number} */ (opt_a) << 21 |
          /** @type {number} */ (opt_b) << 14 |
          /** @type {number} */ (opt_c) << 7 |
          /** @type {number} */ (opt_d);
    }

    var groups = regex.exec(src) || [];
    groups.shift();

    return parse(groups);
  }

  function viewport() {
    var e = window, a = 'inner';
    if (!('innerWidth' in window )) {
      a = 'client';
      e = document.documentElement || document.body;
    }
    return { width: e[ a+'Width' ], height: e[ a+'Height' ] };
  }



  var appSettings = {

    init: function(ns) {
      var app = ns.app
        , userAgent = navigator.userAgent;

      app.device = {
        isBlackberry: /BlackBerry/.test(userAgent),
        isPlayBook: /PlayBook/.test(userAgent),     
        isAndroid : /Android/.test(userAgent),
        androidVersion: getVersion(/Android (\d)\.(\d)(?:\.(\d))?/, userAgent),

        isIOS: /iPad|iPhone/.test(userAgent),
        iOSVersion:getVersion(/OS (\d)_(\d)(?:_(\d))?/, userAgent),
        isIPhone: /iPhone/.test(userAgent),
        isIPad: /iPad/.test(userAgent),
        isUIWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent),
        pixelRatio: window.devicePixelRatio || 1,
        standalone: navigator.standalone || false,


        isMobile: /iPhone|iPod|iPad|Android|BlackBerry|PlayBook/.test(userAgent),
        isTouch: 'ontouchstart' in window || 'onmsgesturechange' in window,

        screen: { width: screen.width, height: screen.height },
        viewport: viewport(),

        browser: bowser
      };

      // try to guess if tablet
      app.device.isTablet = app.device.isIPad 
        || (app.device.screen.width / app.device.pixelRatio >= 1024 
            && app.device.isMobile);

      // set common values
      if (window.device) {
        app.device.platform = window.device.platform;
        app.device.version = window.device.version;
        app.device.name = window.device.name;
        app.device.uuid = window.device.uuid;
      } else if (app.device.isIOS) {
        app.device.version = app.device.iOSVersion;
        app.device.platform = 'iOS';
      } else if (app.device.isAndroid) {
        app.device.version = app.device.androidVersion;
        app.device.platform = 'Android';
      } else if (app.device.isBlackberry) {
        app.device.platform = 'BlackBerry';
      } else {
        app.device.platform = navigator.platform;
      }

      app.isPhoneGap = (cordova || PhoneGap || phonegap) 
        && /^file:\/{3}[^\/]/i.test(window.location.href)
        && app.device.isMobile;

      app.vendorPrefix = vendorPrefix;
      app.vendorPrefixCSS = vendorPrefix ? '-' + vendorPrefix + '-' : '';
    }

  };

  return appSettings;

});